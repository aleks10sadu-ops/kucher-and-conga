import copy
import json
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from shapely.geometry import Polygon, shape
from shapely.ops import unary_union

import app as editor
from geometry import ordered_zones, resolve_coverage, source_polygon


def rectangle(zone_id, west, south, east, north, priority=None):
    zone = {
        "id": zone_id, "name": f"Zone {zone_id}", "price": zone_id * 100,
        "minOrder": 2000, "color": "#3b82f6", "opacity": 0.2,
        "coordinates": [[[south, west], [north, west], [north, east], [south, east], [south, west]]],
    }
    if priority is not None:
        zone["priority"] = priority
    return zone


def geometry_for(result, zone_id):
    return unary_union([
        shape(feature["geometry"]) for feature in result["geojson"]["features"]
        if feature["properties"]["sourceZoneId"] == zone_id
    ])


class CoverageTest(unittest.TestCase):
    def assert_preserved_coverage(self, zones, result):
        features = result["geojson"]["features"]
        geometries = [shape(feature["geometry"]) for feature in features]
        for index, geometry in enumerate(geometries):
            self.assertTrue(geometry.is_valid)
            self.assertEqual(features[index]["geometry"]["type"], "Polygon")
            for other in geometries[index + 1:]:
                self.assertLess(geometry.intersection(other).area, 1e-12)
        expected = unary_union([source_polygon(zone) for zone in zones])
        self.assertLess(unary_union(geometries).symmetric_difference(expected).area, 1e-12)

    def test_nested_zone_cuts_exact_hole_without_changing_outer_boundary(self):
        outer = rectangle(1, 0, 0, 10, 10)
        inner = rectangle(2, 3, 3, 6, 6, priority=1)
        original = copy.deepcopy([outer, inner])
        result = resolve_coverage([outer, inner], focus_id=2)
        actual = geometry_for(result, 1)
        self.assertEqual(len(actual.interiors), 1)
        self.assertTrue(Polygon(actual.exterior).equals(source_polygon(outer)))
        self.assertTrue(actual.equals(source_polygon(outer).difference(source_polygon(inner))))
        self.assertEqual([outer, inner], original)
        self.assert_preserved_coverage([outer, inner], result)

    def test_boundary_overlap_becomes_a_notch_in_one_polygon(self):
        old = rectangle(1, 0, 0, 10, 10)
        new = rectangle(2, 8, 3, 12, 7, priority=1)
        result = resolve_coverage([old, new])
        actual = geometry_for(result, 1)
        self.assertEqual(actual.geom_type, "Polygon")
        self.assertEqual(len(actual.interiors), 0)
        self.assertTrue(actual.equals(source_polygon(old).difference(source_polygon(new))))
        self.assert_preserved_coverage([old, new], result)

    def test_a_split_keeps_both_parts_without_multipolygon_or_corridors(self):
        old = rectangle(1, 0, 0, 10, 10)
        new = rectangle(2, 4, -1, 6, 11, priority=1)
        result = resolve_coverage([old, new])
        self.assertEqual(next(item for item in result["zones"] if item["id"] == 1)["parts"], 2)
        features = result["geojson"]["features"]
        self.assertEqual(len({feature["id"] for feature in features}), len(features))
        self.assertEqual({f["properties"]["price"] for f in features if f["properties"]["sourceZoneId"] == 1}, {100})
        self.assert_preserved_coverage([old, new], result)

    def test_new_large_zone_wins_and_removal_restores_old_coverage(self):
        old = rectangle(1, 2, 2, 3, 3)
        new = rectangle(2, 0, 0, 10, 10, priority=1)
        result = resolve_coverage([old, new])
        self.assertTrue(geometry_for(result, 1).is_empty)
        self.assertEqual(result["summary"]["coveredZoneCount"], 1)
        self.assertTrue(geometry_for(resolve_coverage([old]), 1).equals(source_polygon(old)))

    def test_moving_exception_restores_previous_location(self):
        outer = rectangle(1, 0, 0, 10, 10)
        moved = rectangle(2, 6, 6, 8, 8, priority=1)
        restored = rectangle(3, 2, 2, 4, 4)
        result = resolve_coverage([outer, moved])
        self.assertTrue(geometry_for(result, 1).covers(source_polygon(restored)))

    def test_focus_impacts_only_actual_tariff_areas_not_every_nested_parent(self):
        zones = [rectangle(1, 0, 0, 10, 10), rectangle(2, -2, -2, 12, 12),
                 rectangle(3, -4, -4, 14, 14), rectangle(4, 9, 4, 11, 6, priority=1)]
        result = resolve_coverage(zones, focus_id=4)
        self.assertEqual({item["id"] for item in result["impacts"]}, {1, 2})
        self.assertTrue(geometry_for(result, 3).equals(geometry_for(resolve_coverage(zones[:-1]), 3)))
        self.assert_preserved_coverage(zones, result)

    def test_legacy_smallest_first_and_equal_area_order_are_preserved(self):
        outer = rectangle(1, 0, 0, 10, 10)
        inner = rectangle(2, 3, 3, 6, 6)
        equal = {**copy.deepcopy(inner), "id": 3}
        self.assertEqual([zone["id"] for zone in ordered_zones([outer, inner, equal])], [2, 3, 1])
        self.assertTrue(geometry_for(resolve_coverage([outer, inner, equal]), 3).is_empty)

    def test_self_intersection_repair_retains_every_area_part_and_reports_it(self):
        zone = rectangle(1, 0, 0, 2, 2)
        zone["coordinates"] = [[[0, 0], [2, 2], [0, 2], [2, 0], [0, 0]]]
        result = resolve_coverage([zone])
        self.assertEqual(result["summary"]["repairedZoneCount"], 1)
        self.assertEqual(len(result["geojson"]["features"]), 2)
        self.assertEqual(geometry_for(result, 1).area, 2)
        self.assertTrue(result["warnings"])

    def test_self_intersection_repair_drops_only_a_detached_micro_fragment(self):
        geo_ring = [
            [37.515494, 56.45863], [37.477176, 56.446931], [37.40509, 56.374354],
            [37.469689, 56.29945], [37.46661, 56.285367], [37.475877, 56.281103],
            [37.478084, 56.277785], [37.506538, 56.276093], [37.58466, 56.266275],
            [37.632883, 56.380167], [37.593016, 56.410302], [37.561948, 56.418217],
            [37.51538, 56.458601], [37.515494, 56.45863],
        ]
        zone = rectangle(2, 0, 0, 1, 1)
        zone["coordinates"] = [[[latitude, longitude] for longitude, latitude in geo_ring]]
        result = resolve_coverage([zone])
        self.assertEqual(result["summary"]["polygonCount"], 1)
        self.assertEqual(result["summary"]["removedArtifactCount"], 1)
        self.assertTrue(any("микрофрагмент" in warning for warning in result["warnings"]))

    def test_preview_is_read_only_and_export_restores_sources_and_priorities(self):
        zones = [rectangle(1, 0, 0, 10, 10), rectangle(2, 3, 3, 6, 6, priority=7)]
        before = editor.ZONES_PATH.read_bytes()
        with editor.app.test_client() as client:
            response = client.post("/api/coverage", json={"zones": zones, "focusId": 2})
        self.assertEqual(response.status_code, 200)
        exported = response.get_json()["geojson"]
        self.assertEqual(editor.geojson_to_zones(exported), zones)
        self.assertEqual(editor.ZONES_PATH.read_bytes(), before)
        self.assertEqual(exported["deliveryZoneEditor"]["version"], 1)

    def test_plain_polygon_holes_and_precision_survive_import_save_round_trip(self):
        zone = rectangle(1, 37, 56, 38, 57, priority=3)
        hole = rectangle(2, 37.123456789, 56.2, 37.8, 56.8)["coordinates"][0]
        zone["coordinates"].append(hole)
        self.assertEqual(editor.geojson_to_zones(editor.zones_to_geojson([zone])), [zone])

    def test_invalid_numbers_and_collapsed_polygons_fail_without_export(self):
        for field in ["price", "priority"]:
            zone = rectangle(1, 0, 0, 2, 2)
            zone[field] = float("nan")
            with editor.app.test_client() as client:
                self.assertEqual(client.post("/api/coverage", json={"zones": [zone]}).status_code, 400)
        collapsed = rectangle(1, 0, 0, 2, 2)
        collapsed["coordinates"] = [[[0, 0], [1, 1], [2, 2], [0, 0]]]
        with editor.app.test_client() as client:
            self.assertEqual(client.post("/api/coverage", json={"zones": [collapsed]}).status_code, 400)


if __name__ == "__main__":
    unittest.main()
