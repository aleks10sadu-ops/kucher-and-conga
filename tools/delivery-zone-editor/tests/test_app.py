import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import app as editor


SAMPLE_ZONES = [
    {
        "id": 1,
        "name": "Тестовая зона",
        "price": 250,
        "minOrder": 1500,
        "coordinates": [
            [
                [56.4, 37.5],
                [56.5, 37.5],
                [56.5, 37.6],
                [56.4, 37.5],
            ]
        ],
        "color": "#22c55e",
        "opacity": 0.2,
    }
]


class DeliveryZoneEditorTest(unittest.TestCase):
    def setUp(self):
        self.temporary_directory = tempfile.TemporaryDirectory()
        temporary_path = Path(self.temporary_directory.name)
        self.original_zones_path = editor.ZONES_PATH
        self.original_backup_dir = editor.BACKUP_DIR
        editor.ZONES_PATH = temporary_path / "data" / "zones.geojson"
        editor.BACKUP_DIR = temporary_path / "backups"
        editor.ZONES_PATH.parent.mkdir(parents=True)
        editor.ZONES_PATH.write_text(
            json.dumps(editor.zones_to_geojson(SAMPLE_ZONES), ensure_ascii=False),
            encoding="utf-8",
        )
        editor.app.config.update(TESTING=True)
        self.client = editor.app.test_client()

    def tearDown(self):
        editor.ZONES_PATH = self.original_zones_path
        editor.BACKUP_DIR = self.original_backup_dir
        self.temporary_directory.cleanup()

    def test_geojson_round_trip_preserves_latitude_longitude(self):
        document = editor.zones_to_geojson(SAMPLE_ZONES)
        self.assertEqual(document["features"][0]["geometry"]["coordinates"][0][0], [37.5, 56.4])
        restored = editor.geojson_to_zones(document)
        self.assertEqual(restored, SAMPLE_ZONES)

    def test_get_and_put_zones_use_standalone_geojson_file(self):
        response = self.client.get("/api/zones")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["zones"][0]["name"], "Тестовая зона")

        changed = json.loads(json.dumps(SAMPLE_ZONES))
        changed[0]["price"] = 300
        response = self.client.put("/api/zones", json={"zones": changed})
        self.assertEqual(response.status_code, 200)
        saved_document = json.loads(editor.ZONES_PATH.read_text(encoding="utf-8"))
        self.assertEqual(saved_document["features"][0]["properties"]["price"], 300)
        self.assertEqual(len(list(editor.BACKUP_DIR.glob("*.geojson"))), 1)

    def test_invalid_polygon_is_rejected(self):
        invalid = json.loads(json.dumps(SAMPLE_ZONES))
        invalid[0]["coordinates"] = [[[56.4, 37.5], [56.5, 37.6]]]
        response = self.client.put("/api/zones", json={"zones": invalid})
        self.assertEqual(response.status_code, 400)
        self.assertIn("минимум три", response.get_json()["error"])

    def test_nested_zones_keep_their_conditions_and_priority_after_save(self):
        outer = json.loads(json.dumps(SAMPLE_ZONES[0]))
        outer["price"] = 300
        inner = {
            **outer,
            "id": 2,
            "name": "Вложенная зона 600",
            "price": 600,
            "minOrder": 3500,
            "coordinates": [[[56.46, 37.52], [56.48, 37.52], [56.48, 37.54], [56.46, 37.52]]],
        }
        response = self.client.put("/api/zones", json={"zones": [inner, outer]})
        self.assertEqual(response.status_code, 200)
        restored = self.client.get("/api/zones").get_json()["zones"]
        self.assertEqual(restored, [inner, outer])
        document = json.loads(editor.ZONES_PATH.read_text(encoding="utf-8"))
        self.assertEqual(document["features"][0]["properties"]["price"], 600)
        self.assertEqual(document["features"][1]["properties"]["price"], 300)

    def test_editor_has_controlled_boot_screen_and_fresh_assets(self):
        response = self.client.get("/")
        html = response.get_data(as_text=True)
        self.assertEqual(response.status_code, 200)
        self.assertIn('id="boot-screen"', html)
        self.assertRegex(html, r"styles\.css\?v=\d+")
        self.assertRegex(html, r"editor\.js\?v=\d+")
        self.assertIn('id="import-dialog"', html)
        self.assertIn('id="import-zone-list"', html)
        self.assertIn('id="import-confirm-button"', html)
        self.assertEqual(response.headers["Cache-Control"], "no-store, max-age=0")


if __name__ == "__main__":
    unittest.main()
