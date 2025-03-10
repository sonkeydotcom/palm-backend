import { InferSelectModel, relations, sql } from "drizzle-orm";
import { pgTable, serial, timestamp, varchar } from "drizzle-orm/pg-core";
import { services } from "../services/services.schema";

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).unique().notNull(),
  description: varchar("description", { length: 255 }),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

export const subcategories = pgTable("subcategories", {
  id: serial("id").primaryKey(),
  categoryId: serial("category_id").references(() => categories.id),
  name: varchar("name", { length: 100 }).unique().notNull(),
  description: varchar("description", { length: 255 }),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

export const categoryRelations = relations(categories, ({ many }) => ({
  subcategories: many(subcategories),
  services: many(services),
}));

export type Category = InferSelectModel<typeof categories>;
export type Subcategory = InferSelectModel<typeof subcategories>;
export type NewCategory = InferSelectModel<typeof categories>;
export type NewSubcategory = InferSelectModel<typeof subcategories>;
