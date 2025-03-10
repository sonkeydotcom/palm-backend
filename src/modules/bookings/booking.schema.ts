import {
  boolean,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { providers } from "../providers/provider.schema";
import { users } from "../users/user.schema";
import { services } from "../services/services.schema";
import { InferSelectModel, sql } from "drizzle-orm";

export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  proivderId: integer("provider_id")
    .references(() => providers.id)
    .notNull(),
  serviceId: integer("service_id")
    .references(() => services.id)
    .notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, confirmed, cancelled, completed
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
  isRescheduled: boolean("is_rescheduled").default(false),
  //   previousBookingId: integer("previous_booking_id").references(
  //     () => bookings.id
  //   ),
});

export type Booking = InferSelectModel<typeof bookings>;
export type NewBooking = InferSelectModel<typeof bookings>;
