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
} from "drizzle-orm/pg-core";
import {
  relations,
  type InferInsertModel,
  type InferSelectModel,
} from "drizzle-orm";
import { users } from "../../modules/users/user.schema";
import { locations } from "../../modules/locations/location.schema";
import { services } from "../../tasking/services/service.schema";
import { tasks } from "../tasks/task.schema";
import { bookings } from "../bookings/booking.schema";
import { reviews } from "../../modules/reviews/review.schema";

export const taskers = pgTable("taskers", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  headline: varchar("headline", { length: 255 }),
  bio: text("bio"),
  profilePhoto: text("profile_photo"),
  coverPhoto: text("cover_photo"),
  gallery: jsonb("gallery"), // Array of photo URLs
  locationId: integer("location_id").references(() => locations.id),
  workRadius: integer("work_radius"), // in miles/km
  availability: jsonb("availability"), // Weekly availability schedule
  languages: jsonb("languages"), // Languages spoken
  education: jsonb("education"), // Education history
  workExperience: jsonb("work_experience"), // Work experience
  averageRating: doublePrecision("average_rating"),
  totalReviews: integer("total_reviews").default(0),
  totalTasksCompleted: integer("total_tasks_completed").default(0),
  responseRate: doublePrecision("response_rate"),
  responseTime: integer("response_time"), // Average response time in minutes
  completionRate: doublePrecision("completion_rate"),
  backgroundChecked: boolean("background_checked").default(false),
  identityVerified: boolean("identity_verified").default(false),
  phoneVerified: boolean("phone_verified").default(false),
  emailVerified: boolean("email_verified").default(false),
  bvnVerified: boolean("bvn_verified").default(false), // Added for BVN verification
  ninVerified: boolean("nin_verified").default(false), // Added for NIN verification
  isElite: boolean("is_elite").default(false), // Elite tasker status
  isActive: boolean("is_active").default(true).notNull(),
  lastSeen: timestamp("last_seen"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const taskerSkills = pgTable("tasker_skills", {
  id: serial("id").primaryKey(),
  taskerId: integer("tasker_id")
    .references(() => taskers.id)
    .notNull(),
  serviceId: integer("service_id")
    .references(() => services.id)
    .notNull(),
  hourlyRate: integer("hourly_rate").notNull(), // in cents
  quickPitch: text("quick_pitch"), // Short description of skill
  experience: text("experience"), // Experience in this service
  experienceYears: integer("experience_years"), // Years of experience
  hasEquipment: boolean("has_equipment").default(false),
  equipmentDescription: text("equipment_description"),
  isQuickAssign: boolean("is_quick_assign").default(false), // Available for quick assignments
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const taskerPortfolio = pgTable("tasker_portfolio", {
  id: serial("id").primaryKey(),
  taskerId: integer("tasker_id")
    .references(() => taskers.id)
    .notNull(),
  serviceId: integer("service_id").references(() => services.id),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  imageUrl: text("image_url").notNull(),
  displayOrder: integer("display_order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Tasker = InferSelectModel<typeof taskers>;
export type NewTasker = InferInsertModel<typeof taskers>;
export type TaskerSkill = InferSelectModel<typeof taskerSkills>;
export type NewTaskerSkill = InferInsertModel<typeof taskerSkills>;
export type TaskerPortfolioItem = InferSelectModel<typeof taskerPortfolio>;
export type NewTaskerPortfolioItem = InferInsertModel<typeof taskerPortfolio>;

export const taskerRelations = relations(taskers, ({ many, one }) => ({
  tasks: many(tasks),
  bookings: many(bookings),
  reviews: many(reviews),
  skills: many(taskerSkills),
  portfolio: one(taskerPortfolio),
  user: one(users, {
    fields: [taskers.userId],
    references: [users.id],
  }),
}));
