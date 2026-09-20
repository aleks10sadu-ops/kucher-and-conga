(() => {
  "use strict";

  const RESTAURANT_COORDS = [56.390656, 37.527282];
  const DEFAULT_CENTER = [56.39, 37.53];
  const PALETTE = ["#22c55e", "#3b82f6", "#a855f7", "#f59e0b", "#f97316", "#ef4444", "#0f8a78"];
  const money = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 });

  const elements = {};
  const layerById = new Map();
  const coverageLayerById = new Map();
  const hiddenZoneIds = new Set();
  let map;
  let zones = [];
  let savedZones = [];
  let selectedId = null;
  let addressMarker = null;
  let dirty = false;
  let activeTool = "select";
  let savedAt = null;
  let syncingLayer = false;
  let pendingImport = null;
  let coverageResult = null;
  let coverageRevision = 0;
  let coverageTimer = null;
  let coverageReady = false;
  let checkedPoint = null;

  const clone = (value) => JSON.parse(JSON.stringify(value));

  function cacheElements() {
    [
      "zone-count", "zone-list", "map-legend", "legend-list", "save-state", "save-state-title",
      "save-state-time", "save-button", "revert-button", "import-button", "import-input", "export-button",
      "add-zone-button", "mobile-zone-toggle",
      "mobile-zones-button", "zones-panel", "inspector", "inspector-empty", "inspector-content",
      "inspector-title", "close-inspector-button", "zone-name", "zone-price", "zone-min-order",
      "zone-color-dot", "zone-color-input", "color-swatches", "zone-opacity", "zone-opacity-value",
      "vertex-count", "vertex-list", "add-point-button", "delete-zone-button", "check-address-button",
      "map-search", "address-input", "close-search-button", "search-results", "address-result",
      "focus-all-button", "map-hint", "toast-region", "legend-collapse",
      "import-dialog", "import-dialog-close", "import-file-name", "import-file-details",
      "import-selected-count", "import-select-all", "import-clear-all", "import-zone-list",
      "import-cancel-button", "import-confirm-button", "coverage-title", "coverage-summary",
      "coverage-details", "zone-cutout-info", "raise-zone-button"
    ].forEach((id) => {
      elements[toCamel(id)] = document.getElementById(id);
    });
  }

  function toCamel(value) {
    return value.replace(/-([a-z])/g, (_, character) => character.toUpperCase());
  }

  function initMap() {
    if (!window.L) {
      throw new Error("Библиотека карты не загрузилась. Проверьте подключение к интернету.");
    }

    map = L.map("map", {
      center: DEFAULT_CENTER,
      zoom: 11,
      zoomControl: false,
      attributionControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "© OpenStreetMap",
    }).addTo(map);
    L.control.zoom({ position: "bottomright" }).addTo(map);

    const restaurantIcon = L.divIcon({
      className: "",
      html: '<div class="restaurant-pin"><span>⌁</span></div>',
      iconSize: [38, 38],
      iconAnchor: [19, 36],
    });
    L.marker(RESTAURANT_COORDS, { icon: restaurantIcon, zIndexOffset: 800 })
      .addTo(map)
      .bindTooltip("Kucher&Conga · Промышленная улица, 20Б", { direction: "top", offset: [0, -28] });

    if (map.pm) {
      map.pm.setGlobalOptions({
        snappable: true,
        snapDistance: 18,
        allowSelfIntersection: false,
        templineStyle: { color: "#164d2a", weight: 2 },
        hintlineStyle: { color: "#164d2a", dashArray: [6, 6] },
      });
      map.on("pm:create", handlePolygonCreated);
    }

    map.on("click", (event) => {
      if (activeTool === "check") {
        checkPoint(event.latlng.lat, event.latlng.lng, "Точка на карте");
      }
    });
  }

  async function loadZones() {
    setStatus("loading");
    try {
      const response = await fetch("/api/zones", { headers: { Accept: "application/json" } });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Не удалось загрузить зоны");
      zones = clone(payload.zones);
      savedZones = clone(payload.zones);
      savedAt = payload.savedAt;
      selectedId = zones.length ? zones[zones.length - 1].id : null;
      dirty = false;
      renderAll({ fit: true });
      setStatus("saved");
      await refreshCoverage();
    } catch (error) {
      setStatus("error", error.message);
      toast(error.message, true);
    }
  }

  function renderAll({ fit = false } = {}) {
    renderZoneList();
    renderLegend();
    renderLayers();
    renderInspector();
    if (fit) fitAllZones();
  }

  function renderZoneList() {
    const template = document.getElementById("zone-item-template");
    elements.zoneList.replaceChildren();
    elements.zoneCount.textContent = String(zones.length);

    zonesByPriority().forEach((zone) => {
      const fragment = template.content.cloneNode(true);
      const item = fragment.querySelector(".zone-item");
      const selectButton = fragment.querySelector(".zone-select");
      const visibilityButton = fragment.querySelector(".zone-visibility");
      item.dataset.zoneId = String(zone.id);
      item.classList.toggle("is-selected", zone.id === selectedId);
      item.classList.toggle("is-hidden", hiddenZoneIds.has(zone.id));
      fragment.querySelector(".zone-swatch").style.background = zone.color;
      fragment.querySelector(".zone-copy strong").textContent = zone.name;
      fragment.querySelector(".zone-copy small").textContent = zone.price === 0
        ? `Бесплатно · заказ от ${money.format(zone.minOrder)} ₽`
        : `${money.format(zone.price)} ₽ · заказ от ${money.format(zone.minOrder)} ₽`;
      selectButton.addEventListener("click", () => selectZone(zone.id));
      const coverage = coverageResult?.zones.find((item) => item.id === zone.id);
      if (coverage?.parts > 1) fragment.querySelector(".zone-copy small").textContent += ` · участков: ${coverage.parts}`;
      if (coverage?.parts === 0) fragment.querySelector(".zone-copy small").textContent += " · вытеснена";
      visibilityButton.addEventListener("click", (event) => {
        event.stopPropagation();
        toggleZoneVisibility(zone.id);
      });
      elements.zoneList.appendChild(fragment);
    });
  }

  function renderLegend() {
    elements.legendList.replaceChildren();
    zones.forEach((zone) => {
      const row = document.createElement("div");
      row.className = "legend-row";
      row.classList.toggle("is-hidden", hiddenZoneIds.has(zone.id));
      row.innerHTML = '<span class="legend-dot"></span><span></span><span></span>';
      row.children[0].style.background = zone.color;
      row.children[1].textContent = zone.name;
      row.children[2].textContent = zone.price === 0
        ? `0 ₽ · от ${money.format(zone.minOrder)} ₽`
        : `${money.format(zone.price)} ₽ · от ${money.format(zone.minOrder)} ₽`;
      elements.legendList.appendChild(row);
    });
  }

  function renderLayers() {
    layerById.forEach((layer) => {
      if (layer.pm?.enabled()) layer.pm.disable();
      if (map.hasLayer(layer)) map.removeLayer(layer);
    });
    layerById.clear();

    zonesByPriority().reverse().forEach((zone) => {
      const layer = createZoneLayer(zone);
      layerById.set(zone.id, layer);
    });

    renderCoverageLayers();
    enableSelectedLayer();
  }

  function createZoneLayer(zone) {
    const layer = L.polygon(zone.coordinates, sourceLayerStyle(zone));
    layer.on("click", (event) => {
      // Drawing and address checks listen on the map, including over existing polygons.
      if (activeTool !== "select") return;
      L.DomEvent.stopPropagation(event);
      selectZone(zone.id);
    });
    ["pm:edit", "pm:markerdragend", "pm:vertexadded", "pm:vertexremoved"].forEach((eventName) => {
      layer.on(eventName, () => syncZoneFromLayer(zone.id));
    });
    return layer;
  }

  function layerStyle(zone, selected = false) {
    const configuredOpacity = Number(zone.opacity) || 0.2;
    return {
      color: zone.color,
      weight: selected ? 3.2 : 2.35,
      opacity: selected ? 1 : 0.86,
      fillColor: zone.color,
      // Very low imported opacity remains stored as-is, but the editor keeps every zone visible enough to edit.
      fillOpacity: Math.min(Math.max(configuredOpacity, selected ? 0.24 : 0.16) + (selected ? 0.05 : 0), 0.62),
      lineCap: "round",
      lineJoin: "round",
    };
  }

  function sourceLayerStyle(zone) {
    return { color: zone.color, weight: 2, opacity: 0.9, fill: false, dashArray: "6 5" };
  }

  function renderCoverageLayers() {
    coverageLayerById.forEach((layer) => map.removeLayer(layer));
    coverageLayerById.clear();
    for (const record of coverageResult?.zones || []) {
      const zone = zoneById(record.id);
      if (!zone || !record.features.length) continue;
      const layer = L.geoJSON({ type: "FeatureCollection", features: record.features }, {
        style: () => layerStyle(zone, zone.id === selectedId),
        onEachFeature: (_, polygon) => {
          polygon.on("click", (event) => {
            if (activeTool !== "select") return;
            L.DomEvent.stopPropagation(event);
            selectZone(zone.id);
          });
        },
      });
      coverageLayerById.set(zone.id, layer);
      if (!hiddenZoneIds.has(zone.id)) layer.addTo(map);
    }
    updateLayerOrder();
  }

  function coveragePending() {
    coverageReady = false;
    if (elements.coverageTitle) elements.coverageTitle.textContent = "Пересчитываем вырезы…";
    if (elements.zoneCutoutInfo) elements.zoneCutoutInfo.textContent = "Пересчитываем влияние зоны…";
    if (elements.exportButton) elements.exportButton.disabled = true;
  }

  function scheduleCoverage() {
    if (typeof window.setTimeout !== "function") return;
    coverageRevision += 1;
    window.clearTimeout(coverageTimer);
    coveragePending();
    coverageTimer = window.setTimeout(() => refreshCoverage(), 180);
  }

  async function refreshCoverage() {
    window.clearTimeout?.(coverageTimer);
    const revision = ++coverageRevision;
    const snapshot = clone(zonesByPriority());
    coveragePending();
    try {
      const response = await fetch("/api/coverage", {
        method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ zones: snapshot, focusId: selectedId }),
      });
      if (response.status === 404) throw new Error("Перезапустите локальный сервер редактора: он ещё работает со старой версией.");
      const result = await response.json();
      if (revision !== coverageRevision) return null;
      if (!response.ok) throw new Error(result.error || "Не удалось рассчитать вырезы");
      coverageResult = result;
      coverageReady = true;
      renderCoverageLayers();
      renderZoneList();
      renderCoverageDetails();
      renderCheckedPoint();
      elements.exportButton.disabled = !zones.length;
      return result;
    } catch (error) {
      if (revision !== coverageRevision) return null;
      coverageResult = null;
      renderCoverageLayers();
      if (elements.coverageTitle) elements.coverageTitle.textContent = "Нужно исправить контур";
      if (elements.coverageSummary) elements.coverageSummary.textContent = error.message;
      if (elements.coverageDetails) elements.coverageDetails.textContent = "Экспорт приостановлен: старые вырезы не будут скачаны.";
      if (elements.zoneCutoutInfo) elements.zoneCutoutInfo.textContent = error.message;
      return null;
    }
  }

  function renderCoverageDetails() {
    if (!elements.coverageTitle) return;
    if (!coverageReady) {
      if (elements.zoneCutoutInfo) elements.zoneCutoutInfo.textContent = "Пересчитываем влияние зоны…";
      return;
    }
    if (!coverageResult) return;
    const { summary, warnings, impacts } = coverageResult;
    elements.coverageTitle.textContent = "Вырезы готовы";
    elements.coverageSummary.textContent = `Зон: ${summary.zoneCount} · контуров: ${summary.polygonCount} · вырезов: ${summary.holeCount}`;
    const notes = ["Границы вне пересечений сохранены. Исходные контуры можно редактировать и восстанавливать."];
    if (summary.splitZoneCount) notes.push(`Разделённых зон: ${summary.splitZoneCount}. Их участки попадут в один файл с одинаковыми условиями.`);
    if (summary.coveredZoneCount) notes.push(`Полностью вытесненных зон: ${summary.coveredZoneCount}. Они сохранены в черновике, но не добавляют пустые контуры в экспорт.`);
    if (summary.removedArtifactCount) notes.push(`Удалено микрофрагментов самопересечения: ${summary.removedArtifactCount}.`);
    notes.push(...warnings);
    elements.coverageDetails.textContent = notes.join(" ");
    const zone = selectedZone();
    if (!zone) return;
    const record = coverageResult.zones.find((item) => item.id === zone.id);
    const rank = zonesByPriority().findIndex((item) => item.id === zone.id) + 1;
    let text = `Приоритет: ${rank} из ${zones.length}. `;
    if (record?.parts === 0) text += "Зона полностью вытеснена. ";
    else if (record) text += `Участков: ${record.parts}, внутренних вырезов: ${record.holes}, точек в экспорте: ${featurePointCount(record)}. `;
    text += impacts.length ? `Вытесняет: ${impacts.map((item) => item.name).join(", ")}.` : "Другие тарифные области не изменяет.";
    elements.zoneCutoutInfo.textContent = text;
    elements.raiseZoneButton.disabled = rank === 1;
  }

  function featurePointCount(record) {
    return (record?.features || []).reduce((featureTotal, feature) => featureTotal
      + (feature.geometry?.coordinates || []).reduce((ringTotal, ring) => ringTotal + Math.max(0, ring.length - 1), 0), 0);
  }

  function raiseSelectedZone() {
    const zone = selectedZone();
    if (!zone) return;
    zone.priority = Math.max(0, ...zones.map((item) => Number(item.priority) || 0)) + 1;
    markDirty();
    renderAll();
    toast("Зона получила приоритет. Пересечения будут вырезаны из остальных зон.");
  }

  function enableSelectedLayer() {
    layerById.forEach((layer, id) => {
      layer.setStyle(sourceLayerStyle(zoneById(id)));
      if (layer.pm?.enabled()) layer.pm.disable();
      if (map.hasLayer(layer)) map.removeLayer(layer);
    });
    updateLayerOrder();
    const activeLayer = layerById.get(selectedId);
    if (activeTool !== "select" || !activeLayer || hiddenZoneIds.has(selectedId)) return;
    activeLayer.addTo(map);
    if (activeLayer.pm) {
      activeLayer.pm.enable({
        allowSelfIntersection: false,
        preventMarkerRemoval: true,
        hideMiddleMarkers: false,
        snappable: true,
      });
    }
  }

  function updateLayerOrder() {
    // Selection must not cover or intercept clicks on a smaller nested zone.
    zonesByPriority().reverse().forEach((zone) => {
      const layer = coverageLayerById.get(zone.id);
      if (layer && map.hasLayer(layer)) layer.bringToFront();
    });
    const selectedLayer = layerById.get(selectedId);
    if (selectedLayer && map.hasLayer(selectedLayer)) selectedLayer.bringToFront();
  }

  function selectZone(id, { pan = false } = {}) {
    if (!zoneById(id)) return;
    selectedId = id;
    if (hiddenZoneIds.has(id)) {
      hiddenZoneIds.delete(id);
      layerById.get(id)?.addTo(map);
    }
    renderZoneList();
    renderLegend();
    renderInspector();
    enableSelectedLayer();
    elements.inspector.classList.add("has-selection");
    elements.zonesPanel.classList.remove("is-open");
    if (pan) {
      const layer = layerById.get(id);
      if (layer) map.fitBounds(layer.getBounds(), { padding: [60, 60], maxZoom: 15 });
    }
    scheduleCoverage();
  }

  function clearSelection() {
    const activeLayer = layerById.get(selectedId);
    if (activeLayer?.pm?.enabled()) activeLayer.pm.disable();
    selectedId = null;
    renderZoneList();
    renderInspector();
    if (activeLayer && map.hasLayer(activeLayer)) map.removeLayer(activeLayer);
    elements.inspector.classList.remove("has-selection");
    scheduleCoverage();
  }

  function renderInspector() {
    const zone = selectedZone();
    elements.inspectorEmpty.hidden = Boolean(zone);
    elements.inspectorContent.hidden = !zone;
    elements.inspector.classList.toggle("has-selection", Boolean(zone));
    if (!zone) return;

    elements.inspectorTitle.textContent = zone.name;
    elements.zoneName.value = zone.name;
    elements.zonePrice.value = zone.price;
    elements.zoneMinOrder.value = zone.minOrder;
    elements.zoneColorDot.style.background = zone.color;
    elements.zoneColorInput.value = zone.color;
    elements.zoneOpacity.value = zone.opacity;
    elements.zoneOpacityValue.textContent = `${Math.round(zone.opacity * 100)}%`;
    renderColorSwatches();
    renderVertices();
    renderCoverageDetails();
  }

  function renderColorSwatches() {
    const zone = selectedZone();
    elements.colorSwatches.replaceChildren();
    PALETTE.forEach((color) => {
      const button = document.createElement("button");
      button.className = "color-swatch-button";
      button.classList.toggle("is-selected", zone?.color.toLowerCase() === color.toLowerCase());
      button.type = "button";
      button.style.background = color;
      button.setAttribute("aria-label", `Выбрать цвет ${color}`);
      button.addEventListener("click", () => setZoneColor(color));
      elements.colorSwatches.appendChild(button);
    });
  }

  function renderVertices() {
    const zone = selectedZone();
    const template = document.getElementById("vertex-row-template");
    const points = zone ? openRing(zone) : [];
    elements.vertexCount.textContent = String(points.length);
    elements.vertexList.replaceChildren();

    points.forEach((point, index) => {
      const fragment = template.content.cloneNode(true);
      const row = fragment.querySelector(".vertex-row");
      const latInput = fragment.querySelector(".coordinate-lat");
      const lngInput = fragment.querySelector(".coordinate-lng");
      fragment.querySelector(".vertex-number").textContent = String(index + 1);
      latInput.value = Number(point[0]).toFixed(6);
      lngInput.value = Number(point[1]).toFixed(6);
      const commit = () => updateVertex(index, Number(latInput.value), Number(lngInput.value));
      latInput.addEventListener("change", commit);
      lngInput.addEventListener("change", commit);
      fragment.querySelector(".vertex-delete").addEventListener("click", () => deleteVertex(index));
      row.addEventListener("mouseenter", () => highlightVertex(index, true));
      row.addEventListener("mouseleave", () => highlightVertex(index, false));
      elements.vertexList.appendChild(fragment);
    });
  }

  function highlightVertex(index, highlighted) {
    const layer = layerById.get(selectedId);
    const markers = layer?.pm?._markers?.[0];
    const marker = markers?.[index];
    const element = marker?.getElement?.();
    if (element) element.style.transform = highlighted ? `${element.style.transform} scale(1.35)` : element.style.transform.replace(" scale(1.35)", "");
  }

  function syncZoneFromLayer(id) {
    if (syncingLayer) return;
    const layer = layerById.get(id);
    const zone = zoneById(id);
    if (!layer || !zone) return;
    const latLngGroups = layer.getLatLngs();
    const rings = Array.isArray(latLngGroups[0]) ? latLngGroups : [latLngGroups];
    if (rings.some((ring) => ring.length < 3)) return;
    zone.coordinates = rings.map((ring) => {
      const points = ring.map((point) => [Number(point.lat), Number(point.lng)]);
      if (!samePoint(points[0], points[points.length - 1])) points.push([...points[0]]);
      return points;
    });
    updateLayerOrder();
    markDirty();
    if (id === selectedId) renderVertices();
  }

  function updateLayerFromZone(zone, { keepEditing = true } = {}) {
    const layer = layerById.get(zone.id);
    if (!layer) return;
    const wasEditing = layer.pm?.enabled();
    if (wasEditing) layer.pm.disable();
    syncingLayer = true;
    layer.setLatLngs(zone.coordinates);
    layer.setStyle(sourceLayerStyle(zone));
    syncingLayer = false;
    updateLayerOrder();
    if (wasEditing && keepEditing && layer.pm) {
      layer.pm.enable({ allowSelfIntersection: false, preventMarkerRemoval: true, hideMiddleMarkers: false });
    }
  }

  function openRing(zone) {
    const ring = clone(zone.coordinates?.[0] || []);
    if (ring.length > 1 && samePoint(ring[0], ring[ring.length - 1])) ring.pop();
    return ring;
  }

  function setOpenRing(zone, points) {
    const clean = points.map((point) => [Number(point[0]), Number(point[1])]);
    zone.coordinates = [[...clean, [...clean[0]]], ...(zone.coordinates?.slice(1) || [])];
  }

  function samePoint(first, second) {
    return Math.abs(Number(first[0]) - Number(second[0])) < 1e-10
      && Math.abs(Number(first[1]) - Number(second[1])) < 1e-10;
  }

  function zoneById(id) {
    return zones.find((zone) => zone.id === Number(id));
  }

  function selectedZone() {
    return zoneById(selectedId);
  }

  function zonesByPriority() {
    // Explicit priority stays stable when a new contour is resized. Legacy
    // files retain their smaller-first behaviour until a zone is promoted.
    return zones.map((zone) => ({ zone, area: polygonArea(zone.coordinates[0]) }))
      .sort((first, second) => (Number(second.zone.priority) || 0) - (Number(first.zone.priority) || 0) || first.area - second.area)
      .map(({ zone }) => zone);
  }

  function polygonArea(ring) {
    if (ring.length < 3) return 0;
    const [originLat, originLng] = ring[0];
    let twiceArea = 0;
    for (let index = 0; index < ring.length; index++) {
      const current = ring[index];
      const next = ring[(index + 1) % ring.length];
      twiceArea += (current[0] - originLat) * (next[1] - originLng)
        - (next[0] - originLat) * (current[1] - originLng);
    }
    return Math.abs(twiceArea) / 2;
  }

  function toggleZoneVisibility(id) {
    const layer = coverageLayerById.get(id);
    if (hiddenZoneIds.has(id)) {
      hiddenZoneIds.delete(id);
      if (layer && !map.hasLayer(layer)) layer.addTo(map);
    } else {
      hiddenZoneIds.add(id);
      if (layer && map.hasLayer(layer)) map.removeLayer(layer);
    }
    if (selectedId === id && hiddenZoneIds.has(id)) clearSelection();
    updateLayerOrder();
    renderZoneList();
    renderLegend();
    enableSelectedLayer();
  }

  function updateVertex(index, latitude, longitude) {
    const zone = selectedZone();
    if (!zone || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      toast("Введите корректные координаты", true);
      renderVertices();
      return;
    }
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      toast("Координаты находятся вне допустимого диапазона", true);
      renderVertices();
      return;
    }
    const points = openRing(zone);
    points[index] = [latitude, longitude];
    setOpenRing(zone, points);
    updateLayerFromZone(zone);
    markDirty();
  }

  function deleteVertex(index) {
    const zone = selectedZone();
    if (!zone) return;
    const points = openRing(zone);
    if (points.length <= 3) {
      toast("В полигоне должно остаться не менее трёх точек", true);
      return;
    }
    points.splice(index, 1);
    setOpenRing(zone, points);
    updateLayerFromZone(zone);
    renderVertices();
    markDirty();
  }

  function addVertex() {
    const zone = selectedZone();
    if (!zone) {
      toast("Сначала выберите зону", true);
      return;
    }
    const points = openRing(zone);
    let longestIndex = 0;
    let longestDistance = -1;
    points.forEach((point, index) => {
      const next = points[(index + 1) % points.length];
      const distance = ((point[0] - next[0]) ** 2) + ((point[1] - next[1]) ** 2);
      if (distance > longestDistance) {
        longestDistance = distance;
        longestIndex = index;
      }
    });
    const first = points[longestIndex];
    const second = points[(longestIndex + 1) % points.length];
    points.splice(longestIndex + 1, 0, [
      (first[0] + second[0]) / 2,
      (first[1] + second[1]) / 2,
    ]);
    setOpenRing(zone, points);
    updateLayerFromZone(zone);
    renderVertices();
    markDirty();
    toast("Точка добавлена на самый длинный участок контура");
  }

  function handlePolygonCreated(event) {
    if (event.shape !== "Polygon") return;
    const latLngGroups = event.layer.getLatLngs();
    const latLngs = latLngGroups[0] || [];
    map.removeLayer(event.layer);
    if (latLngs.length < 3) return;

    const nextId = Math.max(0, ...zones.map((zone) => zone.id)) + 1;
    const previousPrice = Math.max(0, ...zones.map((zone) => Number(zone.price) || 0));
    const zone = {
      id: nextId,
      name: `Новая зона ${nextId}`,
      price: previousPrice + 100,
      minOrder: 3000,
      coordinates: [[]],
      color: PALETTE[(nextId - 1) % PALETTE.length],
      opacity: 0.2,
      priority: Math.max(0, ...zones.map((item) => Number(item.priority) || 0)) + 1,
    };
    setOpenRing(zone, latLngs.map((point) => [point.lat, point.lng]));
    zones.unshift(zone);
    selectedId = zone.id;
    markDirty();
    renderAll();
    setTool("select");
    toast("Новая зона вытесняет пересечения. Задайте название и тариф.");
  }

  function deleteSelectedZone() {
    const zone = selectedZone();
    if (!zone) return;
    const confirmed = window.confirm(`Удалить «${zone.name}»? Вырезы в остальных зонах восстановятся. Это изменит только локальный черновик.`);
    if (!confirmed) return;
    zones = zones.filter((item) => item.id !== zone.id);
    hiddenZoneIds.delete(zone.id);
    selectedId = zones[0]?.id ?? null;
    markDirty();
    renderAll();
    toast(`Зона «${zone.name}» удалена`);
  }

  function setZoneColor(color) {
    const zone = selectedZone();
    if (!zone) return;
    zone.color = color.toLowerCase();
    elements.zoneColorDot.style.background = zone.color;
    elements.zoneColorInput.value = zone.color;
    updateLayerFromZone(zone);
    renderColorSwatches();
    renderZoneList();
    renderLegend();
    markDirty();
  }

  function bindForm() {
    elements.zoneName.addEventListener("input", () => {
      const zone = selectedZone();
      if (!zone) return;
      zone.name = elements.zoneName.value;
      elements.inspectorTitle.textContent = zone.name || "Без названия";
      renderZoneList();
      renderLegend();
      markDirty();
    });

    elements.zonePrice.addEventListener("change", () => updateNumericField("price", elements.zonePrice, 0));
    elements.zoneMinOrder.addEventListener("change", () => updateNumericField("minOrder", elements.zoneMinOrder, 0));
    elements.zoneOpacity.addEventListener("input", () => {
      const zone = selectedZone();
      if (!zone) return;
      zone.opacity = Number(elements.zoneOpacity.value);
      elements.zoneOpacityValue.textContent = `${Math.round(zone.opacity * 100)}%`;
      updateLayerFromZone(zone);
      markDirty();
    });
    elements.zoneColorInput.addEventListener("input", () => setZoneColor(elements.zoneColorInput.value));
  }

  function updateNumericField(field, input, minimum) {
    const zone = selectedZone();
    if (!zone) return;
    const value = Number(input.value);
    if (!Number.isFinite(value) || value < minimum) {
      input.value = zone[field];
      toast("Введите неотрицательное число", true);
      return;
    }
    zone[field] = value;
    renderZoneList();
    renderLegend();
    markDirty();
  }

  function bindActions() {
    elements.saveButton.addEventListener("click", saveZones);
    elements.revertButton.addEventListener("click", revertChanges);
    elements.importButton.addEventListener("click", () => elements.importInput.click());
    elements.importInput.addEventListener("change", importGeoJson);
    elements.importDialogClose.addEventListener("click", closeImportSelection);
    elements.importCancelButton.addEventListener("click", closeImportSelection);
    elements.importConfirmButton.addEventListener("click", confirmImportSelection);
    elements.importSelectAll.addEventListener("click", () => setAllImportSelections(true));
    elements.importClearAll.addEventListener("click", () => setAllImportSelections(false));
    elements.importDialog.addEventListener("close", () => { pendingImport = null; });
    elements.importDialog.addEventListener("click", (event) => {
      if (event.target === elements.importDialog) closeImportSelection();
    });
    elements.exportButton.addEventListener("click", exportGeoJson);
    elements.addZoneButton.addEventListener("click", () => setTool("draw"));
    elements.addPointButton.addEventListener("click", addVertex);
    elements.deleteZoneButton.addEventListener("click", deleteSelectedZone);
    elements.closeInspectorButton.addEventListener("click", clearSelection);
    elements.raiseZoneButton.addEventListener("click", raiseSelectedZone);
    elements.checkAddressButton.addEventListener("click", openAddressSearch);
    elements.closeSearchButton.addEventListener("click", closeAddressSearch);
    elements.focusAllButton.addEventListener("click", fitAllZones);
    elements.mobileZoneToggle.addEventListener("click", toggleMobileZones);
    elements.mobileZonesButton.addEventListener("click", toggleMobileZones);
    elements.legendCollapse.addEventListener("click", () => elements.mapLegend.classList.toggle("is-open"));

    document.querySelectorAll(".map-tool").forEach((button) => {
      button.addEventListener("click", () => {
        const tool = button.dataset.tool;
        if (tool === "add-point") {
          addVertex();
          setTool("select");
        } else {
          setTool(tool);
        }
      });
    });

    elements.mapSearch.addEventListener("submit", searchAddress);
    window.addEventListener("beforeunload", (event) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    });
    document.addEventListener("keydown", (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        if (dirty) saveZones();
      }
      if (event.key === "Escape") {
        if (!elements.mapSearch.hidden) closeAddressSearch();
        else if (activeTool === "draw") setTool("select");
      }
    });
  }

  function toggleMobileZones() {
    elements.zonesPanel.classList.toggle("is-open");
  }

  function setTool(tool) {
    if (activeTool === "draw" && map.pm) map.pm.disableDraw();
    activeTool = tool;
    enableSelectedLayer();
    document.querySelectorAll(".map-tool").forEach((button) => {
      const active = button.dataset.tool === tool;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    elements.mapHint.hidden = true;
    map.getContainer().style.cursor = tool === "check" ? "crosshair" : "";

    if (tool === "draw") {
      if (!map.pm) {
        toast("Инструмент рисования не загрузился", true);
        return setTool("select");
      }
      map.pm.enableDraw("Polygon", { finishOn: "dblclick", allowSelfIntersection: false });
      elements.mapHint.textContent = "Новая зона вытеснит пересечения. Двойной щелчок — завершить.";
      elements.mapHint.hidden = false;
    } else if (tool === "check") {
      openAddressSearch();
      elements.mapHint.textContent = "Введите адрес или нажмите на нужную точку карты.";
      elements.mapHint.hidden = false;
    }
  }

  function openAddressSearch() {
    elements.mapSearch.hidden = false;
    elements.addressInput.focus();
    if (activeTool !== "check") setTool("check");
  }

  function closeAddressSearch() {
    elements.mapSearch.hidden = true;
    elements.searchResults.hidden = true;
    if (activeTool === "check") setTool("select");
  }

  async function searchAddress(event) {
    event.preventDefault();
    const query = elements.addressInput.value.trim();
    if (!query) return;

    const coordinates = parseCoordinates(query);
    if (coordinates) {
      checkPoint(coordinates[0], coordinates[1], "Указанные координаты");
      closeAddressSearch();
      return;
    }

    elements.searchResults.hidden = false;
    elements.searchResults.innerHTML = '<div class="search-message">Ищем адрес…</div>';
    try {
      const response = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Поиск не выполнен");
      renderSearchResults(payload.results);
    } catch (error) {
      elements.searchResults.innerHTML = `<div class="search-message">${escapeHtml(error.message)}</div>`;
    }
  }

  function renderSearchResults(results) {
    elements.searchResults.replaceChildren();
    if (!results.length) {
      elements.searchResults.innerHTML = '<div class="search-message">Ничего не найдено. Уточните город и улицу.</div>';
      return;
    }
    results.forEach((result) => {
      const button = document.createElement("button");
      button.className = "search-result";
      button.type = "button";
      button.innerHTML = '<svg><use href="#icon-location"/></svg><span></span>';
      button.querySelector("span").textContent = result.label;
      button.addEventListener("click", () => {
        checkPoint(Number(result.lat), Number(result.lng), result.label);
        closeAddressSearch();
      });
      elements.searchResults.appendChild(button);
    });
  }

  function parseCoordinates(value) {
    const match = value.match(/^\s*(-?\d{1,2}(?:[.,]\d+)?)\s*[,;\s]\s*(-?\d{1,3}(?:[.,]\d+)?)\s*$/);
    if (!match) return null;
    const latitude = Number(match[1].replace(",", "."));
    const longitude = Number(match[2].replace(",", "."));
    return latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180
      ? [latitude, longitude]
      : null;
  }

  function checkPoint(latitude, longitude, label) {
    checkedPoint = { latitude, longitude };
    if (addressMarker) map.removeLayer(addressMarker);
    const icon = L.divIcon({
      className: "",
      html: '<div class="address-pin"><svg viewBox="0 0 24 24"><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg></div>',
      iconSize: [32, 32],
      iconAnchor: [16, 30],
    });
    addressMarker = L.marker([latitude, longitude], { icon, zIndexOffset: 1000 }).addTo(map);
    addressMarker.bindTooltip(label, { direction: "top", offset: [0, -23] }).openTooltip();
    map.flyTo([latitude, longitude], Math.max(map.getZoom(), 14), { duration: 0.6 });

    const zone = renderCheckedPoint();
    toast(zone ? `Адрес входит в «${zone.name}»` : "Адрес находится вне зон доставки", !zone);
  }

  function renderCheckedPoint() {
    if (!checkedPoint) return null;
    const { latitude, longitude } = checkedPoint;
    const zone = zonesByPriority().find((candidate) => pointInPolygon(latitude, longitude, candidate.coordinates[0])
      && !candidate.coordinates.slice(1).some((ring) => pointInPolygon(latitude, longitude, ring)));
    const message = zone
      ? `<strong>${escapeHtml(zone.name)}</strong>${zone.price === 0 ? "Доставка бесплатная" : `Доставка ${money.format(zone.price)} ₽`} · заказ от ${money.format(zone.minOrder)} ₽`
      : "<strong>Вне зон доставки</strong>Эта точка не входит ни в один сохранённый полигон.";
    elements.addressResult.innerHTML = message;
    elements.addressResult.hidden = false;
    return zone;
  }

  function pointInPolygon(latitude, longitude, ring) {
    let inside = false;
    for (let current = 0, previous = ring.length - 1; current < ring.length; previous = current++) {
      const currentLat = Number(ring[current][0]);
      const currentLng = Number(ring[current][1]);
      const previousLat = Number(ring[previous][0]);
      const previousLng = Number(ring[previous][1]);
      const intersects = ((currentLat > latitude) !== (previousLat > latitude))
        && (longitude < ((previousLng - currentLng) * (latitude - currentLat)) / (previousLat - currentLat) + currentLng);
      if (intersects) inside = !inside;
    }
    return inside;
  }

  async function saveZones() {
    if (!dirty) return;
    const unnamed = zones.find((zone) => !zone.name.trim());
    if (unnamed) {
      selectZone(unnamed.id);
      elements.zoneName.focus();
      toast("У каждой зоны должно быть название", true);
      return;
    }
    setStatus("saving");
    elements.saveButton.disabled = true;
    try {
      const response = await fetch("/api/zones", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ zones: zonesByPriority() }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Не удалось сохранить зоны");
      zones = clone(payload.zones);
      savedZones = clone(payload.zones);
      savedAt = payload.savedAt;
      dirty = false;
      renderAll();
      setStatus("saved");
      scheduleCoverage();
      toast("Локальный черновик GeoJSON сохранён");
    } catch (error) {
      setStatus("error", error.message);
      elements.saveButton.disabled = false;
      toast(error.message, true);
    }
  }

  function revertChanges() {
    if (!dirty) return;
    zones = clone(savedZones);
    if (!zoneById(selectedId)) selectedId = zones[0]?.id ?? null;
    dirty = false;
    renderAll();
    setStatus("saved");
    renderCheckedPoint();
    scheduleCoverage();
    toast("Несохранённые изменения отменены");
  }

  function markDirty() {
    dirty = true;
    setStatus("dirty");
    renderCheckedPoint();
    scheduleCoverage();
  }

  function setStatus(status, detail = "") {
    elements.saveState.classList.remove("is-saved", "is-dirty", "is-saving");
    if (status === "saved") {
      elements.saveState.classList.add("is-saved");
      elements.saveStateTitle.textContent = "Черновик сохранён";
      elements.saveStateTime.textContent = savedAt ? `Локальный файл · ${formatTime(savedAt)}` : "Локальный файл готов";
      elements.saveButton.disabled = true;
      elements.revertButton.disabled = true;
    } else if (status === "dirty") {
      elements.saveState.classList.add("is-dirty");
      elements.saveStateTitle.textContent = "Черновик изменён";
      elements.saveStateTime.textContent = "Сохраните или экспортируйте GeoJSON";
      elements.saveButton.disabled = false;
      elements.revertButton.disabled = false;
    } else if (status === "saving") {
      elements.saveState.classList.add("is-saving");
      elements.saveStateTitle.textContent = "Сохранение…";
      elements.saveStateTime.textContent = "Создаём локальную резервную копию";
    } else if (status === "loading") {
      elements.saveStateTitle.textContent = "Загрузка…";
      elements.saveStateTime.textContent = "Читаем текущие зоны";
    } else if (status === "error") {
      elements.saveState.classList.add("is-dirty");
      elements.saveStateTitle.textContent = "Ошибка";
      elements.saveStateTime.textContent = detail;
    }
  }

  function formatTime(value) {
    const date = new Date(value);
    return Number.isNaN(date.valueOf())
      ? "недавно"
      : date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  }

  function fitAllZones() {
    const visibleLayers = [...layerById.entries()]
      .filter(([id]) => !hiddenZoneIds.has(id))
      .map(([, layer]) => layer);
    if (!visibleLayers.length) {
      map.setView(DEFAULT_CENTER, 11);
      return;
    }
    const group = L.featureGroup(visibleLayers);
    map.fitBounds(group.getBounds(), { padding: [45, 45], maxZoom: 14 });
  }

  function zonesToGeoJson() {
    // Editable source backup. Downloads use the resolved /api/coverage GeoJSON.
    return {
      type: "FeatureCollection",
      name: "delivery-zones",
      features: zonesByPriority().map((zone) => ({
        type: "Feature",
        id: zone.id,
        properties: {
          id: zone.id,
          name: zone.name,
          price: Number(zone.price),
          minOrder: Number(zone.minOrder),
          color: zone.color,
          opacity: Number(zone.opacity),
          ...(zone.priority != null ? { priority: Number(zone.priority) } : {}),
        },
        geometry: {
          type: "Polygon",
          coordinates: zone.coordinates.map((ring) => ring.map(([latitude, longitude]) => [longitude, latitude])),
        },
      })),
    };
  }

  function plainText(value) {
    const container = document.createElement("div");
    container.innerHTML = String(value ?? "");
    return (container.textContent || "").replace(/\s+/g, " ").trim();
  }

  function zonesFromGeoJson(documentValue) {
    if (documentValue?.deliveryZoneEditor?.version === 1 && documentValue.deliveryZoneEditor.sources) {
      documentValue = documentValue.deliveryZoneEditor.sources;
    }
    if (!documentValue || documentValue.type !== "FeatureCollection" || !Array.isArray(documentValue.features)) {
      throw new Error("Нужен GeoJSON-файл типа FeatureCollection");
    }
    if (!documentValue.features.length) throw new Error("В GeoJSON нет полигонов");

    const usedIds = new Set();
    const polygonFeatures = documentValue.features
      .map((feature, index) => ({ feature, index }))
      .filter(({ feature }) => feature?.geometry?.type === "Polygon");
    const skipped = documentValue.features.length - polygonFeatures.length;
    if (!polygonFeatures.length) throw new Error("В GeoJSON нет полигонов");

    const importedZones = polygonFeatures.map(({ feature, index }) => {
      const geoRings = feature.geometry.coordinates;
      if (!Array.isArray(geoRings) || !geoRings.length || geoRings.some((ring) => !Array.isArray(ring) || ring.length < 4)) {
        throw new Error(`Объект ${index + 1}: полигону нужны минимум три точки`);
      }
      const properties = feature.properties || {};
      const options = feature.options || {};
      let id = Number(properties.id ?? feature.id ?? index + 1);
      if (!Number.isInteger(id) || id < 1 || usedIds.has(id)) {
        id = 1;
        while (usedIds.has(id)) id += 1;
      }
      usedIds.add(id);
      const rings = geoRings.map((geoRing) => geoRing.map((point, pointIndex) => {
        const longitude = Number(point?.[0]);
        const latitude = Number(point?.[1]);
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)
          || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
          throw new Error(`Объект ${index + 1}, точка ${pointIndex + 1}: неверные координаты`);
        }
        return [latitude, longitude];
      }));
      if (rings.some((points) => new Set(points.map((point) => point.join(","))).size < 3)) {
        throw new Error(`Объект ${index + 1}: полигону нужны три разные точки`);
      }
      const rawColor = properties.color || options.fillColor || options.strokeColor;
      const color = /^#[0-9a-f]{6}$/i.test(rawColor) ? rawColor.toLowerCase() : PALETTE[index % PALETTE.length];
      const opacity = Number(properties.opacity ?? options.fillOpacity);
      const yandexName = properties.name || properties.description
        || properties.balloonContentHeader || properties.hintContent;
      const zone = {
        id,
        name: plainText(yandexName || `Зона ${index + 1}`).slice(0, 80),
        price: Math.max(0, Number(properties.price) || 0),
        minOrder: Math.max(0, Number(properties.minOrder ?? properties.min_order) || 0),
        color,
        opacity: Number.isFinite(opacity) ? Math.min(0.55, Math.max(0.05, opacity)) : 0.2,
        coordinates: rings.map((points) => samePoint(points[0], points[points.length - 1]) ? points : [...points, [...points[0]]]),
        ...(Number.isInteger(properties.priority) && properties.priority >= 0 ? { priority: properties.priority } : {}),
      };
      return zone;
    });
    return { zones: importedZones, skipped, source: "GeoJSON" };
  }

  function vendorPoint(point, zoneIndex, pointIndex) {
    const latitude = Number(point?.lt ?? point?.lat ?? point?.latitude);
    const longitude = Number(point?.lg ?? point?.lng ?? point?.lon ?? point?.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)
      || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      throw new Error(`Зона ${zoneIndex + 1}, точка ${pointIndex + 1}: неверные координаты Vendor`);
    }
    return [latitude, longitude];
  }

  function hasVendorCoordinates(value) {
    return Array.isArray(value?.coordinates)
      && value.coordinates.length >= 3
      && value.coordinates.every((point) => point && typeof point === "object"
        && !Array.isArray(point)
        && ("lt" in point || "lat" in point || "latitude" in point)
        && ("lg" in point || "lng" in point || "lon" in point || "longitude" in point));
  }

  function findVendorZones(value, depth = 0) {
    if (depth > 6 || value == null) return null;
    if (Array.isArray(value)) {
      const candidates = value.filter(hasVendorCoordinates);
      if (candidates.length) return candidates;
      for (const item of value) {
        const nested = findVendorZones(item, depth + 1);
        if (nested) return nested;
      }
      return null;
    }
    if (typeof value === "object") {
      for (const child of Object.values(value)) {
        const nested = findVendorZones(child, depth + 1);
        if (nested) return nested;
      }
    }
    return null;
  }

  function zonesFromVendor(documentValue) {
    const vendorZones = findVendorZones(documentValue);
    if (!vendorZones?.length) {
      throw new Error("Не нашёл ни GeoJSON-полигонов, ни зон Vendor с координатами lt/lg");
    }
    const usedIds = new Set();
    const importedZones = vendorZones.map((vendorZone, index) => {
      const meta = vendorZone.meta || {};
      let id = Number(vendorZone.id ?? meta.zoneId ?? index + 1);
      if (!Number.isInteger(id) || id < 1 || usedIds.has(id)) {
        id = 1;
        while (usedIds.has(id)) id += 1;
      }
      usedIds.add(id);
      const points = vendorZone.coordinates.map((point, pointIndex) => vendorPoint(point, index, pointIndex));
      if (points.length > 1 && samePoint(points[0], points[points.length - 1])) points.pop();
      if (new Set(points.map((point) => point.join(","))).size < 3) {
        throw new Error(`Зона ${index + 1}: полигону нужны три разные точки`);
      }
      const threshold = meta.thresholds?.[0] || vendorZone.thresholds?.[0] || {};
      const rawColor = vendorZone.color || meta.color;
      const rawOpacity = Number(vendorZone.opacity ?? meta.opacity);
      const zone = {
        id,
        name: plainText(vendorZone.name || vendorZone.title || meta.name || meta.zoneId || `Зона ${index + 1}`).slice(0, 80),
        price: Math.max(0, Number(threshold.deliveryCost?.value ?? vendorZone.price) || 0),
        minOrder: Math.max(0, Number(threshold.orderCost?.value ?? vendorZone.minOrder) || 0),
        color: /^#[0-9a-f]{6}$/i.test(rawColor) ? rawColor.toLowerCase() : PALETTE[index % PALETTE.length],
        opacity: Number.isFinite(rawOpacity) ? Math.min(0.55, Math.max(0.05, rawOpacity)) : 0.2,
        coordinates: [[]],
      };
      setOpenRing(zone, points);
      return zone;
    });
    return { zones: importedZones, skipped: 0, source: "Яндекс Vendor" };
  }

  function zonesFromDocument(documentValue) {
    if (documentValue?.type === "FeatureCollection") return zonesFromGeoJson(documentValue);
    return zonesFromVendor(documentValue);
  }

  function openImportSelection(imported, fileName) {
    pendingImport = imported;
    elements.importFileName.textContent = fileName;
    const skippedText = imported.skipped ? ` · пропущено объектов: ${imported.skipped}` : "";
    elements.importFileDetails.textContent = `${imported.source} · найдено зон: ${imported.zones.length}${skippedText}`;
    elements.importZoneList.replaceChildren();

    const template = document.getElementById("import-zone-template");
    imported.zones.forEach((zone, index) => {
      const fragment = template.content.cloneNode(true);
      const option = fragment.querySelector(".import-zone-option");
      const checkbox = fragment.querySelector(".import-zone-checkbox");
      checkbox.dataset.importIndex = String(index);
      checkbox.addEventListener("change", updateImportSelectionState);
      fragment.querySelector(".import-zone-swatch").style.background = zone.color;
      fragment.querySelector(".import-zone-copy strong").textContent = zone.name;
      fragment.querySelector(".import-zone-copy small").textContent = zone.price === 0
        ? `Бесплатно · от ${money.format(zone.minOrder)} ₽ · ${openRing(zone).length} точек`
        : `${money.format(zone.price)} ₽ · от ${money.format(zone.minOrder)} ₽ · ${openRing(zone).length} точек`;
      option.dataset.importIndex = String(index);
      elements.importZoneList.appendChild(fragment);
    });

    updateImportSelectionState();
    elements.importDialog.showModal();
    elements.importZoneList.querySelector("input")?.focus();
  }

  function importCheckboxes() {
    return [...elements.importZoneList.querySelectorAll(".import-zone-checkbox")];
  }

  function updateImportSelectionState() {
    const checkboxes = importCheckboxes();
    const selectedCount = checkboxes.filter((checkbox) => checkbox.checked).length;
    elements.importSelectedCount.textContent = `${selectedCount} из ${checkboxes.length} выбрано`;
    elements.importConfirmButton.disabled = selectedCount === 0;
    elements.importConfirmButton.querySelector("span").textContent = selectedCount
      ? `Импортировать: ${selectedCount}`
      : "Выберите зоны";
  }

  function setAllImportSelections(checked) {
    importCheckboxes().forEach((checkbox) => { checkbox.checked = checked; });
    updateImportSelectionState();
  }

  function closeImportSelection() {
    if (elements.importDialog.open) elements.importDialog.close();
    pendingImport = null;
  }

  function confirmImportSelection() {
    if (!pendingImport) return;
    const selectedZones = importCheckboxes()
      .filter((checkbox) => checkbox.checked)
      .map((checkbox) => pendingImport.zones[Number(checkbox.dataset.importIndex)]);
    if (!selectedZones.length) return;

    const imported = pendingImport;
    zones = clone(selectedZones);
    selectedId = zones[zones.length - 1].id;
    hiddenZoneIds.clear();
    markDirty();
    renderAll({ fit: true });
    closeImportSelection();
    const skippedText = imported.skipped ? `, пропущено объектов: ${imported.skipped}` : "";
    toast(`Импортировано из ${imported.source}: ${zones.length}${skippedText}`);
  }

  async function importGeoJson(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      const imported = zonesFromDocument(parsed);
      openImportSelection(imported, file.name);
    } catch (error) {
      toast(`Не удалось импортировать файл: ${error.message}`, true);
    }
  }

  async function exportGeoJson() {
    if (!zones.length) {
      toast("Добавьте хотя бы одну зону перед экспортом", true);
      return;
    }
    const unnamed = zones.find((zone) => !zone.name.trim());
    if (unnamed) {
      selectZone(unnamed.id);
      toast("У каждой зоны должно быть название", true);
      return;
    }
    const result = await refreshCoverage();
    if (!result) {
      toast("Не удалось подготовить вырезы. Проверьте контуры и повторите экспорт.", true);
      return;
    }
    const contents = `${JSON.stringify(result.geojson, null, 2)}\n`;
    const blob = new Blob([contents], { type: "application/geo+json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `delivery-zones-cutouts-${new Date().toISOString().slice(0, 10)}.geojson`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast(`Скачан один GeoJSON с вырезами: зон ${result.summary.zoneCount}, контуров ${result.summary.polygonCount}.`);
  }

  function toast(message, isError = false) {
    const item = document.createElement("div");
    item.className = `toast${isError ? " is-error" : ""}`;
    item.innerHTML = `<svg><use href="#icon-${isError ? "close" : "check"}"/></svg><span></span>`;
    item.querySelector("span").textContent = message;
    elements.toastRegion.appendChild(item);
    window.setTimeout(() => item.remove(), 4200);
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  async function start() {
    cacheElements();
    bindForm();
    bindActions();
    initMap();
    await loadZones();
    document.documentElement.classList.remove("editor-failed");
    document.documentElement.classList.add("editor-ready");
  }

  document.addEventListener("DOMContentLoaded", () => {
    start().catch((error) => {
      console.error(error);
      document.documentElement.classList.add("editor-failed");
      const bootTitle = document.getElementById("boot-title");
      const bootDetail = document.getElementById("boot-detail");
      if (bootTitle) bootTitle.textContent = "Редактор не запустился";
      if (bootDetail) bootDetail.textContent = error.message;
    });
  });
})();
