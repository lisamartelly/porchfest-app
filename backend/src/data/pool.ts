import pg from "pg";
import logger from "../lib/logger.js";
const { Pool } = pg;

// Return DATE columns as plain "YYYY-MM-DD" strings instead of JS Date objects.
// The default parser creates a Date at midnight local time, which JSON.stringify
// converts to a UTC ISO string — shifting the calendar day for users in
// timezones behind UTC.
pg.types.setTypeParser(1082, (val: string) => val);

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    "postgresql://porchfest:porchfest_dev@localhost:5432/porchfest",
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on("connect", () => {
  logger.info("Connected to PostgreSQL database");
});

pool.on("error", (err) => {
  logger.fatal({ err }, "Unexpected error on idle client");
  process.exit(-1);
});

export { pool };

export async function testConnection(): Promise<boolean> {
  try {
    const result = await pool.query("SELECT NOW()");
    logger.info({ time: result.rows[0].now }, "Database connection test successful");
    return true;
  } catch (error) {
    logger.error({ err: error }, "Database connection test failed");
    return false;
  }
}
