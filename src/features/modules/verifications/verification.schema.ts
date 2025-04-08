import {
  pgTable,
  serial,
  integer,
  varchar,
  text,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { users } from "../users/user.schema";
import { taskers } from "../taskers/tasker.schema";

export const verificationTypes = [
  "bvn",
  "nin",
  "id_card",
  "passport",
  "drivers_license",
] as const;
export type VerificationType = (typeof verificationTypes)[number];

export const verificationStatuses = [
  "pending",
  "in_review",
  "verified",
  "rejected",
] as const;
export type VerificationStatus = (typeof verificationStatuses)[number];

export const verifications = pgTable("verifications", {
  id: serial("id").primaryKey(),
  taskerId: integer("tasker_id")
    .references(() => taskers.id)
    .notNull(),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  type: varchar("type", { length: 20 }).notNull(), // bvn, nin, id_card, passport, drivers_license
  identifier: varchar("identifier", { length: 50 }).notNull(), // The actual BVN, NIN, ID number
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, in_review, verified, rejected
  verifiedAt: timestamp("verified_at"),
  rejectionReason: text("rejection_reason"),
  documentFront: text("document_front"), // URL to front of document image
  documentBack: text("document_back"), // URL to back of document image
  selfieWithDocument: text("selfie_with_document"), // URL to selfie with document
  metadata: jsonb("metadata"), // Additional verification data
  verificationProvider: varchar("verification_provider", { length: 50 }), // Third-party provider used
  verificationReference: varchar("verification_reference", { length: 100 }), // Reference from verification provider
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const verificationLogs = pgTable("verification_logs", {
  id: serial("id").primaryKey(),
  verificationId: integer("verification_id")
    .references(() => verifications.id)
    .notNull(),
  status: varchar("status", { length: 20 }).notNull(),
  message: text("message"),
  performedBy: integer("performed_by").references(() => users.id),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Verification = InferSelectModel<typeof verifications>;
export type NewVerification = InferInsertModel<typeof verifications>;
export type VerificationLog = InferSelectModel<typeof verificationLogs>;
export type NewVerificationLog = InferInsertModel<typeof verificationLogs>;
