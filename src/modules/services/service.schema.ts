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
import { categories } from "../service-categories/service-category.schema";
import { locations } from "../locations/location.schema";
import { taskers } from "../tasker/tasker.schema";

export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  categoryId: serial("category_id").references(() => categories.id),
  locationId: integer("location_id").references(() => locations.id),
  description: text("description"),
  icon: text("icon"),
  image: text("image"),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  tags: jsonb("tags"), // Array of tags
  metadata: jsonb("metadata"), // Additional service data
  parentId: serial("parent_id"),
  displayOrder: serial("display_order"),
  isActive: boolean("is_active").default(true).notNull(),
  isPopular: boolean("is_popular").default(false),
  isFeatured: boolean("is_featured").default(false),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

export const serviceAttributes = pgTable("service_attributes", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  type: varchar("type", { length: 20 }).notNull(), // text, number, boolean, select
  options: jsonb("options"), // For select type
  isRequired: boolean("is_required").default(false),
  displayOrder: integer("display_order").default(0),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

export const serviceAttributeValues = pgTable("service_attribute_values", {
  id: serial("id").primaryKey(),
  serviceId: integer("service_id")
    .references(() => services.id)
    .notNull(),
  attributeId: integer("attribute_id")
    .references(() => serviceAttributes.id)
    .notNull(),
  value: text("value").notNull(),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

export const serviceFaqs = pgTable("service_faqs", {
  id: serial("id").primaryKey(),
  serviceId: integer("service_id")
    .references(() => services.id)
    .notNull(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  displayOrder: integer("display_order").default(0),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

export const serviceRelations = relations(services, ({ many }) => ({
  tasks: many(tasks),
  taskers: many(taskers),
}));

export type Service = InferSelectModel<typeof services>;
export type NewService = InferInsertModel<typeof services>;
export type ServiceAttribute = InferSelectModel<typeof serviceAttributes>;
export type NewServiceAttribute = InferInsertModel<typeof serviceAttributes>;
export type ServiceAttributeValue = InferSelectModel<
  typeof serviceAttributeValues
>;
export type NewServiceAttributeValue = InferInsertModel<
  typeof serviceAttributeValues
>;
export type ServiceFaq = InferSelectModel<typeof serviceFaqs>;
export type NewServiceFaq = InferInsertModel<typeof serviceFaqs>;
