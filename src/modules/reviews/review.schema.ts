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
import { providers } from "../providers/provider.schema";
import { users } from "../users/user.schema";
import { services } from "../services/services.schema";
import { bookings } from "../bookings/booking.schema";

export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  serviceId: integer("service_id").references(() => services.id),
  bookingId: integer("booking_id").references(() => bookings.id),
  providerId: integer("provider_id")
    .references(() => providers.id)
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
  service: one(services, {
    fields: [reviews.serviceId],
    references: [services.id],
  }),
  provider: one(providers, {
    fields: [reviews.providerId],
    references: [providers.id],
  }),
}));

export type Review = InferSelectModel<typeof reviews>;
export type NewReview = InferInsertModel<typeof reviews>;
