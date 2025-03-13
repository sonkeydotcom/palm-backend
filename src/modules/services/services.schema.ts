import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { providers } from "../providers/provider.schema";
import { categories } from "../categories/category.schema";
import { InferInsertModel, InferSelectModel, relations } from "drizzle-orm";
import { bookings } from "../bookings/booking.schema";
import { reviews } from "../reviews/review.schema";

export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  providerId: integer("provider_id")
    .references(() => providers.id)
    .notNull(),
  categoryId: integer("category_id").references(() => categories.id),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  price: numeric("price", { precision: 10, scale: 2 }),
  duration: integer("duration"), // Duration in minutes
  images: jsonb("images"), // Array of image URLs
  availability: jsonb("availability"), // JSON object with availability slots
  isActive: boolean("is_active").default(true),
  isPopular: boolean("is_popular").default(false),
  isFeatured: boolean("is_featured").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const serviceRelations = relations(services, ({ many, one }) => ({
  proivder: one(providers, {
    fields: [services.providerId],
    references: [providers.id],
  }),
  category: one(categories, {
    fields: [services.categoryId],
    references: [categories.id],
  }),
  bookings: many(bookings),
  reviews: many(reviews),
}));

export type Service = InferSelectModel<typeof services>;
export type NewService = InferInsertModel<typeof services>;
