const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');

// Run the real editor in a private test scope without starting its browser UI.
const source = readFileSync(join(__dirname, '../static/editor.js'), 'utf8')
  .replace(/^\(\(\) => \{/, '')
  .replace(/\}\)\(\);\s*$/, '');

function rectangle(id, price, minOrder, south, west, north, east) {
  return {
    id, name: `Zone ${id}`, price, minOrder, color: '#22c55e', opacity: 0.2,
    coordinates: [[[south, west], [north, west], [north, east], [south, east], [south, west]]],
  };
}

const outer = rectangle(1, 300, 2000, 56, 37, 57, 38);
const inner = rectangle(2, 600, 3500, 56.2, 37.2, 56.4, 37.4);

function editorWith(zones) {
  const context = vm.createContext({
    Intl, console,
    document: { addEventListener() {} },
    window: {},
    L: {
      divIcon: (options) => options,
      marker: () => ({
        addTo() { return this; },
        bindTooltip() { return this; },
        openTooltip() { return this; },
      }),
      polygon: () => ({
        handlers: {},
        on(name, handler) { this.handlers[name] = handler; return this; },
      }),
      DomEvent: { stopPropagation: (event) => { event.stopped = true; } },
    },
  });
  vm.runInContext(source, context);
  vm.runInContext(`
    zones = ${JSON.stringify(zones)};
    map = { removeLayer() {}, getZoom() { return 14; }, flyTo() {} };
    elements.addressResult = { hidden: true, innerHTML: '' };
    toast = () => {};
  `, context);
  return {
    check(latitude, longitude) {
      context.checkPoint(latitude, longitude, 'Test point');
      return vm.runInContext('elements.addressResult.innerHTML', context);
    },
    export() { return JSON.parse(JSON.stringify(context.zonesToGeoJson())); },
    run(code) { return vm.runInContext(code, context); },
    context,
  };
}

test('an expensive nested zone overrides its cheaper parent, regardless of file order', () => {
  for (const zones of [[outer, inner], [inner, outer]]) {
    const editor = editorWith(zones);
    assert.match(editor.check(56.3, 37.3), /Zone 2<\/strong>Доставка 600 ₽/);
    assert.match(editor.check(56.3, 37.3), /3\s500 ₽/);
    assert.match(editor.check(56.8, 37.8), /Zone 1<\/strong>Доставка 300 ₽/);
  }
});

test('a smaller free zone overrides both surrounding paid zones', () => {
  const free = rectangle(3, 0, 1000, 56.25, 37.25, 56.35, 37.35);
  assert.match(editorWith([outer, inner, free]).check(56.3, 37.3), /Zone 3<\/strong>Доставка бесплатная/);
});

test('equal areas keep file order and points outside coverage stay outside', () => {
  const duplicate = { ...outer, id: 4, name: 'Equal zone', price: 900 };
  const editor = editorWith([outer, duplicate]);
  assert.match(editor.check(56.3, 37.3), /Zone 1<\/strong>/);
  assert.match(editor.check(55, 36), /Вне зон доставки/);
});

test('explicit new-zone priority wins even when its contour is larger', () => {
  const promoted = { ...outer, priority: 2 };
  const editor = editorWith([promoted, inner]);
  assert.match(editor.check(56.3, 37.3), /Zone 1<\/strong>/);
  assert.equal(editor.export().features[0].properties.priority, 2);
});

test('editing the exterior preserves imported interior cutouts and point checks respect them', () => {
  const withHole = structuredClone(outer);
  withHole.coordinates.push(inner.coordinates[0]);
  const editor = editorWith([withHole]);
  assert.match(editor.check(56.3, 37.3), /Вне зон доставки/);
  editor.run('setOpenRing(zones[0], openRing(zones[0]));');
  assert.equal(editor.export().features[0].geometry.coordinates.length, 2);
  assert.match(editor.check(56.8, 37.8), /Zone 1<\/strong>/);
});

test('the checked address is recalculated when an overriding zone is removed', () => {
  const editor = editorWith([outer, { ...inner, priority: 1 }]);
  assert.match(editor.check(56.3, 37.3), /Доставка 600 ₽/);
  editor.run('zones = zones.filter((zone) => zone.id !== 2); renderCheckedPoint();');
  assert.match(editor.run('elements.addressResult.innerHTML'), /Доставка 300 ₽/);
});

test('editing one vertex preserves the exact coordinates of untouched vertices and holes', () => {
  const precise = rectangle(1, 300, 2000, 56.123456789, 37.123456789, 56.987654321, 37.987654321);
  precise.coordinates.push(inner.coordinates[0]);
  const expected = structuredClone(precise.coordinates);
  expected[0][1] = [56.9, 37.1];
  const editor = editorWith([precise]);
  editor.run('const edited = openRing(zones[0]); edited[1] = [56.9, 37.1]; setOpenRing(zones[0], edited);');
  assert.deepEqual(JSON.parse(editor.run('JSON.stringify(zones[0].coordinates)')), expected);
  assert.deepEqual(JSON.parse(JSON.stringify(editor.context.vendorPoint({ lt: 56.123456789, lg: 37.123456789 }, 0, 0))), [56.123456789, 37.123456789]);
});

test('the inspector counts every exported contour point except repeated closing points', () => {
  const editor = editorWith([outer]);
  const count = editor.run(`featurePointCount({ features: [
    { geometry: { coordinates: [[[0,0],[1,0],[1,1],[0,0]], [[0.2,0.2],[0.3,0.2],[0.2,0.2]]] } },
    { geometry: { coordinates: [[[2,2],[3,2],[2,3],[2,2]]] } }
  ] })`);
  assert.equal(count, 8);
});

test('reimporting an export restores logical sources and preserves holes and priority', () => {
  const source = { ...structuredClone(outer), priority: 4 };
  source.coordinates.push(inner.coordinates[0]);
  const editor = editorWith([source, inner]);
  editor.run('plainText = (value) => String(value);');
  const sources = editor.export();
  const packaged = {
    type: 'FeatureCollection', features: [],
    deliveryZoneEditor: { version: 1, sources },
  };
  const imported = editor.context.zonesFromGeoJson(packaged);
  assert.equal(imported.zones.length, 2);
  assert.equal(imported.zones[0].priority, 4);
  assert.equal(imported.zones[0].coordinates.length, 2);
  assert.deepEqual(JSON.parse(JSON.stringify(imported.zones[0].coordinates)), source.coordinates);
});

test('GeoJSON puts the nested tariff first and preserves its geometry and conditions', () => {
  const document = editorWith([outer, inner]).export();
  assert.deepEqual(document.features.map((feature) => feature.id), [2, 1]);
  assert.equal(document.features[0].properties.price, 600);
  assert.equal(document.features[0].properties.minOrder, 3500);
  assert.deepEqual(document.features[0].geometry.coordinates[0][0], [37.2, 56.2]);
});

test('saving sends priority order and keeps the nested tariff after reloading the response', async () => {
  const editor = editorWith([outer, inner]);
  let saved;
  editor.context.fetch = async (url, options) => {
    assert.equal(url, '/api/zones');
    assert.equal(options.method, 'PUT');
    saved = JSON.parse(options.body).zones;
    return { ok: true, json: async () => ({ zones: saved, savedAt: '2026-09-03T12:00:00Z' }) };
  };
  editor.run('dirty = true; elements.saveButton = {}; setStatus = () => {}; renderAll = () => {};');
  await editor.context.saveZones();
  assert.deepEqual(saved.map((zone) => zone.id), [2, 1]);
  assert.match(editorWith(saved).check(56.3, 37.3), /Zone 2<\/strong>Доставка 600 ₽/);
});

for (const tool of ['draw', 'check']) {
  test(`polygon clicks reach the map in ${tool} mode without changing the selection`, () => {
    const editor = editorWith([outer, inner]);
    editor.run(`activeTool = '${tool}'; selectedId = 2; selectZone = (id) => { selectedId = id; };`);
    const layer = editor.context.createZoneLayer(outer);
    const event = { latlng: { lat: 56.3, lng: 37.3 } };
    layer.handlers.click(event);
    assert.notEqual(event.stopped, true);
    assert.equal(editor.run('selectedId'), 2);
  });
}

test('polygon clicks still select a zone in select mode', () => {
  const editor = editorWith([outer, inner]);
  editor.run('selectedId = 2; selectZone = (id) => { selectedId = id; };');
  const layer = editor.context.createZoneLayer(outer);
  const event = { latlng: { lat: 56.8, lng: 37.8 } };
  layer.handlers.click(event);
  assert.equal(event.stopped, true);
  assert.equal(editor.run('selectedId'), 1);
});
