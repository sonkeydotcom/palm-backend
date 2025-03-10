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

export const connectDB = async (attempts = 5, delay = 3000) => {
  for (let i = 0; i < attempts; i++) {
    try {
      const client = await pool.connect();
      client.release();
      console.log(
        "✅ Database connection successful."
        // client
      );
      return true;
    } catch (error) {
      console.error(
        `❌ Database connection error (Attempt ${i}/${attempts}):`,
        error
      );
      if (i < attempts - 1) {
        console.log(`Retrying in ${delay / 1000} seconds...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        console.error("🚨 All connection attempts failed. Exiting...");
        process.exit(1);
      }
    }
  }
};

// Graceful Shutdown
process.on("SIGINT", async () => {
  console.log("🛑 Received SIGINT. Closing database connection...");
  await pool.end();
  console.log("✅ Database connection closed. Exiting.");
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("🛑 Received SIGTERM. Closing database connection...");
  await pool.end();
  console.log("✅ Database connection closed. Exiting.");
  process.exit(0);
});

export default db;
