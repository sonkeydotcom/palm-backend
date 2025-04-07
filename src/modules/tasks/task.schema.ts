import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  timestamp,
  boolean,
  jsonb,
  pgEnum,
} from "drizzle-orm/pg-core";
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { taskers } from "../taskers/tasker.schema";
import { services } from "../services/service.schema";
import { locations } from "../locations/location.schema";
import { users } from "../users/user.schema";

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
  userId: integer("user_id").references(() => users.id),
  serviceId: integer("service_id").references(() => services.id),
  locationId: integer("location_id").references(() => locations.id),
  status: statusEnum().default("pending"), // pending, accepted, rejected, completed
  requiredEquipment: jsonb("required_equipment"), // Equipment needed for this task
  requiredSkills: jsonb("required_skills"), // Skills needed for this task
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  metadata: jsonb("metadata"), // Additional task data
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
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
