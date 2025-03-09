import { DATABASE_URL } from "./env";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required.");
}

const pool = new Pool({
  connectionString: DATABASE_URL,
});

const db = drizzle(pool);

export const connectDB = async () => {
  try {
    const client = await pool.connect();

    console.log("✅ MongoDB ConnectedDatabase connection successful.", client);
  } catch (error) {
    console.error("❌ Database connection error:", error);
    process.exit(1);
  }
};

export default db;
