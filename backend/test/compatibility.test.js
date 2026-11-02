const test = require("node:test");
const assert = require("node:assert/strict");
const { BLOOD_GROUPS, canDonateTo, compatibleGroupsFor } = require("../utils/compatibility");
const { toPositiveInt, escapeRegex } = require("../utils/helpers");

test("O- is the universal donor and AB+ the universal recipient", () => {
  assert.equal(canDonateTo("O-").length, 8);
  assert.deepEqual(compatibleGroupsFor("AB+").sort(), [...BLOOD_GROUPS].sort());
});

test("AB+ can only donate to AB+", () => {
  assert.deepEqual(canDonateTo("AB+"), ["AB+"]);
});

test("O- patient can only receive O-", () => {
  assert.deepEqual(compatibleGroupsFor("O-"), ["O-"]);
});

test("A+ patient can receive A+, A-, O+, O-", () => {
  assert.deepEqual(compatibleGroupsFor("A+").sort(), ["A+", "A-", "O+", "O-"]);
});

test("exact match is listed first and O- (universal donor) last", () => {
  const list = compatibleGroupsFor("B+");
  assert.equal(list[0], "B+");
  assert.equal(list[list.length - 1], "O-");
});

test("compatibility is consistent in both directions for every pair", () => {
  for (const donor of BLOOD_GROUPS) {
    for (const patient of BLOOD_GROUPS) {
      assert.equal(canDonateTo(donor).includes(patient), compatibleGroupsFor(patient).includes(donor));
    }
  }
});

test("invalid group gives an empty list", () => {
  assert.deepEqual(compatibleGroupsFor("Z+"), []);
});

test("toPositiveInt accepts only whole positive numbers", () => {
  assert.equal(toPositiveInt("3"), 3);
  assert.equal(toPositiveInt(0), null);
  assert.equal(toPositiveInt(-2), null);
  assert.equal(toPositiveInt(1.5), null);
  assert.equal(toPositiveInt("abc"), null);
});

test("escapeRegex neutralises regex characters", () => {
  assert.equal(new RegExp(escapeRegex("a.*b")).test("axxb"), false);
  assert.equal(new RegExp(escapeRegex("a.*b")).test("a.*b"), true);
});
