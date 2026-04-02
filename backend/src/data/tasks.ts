import { pool } from "./pool.js";
import type { Task } from "./types.js";

export const tasks = {
  async findByOrganizationId(organizationId: number | string): Promise<Task[]> {
    const result = await pool.query<Task>(
      "SELECT * FROM tasks WHERE organization_id = $1 ORDER BY name",
      [organizationId]
    );
    return result.rows;
  },

  async findById(id: number | string): Promise<Task | null> {
    const result = await pool.query<Task>(
      "SELECT * FROM tasks WHERE id = $1",
      [id]
    );
    return result.rows[0] || null;
  },

  async create(data: {
    organization_id: number | string;
    name: string;
    recurring?: boolean;
  }): Promise<Task> {
    const result = await pool.query<Task>(
      `INSERT INTO tasks (organization_id, name, recurring)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [data.organization_id, data.name, data.recurring ?? false]
    );
    return result.rows[0];
  },

  async update(
    id: number | string,
    data: { name?: string; recurring?: boolean }
  ): Promise<Task | null> {
    const setClauses: string[] = [];
    const values: (string | boolean | number)[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      setClauses.push(`name = $${paramIndex++}`);
      values.push(data.name);
    }
    if (data.recurring !== undefined) {
      setClauses.push(`recurring = $${paramIndex++}`);
      values.push(data.recurring);
    }

    if (setClauses.length === 0) return this.findById(id);

    values.push(id as number);
    const result = await pool.query<Task>(
      `UPDATE tasks SET ${setClauses.join(", ")} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    return result.rows[0] || null;
  },

  async delete(id: number | string): Promise<boolean> {
    const result = await pool.query(
      "DELETE FROM tasks WHERE id = $1",
      [id]
    );
    return (result.rowCount ?? 0) > 0;
  },
};
