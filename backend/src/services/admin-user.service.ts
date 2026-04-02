import { env } from "../config/env";
import { UserModel } from "../models/user.model";
import { hashPassword } from "../utils/password";

async function ensureAdminUser() {
  if (!env.adminEmail || !env.adminPassword) {
    console.warn("Admin bootstrap skipped because ADMIN_EMAIL or ADMIN_PASSWORD is not set.");
    return null;
  }

  const normalizedEmail = env.adminEmail.toLowerCase();
  const existingUser = await UserModel.findOne({ email: normalizedEmail });

  if (existingUser) {
    if (!existingUser.isActive || existingUser.role !== "admin") {
      existingUser.isActive = true;
      existingUser.role = "admin";
      await existingUser.save();
    }

    return existingUser;
  }

  const adminUser = await UserModel.create({
    email: normalizedEmail,
    passwordHash: hashPassword(env.adminPassword),
    role: "admin",
    isActive: true,
  });

  console.log(`Seeded admin user for ${normalizedEmail}`);
  return adminUser;
}

export { ensureAdminUser };
