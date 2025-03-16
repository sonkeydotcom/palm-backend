import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  timestamp,
  boolean,
  jsonb,
  doublePrecision,
  pgEnum,
} from "drizzle-orm/pg-core";
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { taskers } from "../tasker/tasker.schema";
import { services } from "../services/service.schema";
import { locations } from "../locations/location.schema";

export const statusEnum = pgEnum("status", [
  "pending",
  "accepted",
  "rejected",
  "completed",
]);

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  shortDescription: text("short_description"),
  taskerId: integer("tasker_id")
    .references(() => taskers.id)
    .notNull(),
  serviceId: integer("service_id").references(() => services.id),
  locationId: integer("location_id").references(() => locations.id),
  status: pgEnum("status", statusEnum), // pending, accepted, rejected, completed
  baseHourlyRate: integer("base_hourly_rate"), // in cents
  estimatedDuration: integer("estimated_duration"), // in minutes
  image: text("image"),
  gallery: jsonb("gallery"), // Array of image URLs
  tags: jsonb("tags"), // Array of tags
  requiredEquipment: jsonb("required_equipment"), // Equipment needed for this task
  requiredSkills: jsonb("required_skills"), // Skills needed for this task
  isPopular: boolean("is_popular").default(false),
  isFeatured: boolean("is_featured").default(false),
  averageRating: doublePrecision("average_rating"),
  totalCompletions: integer("total_completions").default(0),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  metadata: jsonb("metadata"), // Additional task data
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  isActive: boolean("is_active").default(true).notNull(),
});

export const taskQuestions = pgTable("task_questions", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id")
    .references(() => tasks.id)
    .notNull(),
  question: text("question").notNull(),
  type: varchar("type", { length: 20 }).notNull(), // text, number, boolean, select, etc.
  options: jsonb("options"), // For select type
  isRequired: boolean("is_required").default(false),
  displayOrder: integer("display_order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const taskFaqs = pgTable("task_faqs", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id")
    .references(() => tasks.id)
    .notNull(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  displayOrder: integer("display_order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// export const serviceRelations = relations(services, ({ many, one }) => ({
//   proivder: one(providers, {
//     fields: [services.providerId],
//     references: [providers.id],
//   }),
//   service: one(services, {
//     fields: [services.serviceId],
//     references: [services.id],
//   }),
//   bookings: many(bookings),
//   reviews: many(reviews),
// }));

export type Task = InferSelectModel<typeof tasks>;
export type NewTask = InferInsertModel<typeof tasks>;
export type TaskQuestion = InferSelectModel<typeof taskQuestions>;
export type NewTaskQuestion = InferInsertModel<typeof taskQuestions>;
export type TaskFaq = InferSelectModel<typeof taskFaqs>;
export type NewTaskFaq = InferInsertModel<typeof taskFaqs>;
