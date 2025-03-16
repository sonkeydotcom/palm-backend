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

export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  icon: text("icon"),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  parentId: serial("parent_id"),
  displayOrder: serial("display_order"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const subservices = pgTable("subservices", {
  id: serial("id").primaryKey(),
  categoryId: serial("category_id").references(() => services.id),
  name: varchar("name", { length: 100 }).unique().notNull(),
  description: varchar("description", { length: 255 }),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

export const categoryRelations = relations(services, ({ many }) => ({
  subservices: many(subservices),
  tasks: many(tasks),
}));

export type Service = InferSelectModel<typeof services>;
export type Subcategory = InferSelectModel<typeof subservices>;
export type NewService = InferInsertModel<typeof services>;
export type NewSubcategory = InferInsertModel<typeof subservices>;
