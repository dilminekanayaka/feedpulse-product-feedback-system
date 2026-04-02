import { Request, Response } from "express";
import jwt from "jsonwebtoken";

import { env } from "../config/env";
import { UserModel } from "../models/user.model";
import { verifyPassword } from "../utils/password";

function sanitizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

async function loginAdmin(request: Request, response: Response) {
  try {
    const email = sanitizeText(request.body.email).toLowerCase();
    const password = sanitizeText(request.body.password);

    if (!email || !password) {
      return response.status(400).json({
        success: false,
        data: null,
        error: "VALIDATION_ERROR",
        message: "Email and password are required.",
      });
    }

    const adminUser = await UserModel.findOne({ email, role: "admin", isActive: true });

    if (!adminUser || !verifyPassword(password, adminUser.passwordHash)) {
      return response.status(401).json({
        success: false,
        data: null,
        error: "UNAUTHORIZED",
        message: "Invalid admin credentials.",
      });
    }

    const token = jwt.sign(
      {
        sub: String(adminUser._id),
        email: adminUser.email,
        role: adminUser.role,
      },
      env.jwtSecret,
      { expiresIn: "1d" },
    );

    return response.status(200).json({
      success: true,
      data: {
        token,
        admin: {
          email: adminUser.email,
          role: adminUser.role,
        },
      },
      error: null,
      message: "Login successful.",
    });
  } catch (error) {
    console.error("Failed to log in admin.", error);

    return response.status(500).json({
      success: false,
      data: null,
      error: "INTERNAL_SERVER_ERROR",
      message: "Something went wrong while logging in.",
    });
  }
}

export { loginAdmin };
