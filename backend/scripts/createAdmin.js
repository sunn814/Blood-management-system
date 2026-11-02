// Usage:  npm run create-admin -- "Admin Name" admin@example.com StrongPassword123
// Creates an admin account (or promotes an existing user to admin).
require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");

(async () => {
  const [name, email, password] = process.argv.slice(2);
  if (!name || !email || !password) {
    console.log('Usage: npm run create-admin -- "Name" email password');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGO_URI);
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    existing.role = "admin";
    await existing.save();
    console.log(`Existing user ${email} promoted to admin`);
  } else {
    await User.create({ name, email, password, role: "admin" });
    console.log(`Admin ${email} created`);
  }
  await mongoose.disconnect();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
