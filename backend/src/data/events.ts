import { pool } from "./pool.js";
import type { Event } from "./types.js";

export const events = {
  async findAll(): Promise<Event[]> {
    const result = await pool.query<Event>(
      "SELECT * FROM events ORDER BY date"
    );
    return result.rows;
  },

  async findActive(): Promise<Event | null> {
    const result = await pool.query<Event>(
      "SELECT * FROM events WHERE is_active = true LIMIT 1"
    );
    return result.rows[0] || null;
  },

  async findActiveByOrganizationId(organizationId: number | string): Promise<Event | null> {
    const result = await pool.query<Event>(
      "SELECT * FROM events WHERE organization_id = $1 AND is_active = true LIMIT 1",
      [organizationId]
    );
    return result.rows[0] || null;
  },

  async findById(id: number | string): Promise<Event | null> {
    const result = await pool.query<Event>(
      "SELECT * FROM events WHERE id = $1",
      [id]
    );
    return result.rows[0] || null;
  },

  async findByOrganizationId(organizationId: number | string): Promise<Event[]> {
    const result = await pool.query<Event>(
      "SELECT * FROM events WHERE organization_id = $1 ORDER BY date DESC",
      [organizationId]
    );
    return result.rows;
  },

  async create(data: Partial<Event>): Promise<Event> {
    const isActive = data.is_active ?? true;
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      if (isActive && data.organization_id) {
        await client.query(
          "UPDATE events SET is_active = false WHERE organization_id = $1 AND is_active = true",
          [data.organization_id]
        );
      }
      const result = await client.query<Event>(
        `INSERT INTO events (organization_id, name, date, start_time, end_time, description, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          data.organization_id,
          data.name,
          data.date,
          data.start_time || "12:00",
          data.end_time || "18:00",
          data.description || null,
          isActive,
        ]
      );
      await client.query("COMMIT");
      return result.rows[0];
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  },

  async update(id: number | string, data: Partial<Event>): Promise<Event | null> {
    const setClauses: string[] = [];
    const values: (string | number | boolean | null)[] = [];
    let paramIndex = 1;

    if (data.organization_id !== undefined) {
      setClauses.push(`organization_id = $${paramIndex++}`);
      values.push(data.organization_id);
    }
    if (data.name !== undefined) {
      setClauses.push(`name = $${paramIndex++}`);
      values.push(data.name);
    }
    if (data.date !== undefined) {
      setClauses.push(`date = $${paramIndex++}`);
      values.push(data.date);
    }
    if (data.start_time !== undefined) {
      setClauses.push(`start_time = $${paramIndex++}`);
      values.push(data.start_time);
    }
    if (data.end_time !== undefined) {
      setClauses.push(`end_time = $${paramIndex++}`);
      values.push(data.end_time);
    }
    if (data.description !== undefined) {
      setClauses.push(`description = $${paramIndex++}`);
      values.push(data.description);
    }
    if (data.band_applications_open !== undefined) {
      setClauses.push(`band_applications_open = $${paramIndex++}`);
      values.push(data.band_applications_open);
    }
    if (data.band_applications_close !== undefined) {
      setClauses.push(`band_applications_close = $${paramIndex++}`);
      values.push(data.band_applications_close);
    }
    if (data.porch_applications_open !== undefined) {
      setClauses.push(`porch_applications_open = $${paramIndex++}`);
      values.push(data.porch_applications_open);
    }
    if (data.porch_applications_close !== undefined) {
      setClauses.push(`porch_applications_close = $${paramIndex++}`);
      values.push(data.porch_applications_close);
    }
    if (data.porch_app_description !== undefined) {
      setClauses.push(`porch_app_description = $${paramIndex++}`);
      values.push(data.porch_app_description);
    }
    if (data.porch_app_photo_key !== undefined) {
      setClauses.push(`porch_app_photo_key = $${paramIndex++}`);
      values.push(data.porch_app_photo_key);
    }
    if (data.is_active !== undefined) {
      setClauses.push(`is_active = $${paramIndex++}`);
      values.push(data.is_active);
    }

    if (setClauses.length === 0) return this.findById(id);

    if (data.is_active === true) {
      const event = await this.findById(id);
      if (event) {
        await pool.query(
          "UPDATE events SET is_active = false WHERE organization_id = $1 AND id != $2 AND is_active = true",
          [event.organization_id, id]
        );
      }
    }

    values.push(id);
    const result = await pool.query<Event>(
      `UPDATE events SET ${setClauses.join(", ")} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    return result.rows[0] || null;
  },
};
