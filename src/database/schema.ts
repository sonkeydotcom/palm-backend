import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial(),
  name: text(),
  email: text(),
  created_at: timestamp(),
  updated_at: timestamp(),
  password_hash: text(), // Assuming hashed passwords are stored in a separate table or column.
});
