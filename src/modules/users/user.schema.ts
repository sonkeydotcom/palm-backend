import { InferInsertModel, InferSelectModel, sql } from "drizzle-orm";
import {
  boolean,
  pgTable,
  serial,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 255 }).notNull().unique(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  role: varchar("role", { length: 20 }).default("user").notNull(),
  firstName: varchar("first_name", { length: 255 }),
  lastName: varchar("last_name", { length: 255 }),
  phone: varchar("phone", { length: 255 }),
  avatar: varchar("avatar", { length: 255 }),
  isActive: boolean("is_active").default(true).notNull(),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

//   deletedAt: timestamp("deleted_at"),
//   rememberToken: varchar("remember_token", { length: 100 }),
//   resetToken: varchar("reset_token", { length: 100 }),

export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;
