import { pool } from "./pool.js";
import type { BandMagicToken } from "./types.js";

export const bandMagicTokens = {
  async create(bandId: number, token: string, expiresAt: Date): Promise<BandMagicToken> {
    const result = await pool.query<BandMagicToken>(
      `INSERT INTO band_magic_tokens (band_id, token, expires_at)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [bandId, token, expiresAt]
    );
    return result.rows[0];
  },

  async findByToken(token: string): Promise<BandMagicToken | null> {
    const result = await pool.query<BandMagicToken>(
      "SELECT * FROM band_magic_tokens WHERE token = $1",
      [token]
    );
    return result.rows[0] || null;
  },

  async markUsed(token: string): Promise<void> {
    await pool.query(
      "UPDATE band_magic_tokens SET used_at = NOW() WHERE token = $1",
      [token]
    );
  },
};
