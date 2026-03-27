import { Request, Response } from "express";
import jwt from "jsonwebtoken";

import { env } from "../config/env";

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

    if (email !== env.adminEmail.toLowerCase() || password !== env.adminPassword) {
      return response.status(401).json({
        success: false,
        data: null,
        error: "UNAUTHORIZED",
        message: "Invalid admin credentials.",
      });
    }

    const token = jwt.sign(
      {
        email: env.adminEmail,
        role: "admin",
      },
      env.jwtSecret,
      { expiresIn: "1d" },
    );

    return response.status(200).json({
      success: true,
      data: {
        token,
        admin: {
          email: env.adminEmail,
          role: "admin",
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
