import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findByEmail: vi.fn(),
  createUser: vi.fn(),
  findById: vi.fn(),
  updateUser: vi.fn(),
  updatePassword: vi.fn(),
  compare: vi.fn(),
  hash: vi.fn(),
  generateToken: vi.fn(),
  loggerError: vi.fn(),
}));

vi.mock("../data/db.js", () => ({
  db: {
    users: {
      findByEmail: mocks.findByEmail,
      create: mocks.createUser,
      findById: mocks.findById,
      update: mocks.updateUser,
      updatePassword: mocks.updatePassword,
    },
  },
}));

vi.mock("bcryptjs", () => ({
  default: {
    compare: mocks.compare,
    hash: mocks.hash,
  },
}));

vi.mock("../middleware/auth.js", async () => {
  const { createMockAuthMiddleware, createMockSuperDuperAdminOnly } = await import("../test/helpers.js");
  return {
    generateToken: mocks.generateToken,
    authMiddleware: createMockAuthMiddleware("admin@example.com"),
    superDuperAdminOnly: createMockSuperDuperAdminOnly(),
  };
});

vi.mock("../lib/logger.js", () => ({
  default: {
    error: mocks.loggerError,
  },
}));

import { authRouter } from "./auth.js";

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/auth", authRouter);
  return app;
}

describe("authRouter", () => {
  it("returns 400 for invalid payload", async () => {
    const app = buildApp();

    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: "not-an-email" });

    expect(response.status).toBe(400);
    expect(response.body.errors).toBeDefined();
  });

  it("returns 401 when user is not found", async () => {
    mocks.findByEmail.mockResolvedValue(null);

    const app = buildApp();
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: "admin@example.com", password: "badpass" });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: "Invalid credentials" });
  });

  it("returns 401 when password comparison fails", async () => {
    mocks.findByEmail.mockResolvedValue({
      id: 1,
      email: "admin@example.com",
      role: "super-duper-admin",
      password_hash: "hashed",
    });
    mocks.compare.mockResolvedValue(false);

    const app = buildApp();
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: "admin@example.com", password: "wrong" });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: "Invalid credentials" });
  });

  it("returns token and user payload for valid credentials", async () => {
    mocks.findByEmail.mockResolvedValue({
      id: 10,
      email: "admin@example.com",
      role: "super-duper-admin",
      password_hash: "hashed",
      first_name: "Ada",
      last_name: "Lovelace",
      created_at: "2026-01-01",
      updated_at: "2026-01-02",
    });
    mocks.compare.mockResolvedValue(true);
    mocks.generateToken.mockReturnValue("token-123");

    const app = buildApp();
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: "admin@example.com", password: "correct" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      token: "token-123",
      user: {
        id: 10,
        email: "admin@example.com",
        role: "super-duper-admin",
        first_name: "Ada",
        last_name: "Lovelace",
        created_at: "2026-01-01",
        updated_at: "2026-01-02",
      },
    });
    expect(mocks.generateToken).toHaveBeenCalledWith({
      id: 10,
      email: "admin@example.com",
      role: "super-duper-admin",
    });
  });

  it("registers a new user", async () => {
    mocks.findByEmail.mockResolvedValue(null);
    mocks.hash.mockResolvedValue("hashed-password");
    mocks.createUser.mockResolvedValue({
      id: 22,
      email: "newuser@example.com",
      role: "user",
      first_name: "New",
      last_name: "User",
      created_at: "2026-01-01",
      updated_at: "2026-01-01",
    });

    const app = buildApp();
    const response = await request(app)
      .post("/api/auth/register")
      .set("x-role", "super-duper-admin")
      .send({
        email: "newuser@example.com",
        password: "password123",
        role: "user",
        first_name: "New",
        last_name: "User",
      });

    expect(response.status).toBe(200);
    expect(mocks.createUser).toHaveBeenCalledWith({
      email: "newuser@example.com",
      password_hash: "hashed-password",
      role: "user",
      first_name: "New",
      last_name: "User",
    });
    expect(response.body.user.email).toBe("newuser@example.com");
  });

  it("blocks register for non-super user", async () => {
    const app = buildApp();
    const response = await request(app)
      .post("/api/auth/register")
      .set("x-role", "user")
      .send({
        email: "newuser@example.com",
        password: "password123",
        role: "user",
      });

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: "Super-duper-admin access required" });
  });

  it("returns 400 on register validation failure", async () => {
    const app = buildApp();
    const response = await request(app)
      .post("/api/auth/register")
      .set("x-role", "super-duper-admin")
      .send({ email: "bad-email" });

    expect(response.status).toBe(400);
    expect(response.body.errors).toBeDefined();
  });

  it("returns 400 when registering existing email", async () => {
    mocks.findByEmail.mockResolvedValue({ id: 1, email: "existing@example.com" });

    const app = buildApp();
    const response = await request(app)
      .post("/api/auth/register")
      .set("x-role", "super-duper-admin")
      .send({
        email: "existing@example.com",
        password: "password123",
        role: "user",
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "User already exists" });
  });

  it("returns 500 when register throws", async () => {
    mocks.findByEmail.mockRejectedValue(new Error("db down"));

    const app = buildApp();
    const response = await request(app)
      .post("/api/auth/register")
      .set("x-role", "super-duper-admin")
      .send({
        email: "newuser@example.com",
        password: "password123",
        role: "user",
      });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "Registration failed" });
  });

  it("changes password when current password is valid", async () => {
    mocks.findById.mockResolvedValue({ id: 7, password_hash: "old-hash" });
    mocks.compare.mockResolvedValue(true);
    mocks.hash.mockResolvedValue("new-hash");
    mocks.updatePassword.mockResolvedValue(undefined);

    const app = buildApp();
    const response = await request(app)
      .patch("/api/auth/password")
      .set("x-user-id", "7")
      .send({ current_password: "old-pass", new_password: "new-password" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: "Password updated successfully" });
    expect(mocks.updatePassword).toHaveBeenCalledWith(7, "new-hash");
  });

  it("returns 400 on password change validation failure", async () => {
    const app = buildApp();
    const response = await request(app)
      .patch("/api/auth/password")
      .set("x-user-id", "7")
      .send({ current_password: "", new_password: "123" });

    expect(response.status).toBe(400);
    expect(response.body.errors).toBeDefined();
  });

  it("returns 404 when changing password for missing user", async () => {
    mocks.findById.mockResolvedValue(null);
    const app = buildApp();
    const response = await request(app)
      .patch("/api/auth/password")
      .set("x-user-id", "7")
      .send({ current_password: "old-pass", new_password: "new-password" });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: "User not found" });
  });

  it("returns 401 when current password is incorrect", async () => {
    mocks.findById.mockResolvedValue({ id: 7, password_hash: "old-hash" });
    mocks.compare.mockResolvedValue(false);

    const app = buildApp();
    const response = await request(app)
      .patch("/api/auth/password")
      .set("x-user-id", "7")
      .send({ current_password: "wrong", new_password: "new-password" });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: "Current password is incorrect" });
  });

  it("returns 500 when change password throws", async () => {
    mocks.findById.mockRejectedValue(new Error("db down"));

    const app = buildApp();
    const response = await request(app)
      .patch("/api/auth/password")
      .set("x-user-id", "7")
      .send({ current_password: "old-pass", new_password: "new-password" });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "Failed to change password" });
  });

  it("updates own profile", async () => {
    mocks.updateUser.mockResolvedValue({
      id: 7,
      email: "admin@example.com",
      role: "super-duper-admin",
      first_name: "Updated",
      last_name: "Name",
      created_at: "2026-01-01",
      updated_at: "2026-01-02",
    });

    const app = buildApp();
    const response = await request(app)
      .patch("/api/auth/me")
      .set("x-user-id", "7")
      .send({ first_name: "Updated", last_name: "Name" });

    expect(response.status).toBe(200);
    expect(mocks.updateUser).toHaveBeenCalledWith(7, {
      first_name: "Updated",
      last_name: "Name",
    });
  });

  it("returns 404 when updating missing profile", async () => {
    mocks.updateUser.mockResolvedValue(null);
    const app = buildApp();
    const response = await request(app)
      .patch("/api/auth/me")
      .set("x-user-id", "7")
      .send({ first_name: "Missing" });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: "User not found" });
  });

  it("returns 500 when updating profile throws", async () => {
    mocks.updateUser.mockRejectedValue(new Error("db down"));
    const app = buildApp();
    const response = await request(app)
      .patch("/api/auth/me")
      .set("x-user-id", "7")
      .send({ first_name: "Updated" });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "Failed to update profile" });
  });

  it("returns 400 on profile update validation failure", async () => {
    const app = buildApp();
    const response = await request(app)
      .patch("/api/auth/me")
      .set("x-user-id", "7")
      .send({ first_name: 123 });

    expect(response.status).toBe(400);
    expect(response.body.errors).toBeDefined();
  });

  it("returns current user", async () => {
    mocks.findById.mockResolvedValue({
      id: 7,
      email: "admin@example.com",
      role: "super-duper-admin",
      first_name: "Ada",
      last_name: "Lovelace",
      created_at: "2026-01-01",
      updated_at: "2026-01-02",
    });

    const app = buildApp();
    const response = await request(app)
      .get("/api/auth/me")
      .set("x-user-id", "7");

    expect(response.status).toBe(200);
    expect(response.body.email).toBe("admin@example.com");
  });

  it("returns 404 when current user is missing", async () => {
    mocks.findById.mockResolvedValue(null);
    const app = buildApp();
    const response = await request(app)
      .get("/api/auth/me")
      .set("x-user-id", "7");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: "User not found" });
  });

  it("returns 500 when getting current user throws", async () => {
    mocks.findById.mockRejectedValue(new Error("db down"));
    const app = buildApp();
    const response = await request(app)
      .get("/api/auth/me")
      .set("x-user-id", "7");

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "Failed to get user" });
  });

  it("returns 500 when login throws", async () => {
    mocks.findByEmail.mockRejectedValue(new Error("db down"));
    const app = buildApp();
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: "admin@example.com", password: "pass" });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "Login failed" });
  });
});
