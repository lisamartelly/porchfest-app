import { pool } from "./pool.js";
import type { Porch } from "./types.js";

export const porches = {
  async findAll(status?: string): Promise<Porch[]> {
    let query = "SELECT * FROM porches";
    const params: string[] = [];

    if (status) {
      query += " WHERE status = $1";
      params.push(status);
    }

    query += " ORDER BY created_at DESC";

    const result = await pool.query<Porch>(query, params);
    return result.rows;
  },

  async findById(id: number | string): Promise<Porch | null> {
    const result = await pool.query<Porch>(
      "SELECT * FROM porches WHERE id = $1",
      [id]
    );
    return result.rows[0] || null;
  },

  async findApproved(): Promise<Porch[]> {
    const result = await pool.query<Porch>(
      "SELECT * FROM porches WHERE status = 'approved' ORDER BY address"
    );
    return result.rows;
  },

  async findByEventId(eventId: number | string): Promise<Porch[]> {
    const result = await pool.query<Porch>(
      `SELECT * FROM porches WHERE event_id = $1 ORDER BY address`,
      [eventId]
    );
    return result.rows;
  },

  async create(data: Partial<Porch>): Promise<Porch> {
    const result = await pool.query<Porch>(
      `INSERT INTO porches (
        event_id, owner_name, email, phone, address, city, lat, lng,
        capacity, has_power, parking_notes, accessibility_notes,
        space_description, has_band_in_mind, music_preferences,
        band_count_preference, rain_date_available, comments,
        status, admin_notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      RETURNING *`,
      [
        data.event_id,
        data.owner_name,
        data.email,
        data.phone || null,
        data.address,
        data.city,
        data.lat || null,
        data.lng || null,
        data.capacity || null,
        data.has_power || false,
        data.parking_notes || null,
        data.accessibility_notes || null,
        data.space_description || null,
        data.has_band_in_mind || null,
        data.music_preferences || null,
        data.band_count_preference || null,
        data.rain_date_available || null,
        data.comments || null,
        data.status || "pending",
        data.admin_notes || null,
      ]
    );
    return result.rows[0];
  },

  async updateStatus(
    id: number | string,
    status: string,
    adminNotes?: string | null
  ): Promise<Porch | null> {
    const result = await pool.query<Porch>(
      `UPDATE porches SET status = $1, admin_notes = $2 WHERE id = $3 RETURNING *`,
      [status, adminNotes || null, id]
    );
    return result.rows[0] || null;
  },
};
