import pg from "pg";
const { Pool } = pg;

// ============================================================================
// DATABASE CONNECTION
// ============================================================================

// Connection pool - works with any Postgres (Docker, RDS, etc.)
const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    "postgresql://porchfest:porchfest_dev@localhost:5432/porchfest",
  // Production-ready settings
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connection on startup
pool.on("connect", () => {
  console.log("✅ Connected to PostgreSQL database");
});

pool.on("error", (err) => {
  console.error("❌ Unexpected error on idle client", err);
  process.exit(-1);
});

// Export pool for direct queries if needed
export { pool };

// ============================================================================
// TYPE DEFINITIONS (matching mock-data.json structure)
// ============================================================================

export interface User {
  id: string;
  email: string;
  password_hash: string;
  role: string;
  created_at: Date;
  updated_at: Date;
}

export interface Band {
  id: string;
  band_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  genre: string | null;
  member_count: string | null;
  music_sample_link: string | null;
  bio: string | null;
  set_length: string | null;
  venmo_handle: string | null;
  instagram: string | null;
  spotify: string | null;
  soundcloud: string | null;
  bandcamp: string | null;
  facebook: string | null;
  website: string | null;
  scheduling_notes: string | null;
  equipment_consent: string | null;
  payment_consent: string | null;
  timeline_consent: string | null;
  has_photo: boolean;
  photo_filename: string | null;
  questions_comments: string | null;
  status: string;
  admin_notes: string | null;
  assigned_porch_id: string | null;
  set_start_time: string | null;
  set_end_time: string | null;
  assigned_reviewer_id: string | null;
  assigned_reviewer_email: string | null;
  reviewer_rating: number | null;
  reviewer_notes: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface Porch {
  id: string;
  owner_name: string;
  email: string;
  address: string;
  city: string;
  lat: number | null;
  lng: number | null;
  capacity: number | null;
  has_power: boolean;
  parking_notes: string | null;
  accessibility_notes: string | null;
  status: string;
  admin_notes: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface Event {
  id: string;
  name: string;
  date: string;
  start_time: string;
  end_time: string;
  description: string | null;
  is_active: boolean;
  band_applications_open: string | null;
  band_applications_close: string | null;
  porch_applications_open: string | null;
  porch_applications_close: string | null;
  reviewer_emails: string[];
  reviewers_assigned: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface TimeSlot {
  id: string;
  event_id: string;
  start_time: Date;
  end_time: Date;
  created_at: Date;
}

// ============================================================================
// DATABASE QUERY HELPERS
// ============================================================================

export const db = {
  // ---------------------------------------------------------------------------
  // USERS
  // ---------------------------------------------------------------------------
  users: {
    async findByEmail(email: string): Promise<User | null> {
      const result = await pool.query<User>(
        "SELECT * FROM users WHERE email = $1",
        [email]
      );
      return result.rows[0] || null;
    },

    async findById(id: string): Promise<User | null> {
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
    }): Promise<User> {
      const result = await pool.query<User>(
        `INSERT INTO users (email, password_hash, role)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [data.email, data.password_hash, data.role]
      );
      return result.rows[0];
    },
  },

  // ---------------------------------------------------------------------------
  // BANDS
  // ---------------------------------------------------------------------------
  bands: {
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

    async findById(id: string): Promise<Band | null> {
      const result = await pool.query<Band>(
        "SELECT * FROM bands WHERE id = $1",
        [id]
      );
      return result.rows[0] || null;
    },

    async findByReviewerEmail(email: string): Promise<Band[]> {
      const result = await pool.query<Band>(
        "SELECT * FROM bands WHERE assigned_reviewer_email = $1 ORDER BY created_at DESC",
        [email]
      );
      return result.rows;
    },

    async findApproved(): Promise<Band[]> {
      const result = await pool.query<Band>(
        "SELECT * FROM bands WHERE status = 'approved' ORDER BY band_name"
      );
      return result.rows;
    },

    async create(data: Partial<Band>): Promise<Band> {
      const result = await pool.query<Band>(
        `INSERT INTO bands (
          band_name, contact_name, contact_email, contact_phone,
          genre, member_count, music_sample_link, bio, set_length,
          venmo_handle, instagram, spotify, soundcloud, bandcamp, facebook, website,
          scheduling_notes, equipment_consent, payment_consent, timeline_consent,
          has_photo, photo_filename, questions_comments, status, admin_notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
        RETURNING *`,
        [
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
          data.has_photo || false,
          data.photo_filename || null,
          data.questions_comments || null,
          data.status || "pending",
          data.admin_notes || null,
        ]
      );
      return result.rows[0];
    },

    async updateStatus(
      id: string,
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
      id: string,
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
      id: string,
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
      id: string,
      reviewerId: string,
      reviewerEmail: string
    ): Promise<Band | null> {
      const result = await pool.query<Band>(
        `UPDATE bands 
         SET assigned_reviewer_id = $1, assigned_reviewer_email = $2
         WHERE id = $3 RETURNING *`,
        [reviewerId, reviewerEmail, id]
      );
      return result.rows[0] || null;
    },

    async getReviewerEmails(): Promise<string[]> {
      const result = await pool.query<{ assigned_reviewer_email: string }>(
        "SELECT DISTINCT assigned_reviewer_email FROM bands WHERE assigned_reviewer_email IS NOT NULL"
      );
      return result.rows.map((r) => r.assigned_reviewer_email);
    },

    async findOverlappingAtPorch(
      porchId: string,
      startTime: string,
      endTime: string,
      excludeBandId?: string
    ): Promise<Band | null> {
      let query = `
        SELECT * FROM bands 
        WHERE assigned_porch_id = $1 
          AND set_start_time IS NOT NULL 
          AND set_end_time IS NOT NULL
          AND set_start_time::time < $3::time 
          AND set_end_time::time > $2::time
      `;
      const params: (string | undefined)[] = [porchId, startTime, endTime];

      if (excludeBandId) {
        query += " AND id != $4";
        params.push(excludeBandId);
      }

      const result = await pool.query<Band>(query, params);
      return result.rows[0] || null;
    },
  },

  // ---------------------------------------------------------------------------
  // PORCHES
  // ---------------------------------------------------------------------------
  porches: {
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

    async findById(id: string): Promise<Porch | null> {
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

    async create(data: Partial<Porch>): Promise<Porch> {
      const result = await pool.query<Porch>(
        `INSERT INTO porches (
          owner_name, email, address, city, lat, lng,
          capacity, has_power, parking_notes, accessibility_notes,
          status, admin_notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *`,
        [
          data.owner_name,
          data.email,
          data.address,
          data.city,
          data.lat || null,
          data.lng || null,
          data.capacity || null,
          data.has_power || false,
          data.parking_notes || null,
          data.accessibility_notes || null,
          data.status || "pending",
          data.admin_notes || null,
        ]
      );
      return result.rows[0];
    },

    async updateStatus(
      id: string,
      status: string,
      adminNotes?: string | null
    ): Promise<Porch | null> {
      const result = await pool.query<Porch>(
        `UPDATE porches SET status = $1, admin_notes = $2 WHERE id = $3 RETURNING *`,
        [status, adminNotes || null, id]
      );
      return result.rows[0] || null;
    },
  },

  // ---------------------------------------------------------------------------
  // EVENTS
  // ---------------------------------------------------------------------------
  events: {
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

    async findById(id: string): Promise<Event | null> {
      const result = await pool.query<Event>(
        "SELECT * FROM events WHERE id = $1",
        [id]
      );
      return result.rows[0] || null;
    },

    async create(data: Partial<Event>): Promise<Event> {
      const result = await pool.query<Event>(
        `INSERT INTO events (name, date, start_time, end_time, description, is_active)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          data.name,
          data.date,
          data.start_time || "12:00",
          data.end_time || "18:00",
          data.description || null,
          data.is_active ?? true,
        ]
      );
      return result.rows[0];
    },

    async update(id: string, data: Partial<Event>): Promise<Event | null> {
      const setClauses: string[] = [];
      const values: (string | boolean | string[] | null)[] = [];
      let paramIndex = 1;

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
      if (data.reviewer_emails !== undefined) {
        setClauses.push(`reviewer_emails = $${paramIndex++}`);
        values.push(data.reviewer_emails);
      }
      if (data.reviewers_assigned !== undefined) {
        setClauses.push(`reviewers_assigned = $${paramIndex++}`);
        values.push(data.reviewers_assigned);
      }

      if (setClauses.length === 0) return this.findById(id);

      values.push(id);
      const result = await pool.query<Event>(
        `UPDATE events SET ${setClauses.join(", ")} WHERE id = $${paramIndex} RETURNING *`,
        values
      );
      return result.rows[0] || null;
    },
  },

  // ---------------------------------------------------------------------------
  // TIME SLOTS
  // ---------------------------------------------------------------------------
  timeSlots: {
    async findByEventId(eventId: string): Promise<TimeSlot[]> {
      const result = await pool.query<TimeSlot>(
        "SELECT * FROM time_slots WHERE event_id = $1 ORDER BY start_time",
        [eventId]
      );
      return result.rows;
    },

    async findAll(): Promise<TimeSlot[]> {
      const result = await pool.query<TimeSlot>(
        "SELECT * FROM time_slots ORDER BY start_time"
      );
      return result.rows;
    },

    async create(data: {
      event_id: string;
      start_time: string;
      end_time: string;
    }): Promise<TimeSlot> {
      const result = await pool.query<TimeSlot>(
        `INSERT INTO time_slots (event_id, start_time, end_time)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [data.event_id, data.start_time, data.end_time]
      );
      return result.rows[0];
    },
  },
};

// Initialize database connection test
export async function testConnection(): Promise<boolean> {
  try {
    const result = await pool.query("SELECT NOW()");
    console.log("✅ Database connection test successful:", result.rows[0].now);
    return true;
  } catch (error) {
    console.error("❌ Database connection test failed:", error);
    return false;
  }
}
