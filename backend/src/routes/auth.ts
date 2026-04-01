import { Router, Request, Response } from "express";
import { body, validationResult } from "express-validator";
import bcrypt from "bcryptjs";
import logger from "../lib/logger.js";
import {
  generateToken,
  authMiddleware,
  superDuperAdminOnly,
  AuthRequest,
} from "../middleware/auth.js";
import { db } from "../data/db.js";

export const authRouter: Router = Router();

// Register - only super-duper-admin can create new users
authRouter.post(
  "/register",
  authMiddleware,
  superDuperAdminOnly,
  [
    body("email").isEmail().withMessage("Valid email required"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters"),
    body("role")
      .isIn(["super-duper-admin", "user"])
      .withMessage("Invalid role"),
    body("first_name").optional({ nullable: true }).trim(),
    body("last_name").optional({ nullable: true }).trim(),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { email, password, role, first_name, last_name } = req.body;

      const existingUser = await db.users.findByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: "User already exists" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await db.users.create({
        email,
        password_hash: hashedPassword,
        role,
        first_name,
        last_name,
      });

      res.json({
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          first_name: user.first_name,
          last_name: user.last_name,
          created_at: user.created_at,
          updated_at: user.updated_at,
        },
      });
    } catch (error) {
      logger.error({ err: error }, "Register error");
      res.status(500).json({ error: "Registration failed" });
    }
  }
);

// Login
authRouter.post(
  "/login",
  [
    body("email").isEmail().withMessage("Valid email required"),
    body("password").notEmpty().withMessage("Password required"),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { email, password } = req.body;

      const user = await db.users.findByEmail(email);
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const validPassword = await bcrypt.compare(password, user.password_hash);
      if (!validPassword) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const token = generateToken({
        id: user.id,
        email: user.email,
        role: user.role,
      });

      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          first_name: user.first_name,
          last_name: user.last_name,
          created_at: user.created_at,
          updated_at: user.updated_at,
        },
      });
    } catch (error) {
      logger.error({ err: error }, "Login error");
      res.status(500).json({ error: "Login failed" });
    }
  }
);

// Change password
authRouter.patch(
  "/password",
  authMiddleware,
  [
    body("current_password").notEmpty().withMessage("Current password required"),
    body("new_password")
      .isLength({ min: 6 })
      .withMessage("New password must be at least 6 characters"),
  ],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { current_password, new_password } = req.body;

      const user = await db.users.findById(req.user!.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const validPassword = await bcrypt.compare(
        current_password,
        user.password_hash,
      );
      if (!validPassword) {
        return res.status(401).json({ error: "Current password is incorrect" });
      }

      const hashedPassword = await bcrypt.hash(new_password, 10);
      await db.users.updatePassword(user.id, hashedPassword);

      res.json({ message: "Password updated successfully" });
    } catch (error) {
      logger.error({ err: error }, "Change password error");
      res.status(500).json({ error: "Failed to change password" });
    }
  },
);

// Update current user profile
authRouter.patch(
  "/me",
  authMiddleware,
  [
    body("first_name").optional({ nullable: true }).trim(),
    body("last_name").optional({ nullable: true }).trim(),
  ],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const user = await db.users.update(req.user!.id, {
        first_name: req.body.first_name,
        last_name: req.body.last_name,
      });
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({
        id: user.id,
        email: user.email,
        role: user.role,
        first_name: user.first_name,
        last_name: user.last_name,
        created_at: user.created_at,
        updated_at: user.updated_at,
      });
    } catch (error) {
      logger.error({ err: error }, "Update profile error");
      res.status(500).json({ error: "Failed to update profile" });
    }
  }
);

// Get current user
authRouter.get("/me", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const user = await db.users.findById(req.user!.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      id: user.id,
      email: user.email,
      role: user.role,
      first_name: user.first_name,
      last_name: user.last_name,
      created_at: user.created_at,
      updated_at: user.updated_at,
    });
  } catch (error) {
    logger.error({ err: error }, "Get user error");
    res.status(500).json({ error: "Failed to get user" });
  }
});
