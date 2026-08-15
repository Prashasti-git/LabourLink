import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

// A connection pool - reused across all queries instead of opening
// a new connection every time. This is the standard pattern for
// talking to Postgres from a Node/Express app.
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on("error", (err) => {
  console.error("Unexpected error on idle Postgres client", err);
  process.exit(-1);
});
