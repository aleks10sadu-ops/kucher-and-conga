from __future__ import annotations

import json
import math
import os
import re
import shutil
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from flask import Flask, jsonify, render_template, request
from shapely.errors import GEOSException

from geometry import resolve_coverage


EDITOR_DIR = Path(__file__).resolve().parent
DEFAULT_ZONES_PATH = EDITOR_DIR / "data" / "delivery-zones.geojson"
ZONES_PATH = Path(os.environ.get("DELIVERY_ZONES_FILE", DEFAULT_ZONES_PATH)).resolve()
BACKUP_DIR = EDITOR_DIR / "backups"
HEX_COLOR = re.compile(r"^#[0-9a-fA-F]{6}$")

app = Flask(__name__)
app.json.ensure_ascii = False


class ZoneValidationError(ValueError):
    pass


def _number(value: Any, label: str, minimum: float | None = None) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ZoneValidationError(f"{label}: ожидается число")
    number = float(value)
    if not math.isfinite(number):
        raise ZoneValidationError(f"{label}: ожидается конечное число")
    if minimum is not None and number < minimum:
        raise ZoneValidationError(f"{label}: значение не может быть меньше {minimum:g}")
    return number


def _same_point(first: list[float], second: list[float]) -> bool:
    return abs(first[0] - second[0]) < 1e-10 and abs(first[1] - second[1]) < 1e-10


def validate_zones(raw_zones: Any) -> list[dict[str, Any]]:
    if not isinstance(raw_zones, list) or not raw_zones:
        raise ZoneValidationError("Должна быть указана хотя бы одна зона")

    clean: list[dict[str, Any]] = []
    seen_ids: set[int] = set()

    for index, raw_zone in enumerate(raw_zones, start=1):
        prefix = f"Зона {index}"
        if not isinstance(raw_zone, dict):
            raise ZoneValidationError(f"{prefix}: ожидается объект")

        raw_id = raw_zone.get("id")
        if isinstance(raw_id, bool) or not isinstance(raw_id, int) or raw_id < 1:
            raise ZoneValidationError(f"{prefix}: id должен быть целым положительным числом")
        if raw_id in seen_ids:
            raise ZoneValidationError(f"{prefix}: id {raw_id} уже используется")
        seen_ids.add(raw_id)

        name = str(raw_zone.get("name", "")).strip()
        if not name:
            raise ZoneValidationError(f"{prefix}: укажите название")
        if len(name) > 80:
            raise ZoneValidationError(f"{prefix}: название длиннее 80 символов")

        price = _number(raw_zone.get("price"), f"{prefix}, стоимость", 0)
        min_order = _number(raw_zone.get("minOrder"), f"{prefix}, минимальный заказ", 0)
        opacity = _number(raw_zone.get("opacity", 0.2), f"{prefix}, прозрачность", 0)
        if opacity > 1:
            raise ZoneValidationError(f"{prefix}: прозрачность должна быть от 0 до 1")

        color = str(raw_zone.get("color", "")).strip()
        if not HEX_COLOR.fullmatch(color):
            raise ZoneValidationError(f"{prefix}: цвет должен быть в формате #RRGGBB")

        coordinates = raw_zone.get("coordinates")
        if not isinstance(coordinates, list) or not coordinates:
            raise ZoneValidationError(f"{prefix}: нужен внешний контур полигона")
        clean_rings = []
        for ring in coordinates:
            if not isinstance(ring, list):
                raise ZoneValidationError(f"{prefix}: неверный контур полигона")
            clean_ring: list[list[float]] = []
            for point_index, point in enumerate(ring, start=1):
                if not isinstance(point, list) or len(point) != 2:
                    raise ZoneValidationError(f"{prefix}, точка {point_index}: нужны широта и долгота")
                latitude = _number(point[0], f"{prefix}, точка {point_index}, широта")
                longitude = _number(point[1], f"{prefix}, точка {point_index}, долгота")
                if not -90 <= latitude <= 90 or not -180 <= longitude <= 180:
                    raise ZoneValidationError(f"{prefix}, точка {point_index}: координаты вне допустимого диапазона")
                clean_ring.append([latitude, longitude])
            if len(clean_ring) > 1 and _same_point(clean_ring[0], clean_ring[-1]):
                clean_ring.pop()
            if len({tuple(point) for point in clean_ring}) < 3:
                raise ZoneValidationError(f"{prefix}: для полигона нужны минимум три разные точки")
            clean_ring.append(clean_ring[0].copy())
            clean_rings.append(clean_ring)

        clean.append(
            {
                "id": raw_id,
                "name": name,
                "price": int(price) if price.is_integer() else price,
                "minOrder": int(min_order) if min_order.is_integer() else min_order,
                "coordinates": clean_rings,
                "color": color.lower(),
                "opacity": opacity,
            }
        )
        if "priority" in raw_zone:
            priority = _number(raw_zone["priority"], f"{prefix}, приоритет", 0)
            if not priority.is_integer() or priority > 1_000_000_000:
                raise ZoneValidationError(f"{prefix}: неверный приоритет")
            clean[-1]["priority"] = int(priority)

    return clean


def zones_to_geojson(zones: list[dict[str, Any]]) -> dict[str, Any]:
    return {
        "type": "FeatureCollection",
        "name": "delivery-zones",
        "features": [
            {
                "type": "Feature",
                "id": zone["id"],
                "properties": {
                    "id": zone["id"],
                    "name": zone["name"],
                    "price": zone["price"],
                    "minOrder": zone["minOrder"],
                    "color": zone["color"],
                    "opacity": zone["opacity"],
                    **({"priority": zone["priority"]} if "priority" in zone else {}),
                },
                "geometry": {
                    "type": "Polygon",
                    # GeoJSON uses [longitude, latitude]; the editor uses Leaflet's [latitude, longitude].
                    "coordinates": [
                        [[point[1], point[0]] for point in ring]
                        for ring in zone["coordinates"]
                    ],
                },
            }
            for zone in zones
        ],
    }


def geojson_to_zones(document: Any) -> list[dict[str, Any]]:
    if isinstance(document, dict) and isinstance(document.get("deliveryZoneEditor"), dict):
        metadata = document["deliveryZoneEditor"]
        if metadata.get("version") == 1 and "sources" in metadata:
            document = metadata["sources"]
    if not isinstance(document, dict) or document.get("type") != "FeatureCollection":
        raise ZoneValidationError("GeoJSON должен иметь тип FeatureCollection")
    features = document.get("features")
    if not isinstance(features, list):
        raise ZoneValidationError("В GeoJSON отсутствует массив features")

    raw_zones: list[dict[str, Any]] = []
    for index, feature in enumerate(features, start=1):
        if not isinstance(feature, dict) or feature.get("type") != "Feature":
            raise ZoneValidationError(f"Объект {index}: ожидается GeoJSON Feature")
        geometry = feature.get("geometry") or {}
        if geometry.get("type") != "Polygon":
            raise ZoneValidationError(f"Объект {index}: поддерживаются только Polygon")
        coordinates = geometry.get("coordinates")
        if not isinstance(coordinates, list) or not coordinates:
            raise ZoneValidationError(f"Объект {index}: у полигона нет координат")
        properties = feature.get("properties") or {}
        feature_id = properties.get("id", feature.get("id", index))
        raw_zones.append(
            {
                "id": feature_id,
                "name": properties.get("name", f"Зона {index}"),
                "price": properties.get("price", 0),
                "minOrder": properties.get("minOrder", properties.get("min_order", 0)),
                "color": properties.get("color", "#3b82f6"),
                "opacity": properties.get("opacity", 0.2),
                **({"priority": properties["priority"]} if "priority" in properties else {}),
                "coordinates": [
                    [[point[1], point[0]] for point in ring]
                    for ring in coordinates
                ],
            }
        )
    return validate_zones(raw_zones)


def read_zones() -> list[dict[str, Any]]:
    with ZONES_PATH.open("r", encoding="utf-8") as zones_file:
        return geojson_to_zones(json.load(zones_file))


def write_zones(zones: list[dict[str, Any]]) -> Path:
    ZONES_PATH.parent.mkdir(parents=True, exist_ok=True)
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S-%f")
    backup_path = BACKUP_DIR / f"delivery-zones-{timestamp}.geojson"
    if ZONES_PATH.exists():
        shutil.copy2(ZONES_PATH, backup_path)

    file_descriptor, temporary_name = tempfile.mkstemp(
        prefix="delivery-zones-", suffix=".tmp", dir=ZONES_PATH.parent
    )
    try:
        with os.fdopen(file_descriptor, "w", encoding="utf-8", newline="\n") as zones_file:
            json.dump(zones_to_geojson(zones), zones_file, ensure_ascii=False, indent=2)
            zones_file.write("\n")
            zones_file.flush()
            os.fsync(zones_file.fileno())
        os.replace(temporary_name, ZONES_PATH)
    finally:
        if os.path.exists(temporary_name):
            os.unlink(temporary_name)
    return backup_path


@app.get("/")
def index():
    asset_version = max(
        (EDITOR_DIR / "static" / "styles.css").stat().st_mtime_ns,
        (EDITOR_DIR / "static" / "editor.js").stat().st_mtime_ns,
    )
    return render_template("index.html", asset_version=asset_version)


@app.after_request
def disable_browser_cache(response):
    """Keep local editor assets in sync while the tool is being changed."""
    response.headers["Cache-Control"] = "no-store, max-age=0"
    response.headers["Pragma"] = "no-cache"
    return response


@app.get("/api/health")
def health():
    return jsonify({"ok": True, "zonesFile": str(ZONES_PATH)})


@app.get("/api/zones")
def get_zones():
    try:
        modified_at = datetime.fromtimestamp(ZONES_PATH.stat().st_mtime, timezone.utc).isoformat()
        return jsonify({"zones": read_zones(), "savedAt": modified_at})
    except (OSError, json.JSONDecodeError, ZoneValidationError) as error:
        return jsonify({"error": f"Не удалось прочитать зоны: {error}"}), 500


@app.put("/api/zones")
def put_zones():
    try:
        payload = request.get_json(silent=False)
        raw_zones = payload.get("zones") if isinstance(payload, dict) else payload
        zones = validate_zones(raw_zones)
        backup_path = write_zones(zones)
        saved_at = datetime.now(timezone.utc).isoformat()
        return jsonify(
            {
                "ok": True,
                "zones": zones,
                "savedAt": saved_at,
                "backup": str(backup_path),
            }
        )
    except ZoneValidationError as error:
        return jsonify({"error": str(error)}), 400
    except (OSError, json.JSONDecodeError) as error:
        return jsonify({"error": f"Не удалось сохранить зоны: {error}"}), 500


@app.post("/api/coverage")
def coverage():
    """Preview/export only: never replaces the saved editable source contours."""
    try:
        payload = request.get_json(silent=False)
        if not isinstance(payload, dict):
            raise ZoneValidationError("Ожидается объект с зонами")
        raw_zones = payload.get("zones")
        zones = [] if raw_zones == [] else validate_zones(raw_zones)
        result = resolve_coverage(zones, payload.get("focusId"))
        result["geojson"]["deliveryZoneEditor"] = {
            "version": 1, "sources": zones_to_geojson(zones),
        }
        return jsonify(result)
    except (ZoneValidationError, ValueError, GEOSException) as error:
        return jsonify({"error": str(error)}), 400


@app.get("/api/geocode")
def geocode():
    query = request.args.get("q", "").strip()
    if len(query) < 3:
        return jsonify({"error": "Введите не менее трёх символов"}), 400

    parameters = urlencode(
        {
            "q": query,
            "format": "jsonv2",
            "limit": 5,
            "countrycodes": "ru",
            "accept-language": "ru",
        }
    )
    geocode_request = Request(
        f"https://nominatim.openstreetmap.org/search?{parameters}",
        headers={"User-Agent": "KongotestDeliveryZoneEditor/1.0 (local tool)"},
    )
    try:
        with urlopen(geocode_request, timeout=8) as response:
            results = json.loads(response.read().decode("utf-8"))
        return jsonify(
            {
                "results": [
                    {
                        "label": item.get("display_name", "Адрес"),
                        "lat": float(item["lat"]),
                        "lng": float(item["lon"]),
                    }
                    for item in results
                ]
            }
        )
    except Exception as error:  # Network failures should become a useful UI message.
        return jsonify({"error": f"Сервис поиска адресов недоступен: {error}"}), 502


if __name__ == "__main__":
    app.run(
        host=os.environ.get("FLASK_HOST", "127.0.0.1"),
        port=int(os.environ.get("FLASK_PORT", "5123")),
        debug=False,
    )
