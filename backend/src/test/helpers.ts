import type { Request, Response, NextFunction } from "express";

export type MockUser = {
  id: number;
  email: string;
  role: "user" | "super-duper-admin";
};

export type RequestWithUser = Request & { user?: MockUser };

/**
 * Mock adminOnly middleware that reads user info from request headers.
 * Headers: x-user-id (default 1), x-role (default "user"), x-user-email ("none" to simulate missing)
 */
export function createMockAdminOnly(defaultEmail: string) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const userReq = req as RequestWithUser;
    const roleHeader = req.header("x-role");
    const role: MockUser["role"] =
      roleHeader === "super-duper-admin" ? "super-duper-admin" : "user";
    const emailHeader = req.header("x-user-email");

    userReq.user = {
      id: Number(req.header("x-user-id") ?? 1),
      email:
        emailHeader === "none"
          ? (undefined as unknown as string)
          : defaultEmail,
      role,
    };

    next();
  };
}

/**
 * Mock superDuperAdminOnly middleware that blocks non-super-duper-admin users.
 * Expects req.user to already be set by a preceding middleware mock.
 */
export function createMockSuperDuperAdminOnly() {
  return (req: Request, res: Response, next: NextFunction) => {
    const userReq = req as RequestWithUser;
    if (userReq.user?.role !== "super-duper-admin") {
      return res
        .status(403)
        .json({ error: "Super-duper-admin access required" });
    }
    next();
  };
}

/**
 * Mock authMiddleware that reads user info from request headers.
 * Unlike adminOnly, this defaults role to defaultRole (super-duper-admin by default).
 * Headers: x-user-id (default 1), x-role (default defaultRole)
 */
export function createMockAuthMiddleware(
  defaultEmail: string,
  defaultRole: MockUser["role"] = "super-duper-admin",
) {
  return (req: Request, _res: Response, next: NextFunction) => {
    (req as RequestWithUser).user = {
      id: Number(req.header("x-user-id") ?? 1),
      email: defaultEmail,
      role: (req.header("x-role") as MockUser["role"]) ?? defaultRole,
    };
    next();
  };
}
