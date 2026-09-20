"""Resolve editable source contours into exact, non-overlapping tariff areas."""

from __future__ import annotations

import math
from typing import Any

from shapely import make_valid
from shapely.geometry import Polygon, mapping
from shapely.geometry.polygon import orient
from shapely.ops import unary_union

MAX_REPAIR_ARTIFACT_AREA_M2 = 10
MAX_REPAIR_ARTIFACT_RATIO = 0.00001


def polygon_parts(geometry):
    if geometry.is_empty:
        return []
    if geometry.geom_type == "Polygon":
        return [geometry]
    if hasattr(geometry, "geoms"):
        return [part for child in geometry.geoms for part in polygon_parts(child)]
    return []


def source_polygon(zone):
    rings = [[(point[1], point[0]) for point in ring] for ring in zone["coordinates"]]
    return Polygon(rings[0], rings[1:])


def ring_area(ring):
    origin_lat, origin_lng = ring[0]
    return abs(sum(
        (point[0] - origin_lat) * (ring[(index + 1) % len(ring)][1] - origin_lng)
        - (ring[(index + 1) % len(ring)][0] - origin_lat) * (point[1] - origin_lng)
        for index, point in enumerate(ring)
    )) / 2


def ordered_zones(zones):
    # Legacy files retain the editor's smaller-first rule. Explicit priority is
    # stable while a new contour is resized, even if it becomes the largest.
    return sorted(zones, key=lambda zone: (-zone.get("priority", 0), ring_area(zone["coordinates"][0])))


def area_m2(geometry):
    if geometry.is_empty:
        return 0.0
    return geometry.area * 111_320**2 * math.cos(math.radians(geometry.centroid.y))


def resolve_coverage(zones: list[dict[str, Any]], focus_id=None):
    covered = Polygon()
    covered_without_focus = Polygon()
    records = []
    features = []
    impacts = []
    warnings = []
    removed_artifact_count = 0
    next_feature_id = max((zone["id"] for zone in zones), default=0) + 1

    for zone in ordered_zones(zones):
        source = source_polygon(zone)
        repaired = not source.is_valid
        valid_parts = polygon_parts(make_valid(source))
        artifacts = []
        if repaired and len(valid_parts) > 1:
            total_area = sum(part.area for part in valid_parts)
            artifacts = [
                part for part in valid_parts
                if area_m2(part) < MAX_REPAIR_ARTIFACT_AREA_M2
                and part.area / total_area < MAX_REPAIR_ARTIFACT_RATIO
            ]
            if artifacts and len(artifacts) < len(valid_parts):
                valid_parts = [part for part in valid_parts if part not in artifacts]
                removed_artifact_count += len(artifacts)
                removed_area = sum(area_m2(part) for part in artifacts)
                warnings.append(
                    f'«{zone["name"]}»: удалён микрофрагмент самопересечения площадью {removed_area:.1f} м².'
                )
        source = unary_union(valid_parts)
        if source.is_empty or source.area == 0:
            raise ValueError(f'«{zone["name"]}»: контур не ограничивает площадь. Исправьте его вершины.')
        if repaired and not artifacts:
            warnings.append(f'«{zone["name"]}»: исправлено самопересечение; все площадные части сохранены.')

        effective = source.difference(covered)
        parts = sorted(polygon_parts(effective), key=lambda part: -part.area)
        zone_features = []
        for index, part in enumerate(parts):
            part = orient(part, sign=1.0)
            feature_id = zone["id"] if index == 0 else next_feature_id
            if index:
                next_feature_id += 1
            properties = {key: zone[key] for key in ("name", "price", "minOrder", "color", "opacity")}
            properties.update(id=feature_id, sourceZoneId=zone["id"], part=index + 1, partCount=len(parts))
            if len(parts) > 1:
                properties["name"] = f'{zone["name"]} · часть {index + 1}'
            zone_features.append({
                "type": "Feature", "id": feature_id,
                "properties": properties, "geometry": mapping(part),
            })
        features.extend(zone_features)
        holes = sum(len(part.interiors) for part in parts)
        records.append({
            "id": zone["id"], "parts": len(parts), "holes": holes,
            "sourceAreaM2": area_m2(source), "areaM2": area_m2(effective),
            "repaired": repaired, "features": zone_features,
        })

        if focus_id is not None and zone["id"] != focus_id:
            before = source.difference(covered_without_focus)
            displaced = before.difference(effective)
            if displaced.area > 1e-14:
                impacts.append({"id": zone["id"], "name": zone["name"], "areaM2": area_m2(displaced)})
            covered_without_focus = covered_without_focus.union(source)
        covered = covered.union(source)

    return {
        "zones": records, "impacts": impacts, "warnings": warnings,
        "geojson": {"type": "FeatureCollection", "name": "delivery-zones-with-cutouts", "features": features},
        "summary": {
            "zoneCount": len(zones), "polygonCount": len(features),
            "holeCount": sum(zone["holes"] for zone in records),
            "splitZoneCount": sum(zone["parts"] > 1 for zone in records),
            "coveredZoneCount": sum(zone["parts"] == 0 for zone in records),
            "repairedZoneCount": sum(zone["repaired"] for zone in records),
            "removedArtifactCount": removed_artifact_count,
        },
    }
