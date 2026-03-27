import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

import { env } from "../config/env";

function requireAdminAuth(request: Request, response: Response, next: NextFunction) {
  const authorizationHeader = request.headers.authorization;

  if (!authorizationHeader || !authorizationHeader.startsWith("Bearer ")) {
    return response.status(401).json({
      success: false,
      data: null,
      error: "UNAUTHORIZED",
      message: "Authorization token is required.",
    });
  }

  const token = authorizationHeader.replace("Bearer ", "").trim();

  try {
    jwt.verify(token, env.jwtSecret);
    return next();
  } catch (error) {
    return response.status(401).json({
      success: false,
      data: null,
      error: "UNAUTHORIZED",
      message: "Invalid or expired token.",
    });
  }
}

export { requireAdminAuth };
