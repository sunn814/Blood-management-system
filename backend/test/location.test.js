const test = require("node:test");
const assert = require("node:assert/strict");
const { parseLatLng, round } = require("../utils/helpers");

test("valid coordinates become a GeoJSON point as [lng, lat]", () => {
  const { point } = parseLatLng({ latitude: "19.2183", longitude: 72.9781 });
  assert.deepEqual(point, { type: "Point", coordinates: [72.9781, 19.2183] });
});

test("no coordinates means no location (not an error)", () => {
  assert.deepEqual(parseLatLng({}), { point: null });
  assert.deepEqual(parseLatLng({ latitude: "", longitude: "" }), { point: null });
});

test("only one coordinate, text or out-of-range values are rejected", () => {
  assert.ok(parseLatLng({ latitude: 19 }).error);
  assert.ok(parseLatLng({ latitude: "abc", longitude: 72 }).error);
  assert.ok(parseLatLng({ latitude: 91, longitude: 72 }).error);
  assert.ok(parseLatLng({ latitude: 19, longitude: 181 }).error);
});

test("round() limits precision (used to blur donor pins)", () => {
  assert.equal(round(19.218345, 2), 19.22);
});
