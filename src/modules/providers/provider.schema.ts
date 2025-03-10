import {
  boolean,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { users } from "../users/user.schema";
import { locations } from "../locations/location.schema";
import { InferInsertModel, InferSelectModel, sql } from "drizzle-orm";

export const providers = pgTable("providers", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  businessName: varchar("business_name", { length: 255 }).notNull(),
  description: text("description"),
  logo: text("logo"),
  website: text("website"),
  locationId: integer("location_id").references(() => locations.id),
  businessHours: jsonb("business_hours"),
  isVerified: boolean("is_verified").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  lastSeen: timestamp("last_seen"),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
  deletedAt: timestamp("deleted_at"),
});

export type Provider = InferSelectModel<typeof providers>;
export type NewProvider = InferInsertModel<typeof providers>;
