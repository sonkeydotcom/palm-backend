import {
  boolean,
  integer,
  pgTable,
  serial,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { users } from "../users/user.schema";
import { InferInsertModel, InferSelectModel, sql } from "drizzle-orm";

export const locations = pgTable("locations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  label: varchar("label", { length: 50 }).notNull().default("home"), // e.g home, work, etc.
  address: varchar("address", { length: 255 }),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 100 }),
  longitude: varchar("longitude", { length: 100 }),
  latitude: varchar("latitude", { length: 100 }),
  isDefault: boolean("is_default").default(true).notNull(),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
  deletedAt: timestamp("deleted_at"),
});

// export const userRelations = relations(users, ({many}) => ({
//     bookings: many("bookings"),
// }))

export type Location = InferSelectModel<typeof locations>;
export type NewLocation = InferInsertModel<typeof locations>;
