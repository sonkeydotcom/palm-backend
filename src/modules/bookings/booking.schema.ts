import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

import { users } from "../users/user.schema";

import { InferSelectModel, relations, sql } from "drizzle-orm";
import { taskers, taskerSkills } from "../taskers/tasker.schema";
import { tasks } from "../tasks/task.schema";
import { locations } from "../locations/location.schema";

export const statusEnum = pgEnum("booking_status", [
  "pending",
  "confirmed",
  "cancelled",
  "completed",
  "rescheduled",
  "rejected",
  "in_progress",
]);

export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  taskerId: integer("tasker_id")
    .references(() => taskers.id)
    .notNull(),
  taskId: integer("task_id")
    .references(() => tasks.id)
    .notNull(),
  taskerSkillId: integer("tasker_skill_id")
    .references(() => taskerSkills.id)
    .notNull(),
  locationId: integer("location_id").references(() => locations.id),
  taskDetails: text("task_details"),
  taskResponses: jsonb("task_responses"), // Responses to task questions
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  status: statusEnum().notNull().default("pending"), // pending, confirmed, cancelled, completed
  notes: text("notes"), // for cancelled or rescheduled bookings
  totalPrice: integer("total_price"),
  paymentStatus: varchar("payment_status", { length: 20 }).default("unpaid"), // unpaid, paid, refunded
  paymentMethod: varchar("payment_method", { length: 20 }), // e.g. PayPal, Stripe, etc.
  //   bookingHistory: jsonb("booking_history"), // JSON array of previous bookings (if any)
  createdAt: timestamp("created_at")
    .default(sql`now()`)
    .notNull(),
  updatedAt: timestamp("updated_at")
    .default(sql`now()`)
    .notNull(),
  cancelledAt: timestamp("cancelled_at"),
  cancellationReason: text("cancellation_reason"),
  cancellationFee: integer("cancellation_fee"), // in cents
  isRescheduled: boolean("is_rescheduled").default(false),
  //   previousBookingId: integer("previous_booking_id").references(
  //     () => bookings.id
  //   ),
});

export const bookingMessages = pgTable("booking_messages", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id")
    .references(() => bookings.id)
    .notNull(),
  senderId: integer("sender_id")
    .references(() => users.id)
    .notNull(),
  message: text("message").notNull(),
  attachments: jsonb("attachments"), // Array of attachment URLs
  isRead: boolean("is_read").default(false),
  readAt: timestamp("read_at").default(sql`now()`),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const bookingsRelations = relations(bookings, ({ one }) => ({
  user: one(users, {
    fields: [bookings.userId],
    references: [users.id],
  }),
  task: one(tasks, {
    fields: [bookings.taskId],
    references: [tasks.id],
  }),
  tasker: one(taskers, {
    fields: [bookings.taskerId],
    references: [taskers.id],
  }),
}));

export type Booking = InferSelectModel<typeof bookings>;
export type NewBooking = InferSelectModel<typeof bookings>;
export type BookingMessage = InferSelectModel<typeof bookingMessages>;
