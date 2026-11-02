// Security behaviour tests. The database is replaced with stubs, so no MongoDB is needed.
const test = require("node:test");
const assert = require("node:assert/strict");

process.env.JWT_SECRET = "test-secret";
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { register, login } = require("../controllers/authController");
const { protect, authorize, requireApproved } = require("../middleware/auth");
const { isValidPhone, isStrongPassword, maskPhone, isText } = require("../utils/helpers");

const makeRes = () => {
  const res = { statusCode: 200, body: null };
  res.status = (c) => ((res.statusCode = c), res);
  res.json = (b) => ((res.body = b), res);
  return res;
};

const good = { name: "Asha", email: "asha@example.com", password: "secret123" };

test("new hospital accounts start unapproved, donors approved", async () => {
  const created = [];
  User.findOne = async () => null;
  User.create = async (d) => (created.push(d), { _id: "u1", ...d });
  await register({ body: { ...good, role: "hospital" } }, makeRes());
  await register({ body: { ...good, role: "donor" } }, makeRes());
  assert.equal(created[0].approved, false);
  assert.equal(created[1].approved, true);
});

test("weak passwords and bad phone numbers are rejected at signup", async () => {
  User.findOne = async () => null;
  User.create = async (d) => ({ _id: "u1", ...d });
  for (const bad of [{ password: "short1" }, { password: "onlyletters" }, { phone: "abc" }]) {
    const res = makeRes();
    await register({ body: { ...good, ...bad } }, res);
    assert.equal(res.statusCode, 400);
  }
});

test("account locks after 5 wrong passwords and stays locked", async () => {
  let failed = 0;
  let lockUntil = null;
  const user = {
    _id: "u1",
    get failedLogins() { return failed; },
    get lockUntil() { return lockUntil; },
    comparePassword: async () => false,
  };
  User.findOne = async () => user;
  User.findByIdAndUpdate = async () => ({ failedLogins: ++failed });
  User.updateOne = async (_f, u) => {
    if (u.$set.lockUntil) { lockUntil = u.$set.lockUntil; failed = 0; }
  };
  for (let i = 0; i < 5; i++) {
    const res = makeRes();
    await login({ body: { email: "a@b.co", password: "wrong" } }, res);
    assert.equal(res.statusCode, 401);
  }
  const res = makeRes();
  await login({ body: { email: "a@b.co", password: "wrong" } }, res);
  assert.equal(res.statusCode, 429);
});

test("unknown email still gives the same generic error", async () => {
  User.findOne = async () => null;
  const res = makeRes();
  await login({ body: { email: "nobody@x.co", password: "whatever1" } }, res);
  assert.equal(res.statusCode, 401);
  assert.equal(res.body.message, "Invalid email or password");
});

const run = (mw, req) =>
  new Promise((resolve) => {
    const res = makeRes();
    const origJson = res.json;
    res.json = (b) => { origJson(b); resolve({ res, passed: false }); return res; };
    mw(req, res, () => resolve({ res, passed: true }));
  });

test("token for a deleted user is rejected", async () => {
  User.findById = () => ({ select: () => ({ lean: async () => null }) });
  const token = jwt.sign({ id: "gone", role: "admin" }, "test-secret");
  const { res, passed } = await run(protect, { headers: { authorization: `Bearer ${token}` } });
  assert.equal(passed, false);
  assert.equal(res.statusCode, 401);
});

test("role comes from the database, not from the token", async () => {
  User.findById = () => ({ select: () => ({ lean: async () => ({ _id: "u1", role: "donor" }) }) });
  const forged = jwt.sign({ id: "u1", role: "admin" }, "test-secret"); // token claims admin
  const req = { headers: { authorization: `Bearer ${forged}` } };
  const { passed } = await run(protect, req);
  assert.equal(passed, true);
  assert.equal(req.user.role, "donor");
  const { res, passed: adminOk } = await run(authorize("admin"), req);
  assert.equal(adminOk, false);
  assert.equal(res.statusCode, 403);
});

test("a token signed with the 'none' algorithm is rejected", async () => {
  const none = Buffer.from('{"alg":"none","typ":"JWT"}').toString("base64url") + "." +
    Buffer.from('{"id":"u1","role":"admin"}').toString("base64url") + ".";
  const { res, passed } = await run(protect, { headers: { authorization: `Bearer ${none}` } });
  assert.equal(passed, false);
  assert.equal(res.statusCode, 401);
});

test("unapproved hospitals are blocked, approved ones and admins pass", async () => {
  assert.equal((await run(requireApproved, { user: { role: "hospital", approved: false } })).passed, false);
  assert.equal((await run(requireApproved, { user: { role: "hospital", approved: true } })).passed, true);
  assert.equal((await run(requireApproved, { user: { role: "admin", approved: true } })).passed, true);
});

test("input helpers", () => {
  assert.equal(isValidPhone("+91 98765 43210"), true);
  assert.equal(isValidPhone("<script>"), false);
  assert.equal(isStrongPassword("abcdefg1"), true);
  assert.equal(isStrongPassword("12345678"), false);
  assert.equal(isText("x".repeat(81), 80), false);
  assert.equal(maskPhone("98765 43210"), "••••• ••210");
});
