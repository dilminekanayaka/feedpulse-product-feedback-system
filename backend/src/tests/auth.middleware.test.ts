import type { NextFunction, Request, Response } from "express";

import { requireAdminAuth } from "../middleware/auth.middleware";

describe("auth middleware", () => {
  it("returns 401 when authorization header is missing", () => {
    const request = { headers: {} } as Request;
    const json = jest.fn();
    const response = {
      status: jest.fn().mockReturnValue({ json }),
    } as unknown as Response;
    const next = jest.fn() as NextFunction;

    requireAdminAuth(request, response, next);

    expect(response.status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ error: "UNAUTHORIZED" }),
    );
    expect(next).not.toHaveBeenCalled();
  });
});
