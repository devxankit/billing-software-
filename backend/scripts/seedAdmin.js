const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config({ path: require('path').resolve(__dirname, '../.env') });

const Admin = require("../models/Admin");
const { hashPassword } = require("../src/utils/password");

async function main() {
  const email = "panchalajay717@gmail.com".trim().toLowerCase();
  const password = process.env.ADMIN_SEED_PASSWORD;
  if (!password) {
    console.error("Set ADMIN_SEED_PASSWORD in backend/.env before running this script.");
    process.exit(1);
  }
  const defaultOtp = "123456";

  if (!process.env.MONGO_URI) {
    throw new Error("Missing env: MONGO_URI");
  }

  await mongoose.connect(process.env.MONGO_URI);

  const h = hashPassword(password);

  const admin = await Admin.findOneAndUpdate(
    { email },
    {
      $set: {
        email,
        role: "admin",
        defaultOtp,
        disabled: false,
        passwordSalt: h.salt,
        passwordHash: h.hash,
        passwordIterations: h.iterations,
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { new: true, upsert: true }
  );

  console.log("Admin upserted:", { id: String(admin._id), email: admin.email, defaultOtp: admin.defaultOtp });
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

