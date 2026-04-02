import { pool } from "./pool.js";
import type { TaskContact } from "./types.js";

export const taskContacts = {
  async findByEventTaskId(eventTaskId: number | string): Promise<TaskContact[]> {
    const result = await pool.query<TaskContact>(
      "SELECT * FROM task_contacts WHERE event_task_id = $1 ORDER BY name",
      [eventTaskId]
    );
    return result.rows;
  },

  async create(data: {
    event_task_id: number | string;
    name: string;
    email?: string | null;
    phone?: string | null;
    business?: string | null;
    notes?: string | null;
  }): Promise<TaskContact> {
    const result = await pool.query<TaskContact>(
      `INSERT INTO task_contacts (event_task_id, name, email, phone, business, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        data.event_task_id,
        data.name,
        data.email || null,
        data.phone || null,
        data.business || null,
        data.notes || null,
      ]
    );
    return result.rows[0];
  },

  async update(
    id: number | string,
    data: {
      name?: string;
      email?: string | null;
      phone?: string | null;
      business?: string | null;
      notes?: string | null;
    }
  ): Promise<TaskContact | null> {
    const setClauses: string[] = [];
    const values: (string | null | number)[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      setClauses.push(`name = $${paramIndex++}`);
      values.push(data.name);
    }
    if (data.email !== undefined) {
      setClauses.push(`email = $${paramIndex++}`);
      values.push(data.email ?? null);
    }
    if (data.phone !== undefined) {
      setClauses.push(`phone = $${paramIndex++}`);
      values.push(data.phone ?? null);
    }
    if (data.business !== undefined) {
      setClauses.push(`business = $${paramIndex++}`);
      values.push(data.business ?? null);
    }
    if (data.notes !== undefined) {
      setClauses.push(`notes = $${paramIndex++}`);
      values.push(data.notes ?? null);
    }

    if (setClauses.length === 0) return null;

    values.push(id as number);
    const result = await pool.query<TaskContact>(
      `UPDATE task_contacts SET ${setClauses.join(", ")} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    return result.rows[0] || null;
  },

  async delete(id: number | string): Promise<boolean> {
    const result = await pool.query(
      "DELETE FROM task_contacts WHERE id = $1",
      [id]
    );
    return (result.rowCount ?? 0) > 0;
  },
};
