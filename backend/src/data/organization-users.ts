import { pool } from "./pool.js";
import type { Organization, OrganizationUser, User } from "./types.js";

export const organizationUsers = {
  async findByUserId(userId: number): Promise<OrganizationUser[]> {
    const result = await pool.query<OrganizationUser>(
      "SELECT * FROM organization_users WHERE user_id = $1 ORDER BY created_at DESC",
      [userId]
    );
    return result.rows;
  },

  async findByOrganizationId(
    organizationId: number
  ): Promise<OrganizationUser[]> {
    const result = await pool.query<OrganizationUser>(
      "SELECT * FROM organization_users WHERE organization_id = $1 ORDER BY created_at DESC",
      [organizationId]
    );
    return result.rows;
  },

  async findByUserAndOrg(
    userId: number,
    organizationId: number
  ): Promise<OrganizationUser | null> {
    const result = await pool.query<OrganizationUser>(
      "SELECT * FROM organization_users WHERE user_id = $1 AND organization_id = $2",
      [userId, organizationId]
    );
    return result.rows[0] || null;
  },

  async getOrganizationsForUser(userId: number): Promise<Organization[]> {
    const result = await pool.query<Organization>(
      `SELECT o.* FROM organizations o
       INNER JOIN organization_users ou ON o.id = ou.organization_id
       WHERE ou.user_id = $1
       ORDER BY o.name`,
      [userId]
    );
    return result.rows;
  },

  async getUsersForOrganization(organizationId: number): Promise<User[]> {
    const result = await pool.query<User>(
      `SELECT u.* FROM users u
       INNER JOIN organization_users ou ON u.id = ou.user_id
       WHERE ou.organization_id = $1
       ORDER BY u.email`,
      [organizationId]
    );
    return result.rows;
  },

  async create(data: {
    user_id: number;
    organization_id: number;
    role?: string;
  }): Promise<OrganizationUser> {
    const result = await pool.query<OrganizationUser>(
      `INSERT INTO organization_users (user_id, organization_id, role)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [data.user_id, data.organization_id, data.role || "organizer"]
    );
    return result.rows[0];
  },

  async updateRole(
    userId: number,
    organizationId: number,
    role: string
  ): Promise<OrganizationUser | null> {
    const result = await pool.query<OrganizationUser>(
      `UPDATE organization_users SET role = $1 WHERE user_id = $2 AND organization_id = $3 RETURNING *`,
      [role, userId, organizationId]
    );
    return result.rows[0] || null;
  },

  async delete(userId: number, organizationId: number): Promise<boolean> {
    const result = await pool.query(
      "DELETE FROM organization_users WHERE user_id = $1 AND organization_id = $2",
      [userId, organizationId]
    );
    return (result.rowCount ?? 0) > 0;
  },
};
