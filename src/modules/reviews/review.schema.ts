import {
  InferInsertModel,
  InferSelectModel,
  relations,
  sql,
} from "drizzle-orm";
import {
  integer,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import { users } from "../users/user.schema";

import { bookings } from "../bookings/booking.schema";
import { tasks } from "../tasks/task.schema";
import { taskers } from "../tasker/tasker.schema";

export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  taskId: integer("service_id").references(() => tasks.id),
  bookingId: integer("booking_id").references(() => bookings.id),
  taskerId: integer("provider_id")
    .references(() => taskers.id)
    .notNull(),
  rating: numeric("rating", { precision: 3, scale: 1 }).notNull(), // Rating out of 5
  comment: text("comment"),
  response: text("response"), // Provider's response to the review
  responseAt: timestamp("response_at"), // When the provider responded to the review
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

export const reviewsRelations = relations(reviews, ({ one }) => ({
  user: one(users, {
    fields: [reviews.userId],
    references: [users.id],
  }),
  service: one(tasks, {
    fields: [reviews.taskId],
    references: [tasks.id],
  }),
  provider: one(taskers, {
    fields: [reviews.taskerId],
    references: [taskers.id],
  }),
}));

export type Review = InferSelectModel<typeof reviews>;
export type NewReview = InferInsertModel<typeof reviews>;
