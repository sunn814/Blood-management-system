// Tests the register controller with the database replaced by stubs
// (no MongoDB needed), mainly to prove nobody can self-register as admin.
const test = require("node:test");
const assert = require("node:assert/strict");

process.env.JWT_SECRET = "test-secret";
const User = require("../models/User");
const { register } = require("../controllers/authController");

const makeRes = () => {
  const res = { statusCode: 200, body: null };
  res.status = (c) => ((res.statusCode = c), res);
  res.json = (b) => ((res.body = b), res);
  return res;
};

const stubUser = () => {
  const created = [];
  User.findOne = async () => null;
  User.create = async (data) => {
    created.push(data);
    return { _id: "u1", ...data };
  };
  return created;
};

const body = { name: "Mallory", email: "Mallory@Example.com ", password: "secret123" };

test("register ignores role=admin and creates a donor", async () => {
  const created = stubUser();
  const res = makeRes();
  await register({ body: { ...body, role: "admin" } }, res);
  assert.equal(res.statusCode, 201);
  assert.equal(created[0].role, "donor");
  assert.equal(res.body.user.role, "donor");
});

test("register allows the hospital role", async () => {
  const created = stubUser();
  await register({ body: { ...body, role: "hospital" } }, makeRes());
  assert.equal(created[0].role, "hospital");
});

test("register normalises the email", async () => {
  const created = stubUser();
  await register({ body: body }, makeRes());
  assert.equal(created[0].email, "mallory@example.com");
});

test("register rejects short passwords and object (NoSQL injection) emails", async () => {
  stubUser();
  let res = makeRes();
  await register({ body: { ...body, password: "123" } }, res);
  assert.equal(res.statusCode, 400);
  res = makeRes();
  await register({ body: { ...body, email: { $ne: null } } }, res);
  assert.equal(res.statusCode, 400);
});
