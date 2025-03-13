import {
  InferInsertModel,
  InferSelectModel,
  relations,
  sql,
} from "drizzle-orm";
import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  boolean,
} from "drizzle-orm/pg-core";
import { tasks } from "../tasks/task.schema";

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  icon: text("icon"),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  // parentId: serial("parent_id").references(() => categories.id),
  displayOrder: serial("display_order"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
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
  tasks: many(tasks),
}));

export type Category = InferSelectModel<typeof categories>;
export type Subcategory = InferSelectModel<typeof subcategories>;
export type NewCategory = InferInsertModel<typeof categories>;
export type NewSubcategory = InferInsertModel<typeof subcategories>;
