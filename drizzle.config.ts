import "dotenv/config";
import { defineConfig } from "drizzle-kit";
import { DATABASE_URL } from "./src/common/config/env";

export default defineConfig({
  out: "./drizzle",
  schema: [
    "./src/modules/**/**/*.schema.ts", // Include schemas from modular folders
  ],
  dialect: "postgresql",
  dbCredentials: {
    url: DATABASE_URL!,
  },
});
