import { describe, it, expect, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  verifyMock: vi.fn(),
  signMock: vi.fn(),
  loggerErrorMock: vi.fn(),
}));

vi.mock("jsonwebtoken", () => ({
  default: {
    verify: mocks.verifyMock,
    sign: mocks.signMock,
  },
}));

vi.mock("../lib/logger.js", () => ({
  default: {
    error: mocks.loggerErrorMock,
  },
}));

import {
  adminOnly,
  authMiddleware,
  generateToken,
  superDuperAdminOnly,
  type AuthRequest,
} from "./auth.js";

function makeRes() {
  const json = vi.fn();
  const status = vi.fn(() => ({ json }));
  return { status, json };
}

type MiddlewareResponse = Parameters<typeof authMiddleware>[1];
type MiddlewareNext = Parameters<typeof authMiddleware>[2];

describe("auth middleware", () => {
  it("returns 401 when no bearer token is provided", async () => {
    const req = { headers: {} } as AuthRequest;
    const res = makeRes();
    const next = vi.fn() as unknown as MiddlewareNext;

    await authMiddleware(req, res as unknown as MiddlewareResponse, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "No token provided" });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 when token is invalid", async () => {
    const req = {
      headers: { authorization: "Bearer invalid-token" },
    } as AuthRequest;
    const res = makeRes();
    const next = vi.fn() as unknown as MiddlewareNext;

    mocks.verifyMock.mockImplementation(() => {
      throw new Error("bad token");
    });

    await authMiddleware(req, res as unknown as MiddlewareResponse, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Invalid token" });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 500 when auth middleware hits an unexpected error", async () => {
    const req = {
      headers: {
        get authorization() {
          throw new Error("headers exploded");
        },
      },
    } as unknown as AuthRequest;
    const res = makeRes();
    const next = vi.fn() as unknown as MiddlewareNext;

    await authMiddleware(req, res as unknown as MiddlewareResponse, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Authentication failed" });
    expect(mocks.loggerErrorMock).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it("attaches user and calls next for valid token", async () => {
    const req = {
      headers: { authorization: "Bearer good-token" },
    } as AuthRequest;
    const res = makeRes();
    const next = vi.fn() as unknown as MiddlewareNext;

    mocks.verifyMock.mockReturnValue({
      id: 1,
      email: "admin@example.com",
      role: "super-duper-admin",
    });

    await authMiddleware(req, res as unknown as MiddlewareResponse, next);

    expect(req.user).toEqual({
      id: 1,
      email: "admin@example.com",
      role: "super-duper-admin",
    });
    expect(next).toHaveBeenCalledOnce();
  });

  it("allows user role in adminOnly", () => {
    const req = { user: { id: 1, email: "u@example.com", role: "user" } } as AuthRequest;
    const res = makeRes();
    const next = vi.fn();

    adminOnly(req, res as unknown as MiddlewareResponse, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("blocks request with no authenticated user in adminOnly", () => {
    const req = {} as AuthRequest;
    const res = makeRes();
    const next = vi.fn();

    adminOnly(req, res as unknown as MiddlewareResponse, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: "Admin access required" });
    expect(next).not.toHaveBeenCalled();
  });

  it("allows only super-duper-admin in superDuperAdminOnly", () => {
    const req = {
      user: { id: 1, email: "u@example.com", role: "super-duper-admin" },
    } as AuthRequest;
    const res = makeRes();
    const next = vi.fn();

    superDuperAdminOnly(req, res as unknown as MiddlewareResponse, next);

    expect(next).toHaveBeenCalledOnce();
  });

  it("blocks non-super-duper-admin in superDuperAdminOnly", () => {
    const req = {
      user: { id: 2, email: "u@example.com", role: "user" },
    } as AuthRequest;
    const res = makeRes();
    const next = vi.fn();

    superDuperAdminOnly(req, res as unknown as MiddlewareResponse, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: "Super-duper-admin access required" });
    expect(next).not.toHaveBeenCalled();
  });

  it("generates token with 7 day expiration", () => {
    mocks.signMock.mockReturnValue("signed-token");

    const token = generateToken({
      id: 5,
      email: "admin@example.com",
      role: "super-duper-admin",
    });

    expect(token).toBe("signed-token");
    expect(mocks.signMock).toHaveBeenCalledWith(
      {
        id: 5,
        email: "admin@example.com",
        role: "super-duper-admin",
      },
      expect.any(String),
      { expiresIn: "7d" }
    );
  });
});
