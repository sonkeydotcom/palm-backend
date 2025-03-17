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
  jsonb,
  integer,
} from "drizzle-orm/pg-core";
import { tasks } from "../tasks/task.schema";
import { categories } from "../categories/category.schema";
import { locations } from "../locations/location.schema";
import { taskers } from "../tasker/tasker.schema";

export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  categoryId: serial("category_id").references(() => categories.id),
  locationId: integer("location_id").references(() => locations.id),
  description: text("description"),
  icon: text("icon"),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  metadata: jsonb("metadata"), // Additional service data
  parentId: serial("parent_id"),
  displayOrder: serial("display_order"),
  isActive: boolean("is_active").default(true).notNull(),
  isPopular: boolean("is_popular").default(false),
  isFeatured: boolean("is_featured").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const subservices = pgTable("subservices", {
  id: serial("id").primaryKey(),
  serviceId: serial("service_id").references(() => services.id),
  name: varchar("name", { length: 100 }).unique().notNull(),
  description: varchar("description", { length: 255 }),
  keywords: text("keywords"),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

export const serviceRelations = relations(services, ({ many }) => ({
  subservices: many(subservices),
  tasks: many(tasks),
  taskers: many(taskers),
}));

export type Service = InferSelectModel<typeof services>;
export type Subcservice = InferSelectModel<typeof subservices>;
export type NewService = InferInsertModel<typeof services>;
export type NewSubservice = InferInsertModel<typeof subservices>;
