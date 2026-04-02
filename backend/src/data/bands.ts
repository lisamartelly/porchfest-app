import { pool } from "./pool.js";
import type { Band } from "./types.js";

export const bands = {
  async findAll(status?: string): Promise<Band[]> {
    let query = "SELECT * FROM bands";
    const params: string[] = [];

    if (status) {
      query += " WHERE status = $1";
      params.push(status);
    }

    query += " ORDER BY created_at DESC";

    const result = await pool.query<Band>(query, params);
    return result.rows;
  },

  async findById(id: number | string): Promise<Band | null> {
    const result = await pool.query<Band>(
      "SELECT * FROM bands WHERE id = $1",
      [id]
    );
    return result.rows[0] || null;
  },

  async findByReviewerId(userId: number): Promise<Band[]> {
    const result = await pool.query<Band>(
      "SELECT * FROM bands WHERE assigned_reviewer_id = $1 ORDER BY created_at DESC",
      [userId]
    );
    return result.rows;
  },

  async findApproved(): Promise<Band[]> {
    const result = await pool.query<Band>(
      "SELECT * FROM bands WHERE status = 'approved' ORDER BY band_name"
    );
    return result.rows;
  },

  async findByEventId(eventId: number | string): Promise<Band[]> {
    const result = await pool.query<Band>(
      `SELECT * FROM bands WHERE event_id = $1 ORDER BY band_name`,
      [eventId]
    );
    return result.rows;
  },

  async findByEventIdAndEmail(eventId: number | string, email: string): Promise<Band | null> {
    const result = await pool.query<Band>(
      `SELECT * FROM bands WHERE event_id = $1 AND LOWER(contact_email) = LOWER($2)`,
      [eventId, email]
    );
    return result.rows[0] || null;
  },

  async update(id: number | string, data: Partial<Band>): Promise<Band | null> {
    const setClauses: string[] = [];
    const values: (string | number | boolean | null)[] = [];
    let paramIndex = 1;

    const fields: (keyof Band)[] = [
      "band_name", "contact_name", "contact_email", "contact_phone",
      "genre", "member_count", "music_sample_link", "bio", "set_length",
      "venmo_handle", "instagram", "spotify", "soundcloud", "bandcamp",
      "facebook", "website", "scheduling_notes", "equipment_consent",
      "payment_consent", "timeline_consent", "photo_key",
      "questions_comments",
    ];

    for (const field of fields) {
      if (data[field] !== undefined) {
        setClauses.push(`${field} = $${paramIndex++}`);
        values.push(data[field] as string | number | boolean | null);
      }
    }

    if (setClauses.length === 0) return this.findById(id);

    setClauses.push(`updated_at = NOW()`);
    values.push(id as number);
    const result = await pool.query<Band>(
      `UPDATE bands SET ${setClauses.join(", ")} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    return result.rows[0] || null;
  },

  async create(data: Partial<Band>): Promise<Band> {
    const result = await pool.query<Band>(
      `INSERT INTO bands (
        event_id, band_name, contact_name, contact_email, contact_phone,
        genre, member_count, music_sample_link, bio, set_length,
        venmo_handle, instagram, spotify, soundcloud, bandcamp, facebook, website,
        scheduling_notes, equipment_consent, payment_consent, timeline_consent,
        photo_key, questions_comments, status, admin_notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
      RETURNING *`,
      [
        data.event_id,
        data.band_name,
        data.contact_name,
        data.contact_email,
        data.contact_phone || null,
        data.genre || null,
        data.member_count || null,
        data.music_sample_link || null,
        data.bio || null,
        data.set_length || null,
        data.venmo_handle || null,
        data.instagram || null,
        data.spotify || null,
        data.soundcloud || null,
        data.bandcamp || null,
        data.facebook || null,
        data.website || null,
        data.scheduling_notes || null,
        data.equipment_consent || null,
        data.payment_consent || null,
        data.timeline_consent || null,
        data.photo_key || null,
        data.questions_comments || null,
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
  ): Promise<Band | null> {
    const result = await pool.query<Band>(
      `UPDATE bands SET status = $1, admin_notes = $2 WHERE id = $3 RETURNING *`,
      [status, adminNotes || null, id]
    );
    return result.rows[0] || null;
  },

  async updateSchedule(
    id: number | string,
    data: {
      assigned_porch_id?: string | null;
      set_start_time?: string | null;
      set_end_time?: string | null;
    }
  ): Promise<Band | null> {
    const result = await pool.query<Band>(
      `UPDATE bands 
       SET assigned_porch_id = $1, set_start_time = $2, set_end_time = $3
       WHERE id = $4 RETURNING *`,
      [
        data.assigned_porch_id || null,
        data.set_start_time || null,
        data.set_end_time || null,
        id,
      ]
    );
    return result.rows[0] || null;
  },

  async updateReview(
    id: number | string,
    data: {
      reviewer_rating?: number | null;
      reviewer_notes?: string | null;
    }
  ): Promise<Band | null> {
    const result = await pool.query<Band>(
      `UPDATE bands 
       SET reviewer_rating = $1, reviewer_notes = $2
       WHERE id = $3 RETURNING *`,
      [data.reviewer_rating ?? null, data.reviewer_notes ?? null, id]
    );
    return result.rows[0] || null;
  },

  async assignReviewer(
    id: number | string,
    reviewerId: number
  ): Promise<Band | null> {
    const result = await pool.query<Band>(
      `UPDATE bands 
       SET assigned_reviewer_id = $1
       WHERE id = $2 RETURNING *`,
      [reviewerId, id]
    );
    return result.rows[0] || null;
  },

  async getReviewerUserIds(): Promise<number[]> {
    const result = await pool.query<{ assigned_reviewer_id: number }>(
      "SELECT DISTINCT assigned_reviewer_id FROM bands WHERE assigned_reviewer_id IS NOT NULL"
    );
    return result.rows.map((r) => r.assigned_reviewer_id);
  },

  async findOverlappingAtPorch(
    porchId: number | string,
    startTime: string,
    endTime: string,
    excludeBandId?: number | string
  ): Promise<Band | null> {
    let query = `
      SELECT * FROM bands 
      WHERE assigned_porch_id = $1 
        AND set_start_time IS NOT NULL 
        AND set_end_time IS NOT NULL
        AND set_start_time::time < $3::time 
        AND set_end_time::time > $2::time
    `;
    const params: (string | number | undefined)[] = [porchId, startTime, endTime];

    if (excludeBandId) {
      query += " AND id != $4";
      params.push(excludeBandId);
    }

    const result = await pool.query<Band>(query, params);
    return result.rows[0] || null;
  },
};
