import { pool } from "./pool.js";
import type { User } from "./types.js";

export const users = {
  async findAll(): Promise<User[]> {
    const result = await pool.query<User>(
      "SELECT * FROM users ORDER BY created_at DESC"
    );
    return result.rows;
  },

  async findByEmail(email: string): Promise<User | null> {
    const result = await pool.query<User>(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );
    return result.rows[0] || null;
  },

  async findById(id: number | string): Promise<User | null> {
    const result = await pool.query<User>(
      "SELECT * FROM users WHERE id = $1",
      [id]
    );
    return result.rows[0] || null;
  },

  async create(data: {
    email: string;
    password_hash: string;
    role: string;
    first_name?: string | null;
    last_name?: string | null;
  }): Promise<User> {
    const result = await pool.query<User>(
      `INSERT INTO users (email, password_hash, role, first_name, last_name)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [data.email, data.password_hash, data.role, data.first_name ?? null, data.last_name ?? null]
    );
    return result.rows[0];
  },

  async update(id: number | string, data: {
    first_name?: string | null;
    last_name?: string | null;
    email?: string;
  }): Promise<User | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (data.email !== undefined) {
      fields.push(`email = $${idx++}`);
      values.push(data.email);
    }
    if (data.first_name !== undefined) {
      fields.push(`first_name = $${idx++}`);
      values.push(data.first_name);
    }
    if (data.last_name !== undefined) {
      fields.push(`last_name = $${idx++}`);
      values.push(data.last_name);
    }
    if (fields.length === 0) return this.findById(id);

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const result = await pool.query<User>(
      `UPDATE users SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`,
      values
    );
    return result.rows[0] || null;
  },

  async updatePassword(id: number | string, passwordHash: string): Promise<User | null> {
    const result = await pool.query<User>(
      `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [passwordHash, id]
    );
    return result.rows[0] || null;
  },
};
