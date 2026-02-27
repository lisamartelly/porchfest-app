import { Router, Request, Response } from "express";
import { body, validationResult } from "express-validator";
import bcrypt from "bcryptjs";
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
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { email, password, role } = req.body;

      const existingUser = await db.users.findByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: "User already exists" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await db.users.create({
        email,
        password_hash: hashedPassword,
        role,
      });

      res.json({
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          created_at: user.created_at,
          updated_at: user.updated_at,
        },
      });
    } catch (error) {
      console.error("Register error:", error);
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
          created_at: user.created_at,
          updated_at: user.updated_at,
        },
      });
    } catch (error) {
      console.error("Login error:", error);
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
      console.error("Change password error:", error);
      res.status(500).json({ error: "Failed to change password" });
    }
  },
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
      created_at: user.created_at,
      updated_at: user.updated_at,
    });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({ error: "Failed to get user" });
  }
});
