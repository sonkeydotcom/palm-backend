// src/db/schema/payments.schema.ts
import {
  pgTable,
  serial,
  varchar,
  timestamp,
  numeric,
  integer,
  boolean,
  jsonb,
  text,
  uuid,
} from "drizzle-orm/pg-core";
import { InferInsertModel, InferSelectModel, relations } from "drizzle-orm";
import { users } from "../users/user.schema";
import { bookings } from "../bookings/booking.schema";
import { taskers } from "../taskers/tasker.schema";

// Schema for payment methods stored by users
export const paymentMethods = pgTable("payment_methods", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  type: varchar("type", { length: 50 }).notNull(), // credit_card, paypal, bank_account, etc.
  isDefault: boolean("is_default").default(false),
  cardBrand: varchar("card_brand", { length: 50 }), // visa, mastercard, etc.
  lastFourDigits: varchar("last_four_digits", { length: 4 }),
  expiryMonth: varchar("expiry_month", { length: 2 }),
  expiryYear: varchar("expiry_year", { length: 4 }),
  holderName: varchar("holder_name", { length: 255 }),
  billingAddress: jsonb("billing_address"), // Address details as JSON
  paymentToken: text("payment_token"), // Tokenized payment information from payment processor
  isVerified: boolean("is_verified").default(false),
  metadata: jsonb("metadata"), // Additional payment method data
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const paymentMethodsRelations = relations(paymentMethods, ({ one }) => ({
  user: one(users, {
    fields: [paymentMethods.userId],
    references: [users.id],
  }),
}));

// Schema for storing payment transactions
export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  transactionId: uuid("transaction_id").defaultRandom().notNull().unique(), // Unique transaction ID
  bookingId: integer("booking_id")
    .references(() => bookings.id)
    .notNull(),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  taskerId: integer("tasker_id")
    .references(() => taskers.id)
    .notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("USD").notNull(),
  status: varchar("status", { length: 50 }).notNull(), // pending, completed, failed, refunded
  paymentMethodId: integer("payment_method_id").references(
    () => paymentMethods.id
  ),
  paymentType: varchar("payment_type", { length: 50 }).notNull(), // card, paypal, bank_transfer, etc.
  gatewayReference: varchar("gateway_reference", { length: 255 }), // Reference ID from payment gateway
  gatewayResponse: jsonb("gateway_response"), // Full response from payment gateway
  refundStatus: varchar("refund_status", { length: 50 }), // none, partial, full
  refundAmount: numeric("refund_amount", { precision: 10, scale: 2 }),
  refundReason: text("refund_reason"),
  refundDate: timestamp("refund_date"),
  customerIp: varchar("customer_ip", { length: 50 }),
  billingAddress: jsonb("billing_address"), // Billing address used for payment
  metadata: jsonb("metadata"), // Additional payment data
  description: text("description"),
  receiptUrl: text("receipt_url"), // URL to payment receipt
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const paymentsRelations = relations(payments, ({ one }) => ({
  booking: one(bookings, {
    fields: [payments.bookingId],
    references: [bookings.id],
  }),
  user: one(users, {
    fields: [payments.userId],
    references: [users.id],
  }),
  provider: one(taskers, {
    fields: [payments.taskerId],
    references: [taskers.id],
  }),
  paymentMethod: one(paymentMethods, {
    fields: [payments.paymentMethodId],
    references: [paymentMethods.id],
  }),
}));

// Schema for managing payout details for service taskers
export const payoutAccounts = pgTable("payout_accounts", {
  id: serial("id").primaryKey(),
  taskerId: integer("tasker_id")
    .references(() => taskers.id)
    .notNull(),
  accountType: varchar("account_type", { length: 50 }).notNull(), // bank_account, paypal, etc.
  accountHolderName: varchar("account_holder_name", { length: 255 }).notNull(),
  accountHolderType: varchar("account_holder_type", { length: 50 }), // individual, company
  bankName: varchar("bank_name", { length: 255 }),
  accountNumber: varchar("account_number", { length: 255 }), // Encrypted
  routingNumber: varchar("routing_number", { length: 255 }), // Encrypted
  currency: varchar("currency", { length: 3 }).default("USD"),
  country: varchar("country", { length: 2 }).default("US"), // ISO country code
  isVerified: boolean("is_verified").default(false),
  isDefault: boolean("is_default").default(false),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const payoutAccountsRelations = relations(payoutAccounts, ({ one }) => ({
  provider: one(taskers, {
    fields: [payoutAccounts.taskerId],
    references: [taskers.id],
  }),
}));

// Schema for tracking payouts to service taskers
export const payouts = pgTable("payouts", {
  id: serial("id").primaryKey(),
  transactionId: uuid("transaction_id").defaultRandom().notNull().unique(), // Unique payout transaction ID
  taskerId: integer("tasker_id")
    .references(() => taskers.id)
    .notNull(),
  payoutAccountId: integer("payout_account_id")
    .references(() => payoutAccounts.id)
    .notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  fee: numeric("fee", { precision: 10, scale: 2 }).default("0"),
  currency: varchar("currency", { length: 3 }).default("USD").notNull(),
  status: varchar("status", { length: 50 }).notNull(), // pending, completed, failed
  payoutMethod: varchar("payout_method", { length: 50 }).notNull(), // bank_transfer, paypal, etc.
  description: text("description"),
  gatewayReference: varchar("gateway_reference", { length: 255 }),
  gatewayResponse: jsonb("gateway_response"),
  estimatedArrivalDate: timestamp("estimated_arrival_date"),
  failureReason: text("failure_reason"),
  paymentIds: jsonb("payment_ids"), // Array of payment IDs included in this payout
  statementDescriptor: varchar("statement_descriptor", { length: 255 }), // Description that appears on provider's bank statement
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const payoutsRelations = relations(payouts, ({ one }) => ({
  provider: one(taskers, {
    fields: [payouts.taskerId],
    references: [taskers.id],
  }),
  payoutAccount: one(payoutAccounts, {
    fields: [payouts.payoutAccountId],
    references: [payoutAccounts.id],
  }),
}));

// Schema for payment settings (e.g., platform fees, payout schedules)
export const paymentSettings = pgTable("payment_settings", {
  id: serial("id").primaryKey(),
  taskerId: integer("tasker_id")
    .references(() => taskers.id)
    .notNull(),
  platformFeePercentage: numeric("platform_fee_percentage", {
    precision: 5,
    scale: 2,
  }).default("10.00"),
  payoutSchedule: varchar("payout_schedule", { length: 50 }).default("weekly"), // daily, weekly, biweekly, monthly
  payoutDay: varchar("payout_day", { length: 20 }), // monday, 1, 15, etc. depending on schedule
  minimumPayoutAmount: numeric("minimum_payout_amount", {
    precision: 10,
    scale: 2,
  }).default("50.00"),
  autoPayoutEnabled: boolean("auto_payout_enabled").default(true),
  taxWithholdingEnabled: boolean("tax_withholding_enabled").default(false),
  taxWithholdingPercentage: numeric("tax_withholding_percentage", {
    precision: 5,
    scale: 2,
  }),
  cancelationFeeEnabled: boolean("cancelation_fee_enabled").default(false),
  cancelationFeeAmount: numeric("cancelation_fee_amount", {
    precision: 10,
    scale: 2,
  }),
  cancelationFeePercentage: numeric("cancelation_fee_percentage", {
    precision: 5,
    scale: 2,
  }),
  refundPolicy: varchar("refund_policy", { length: 50 }).default("flexible"), // strict, moderate, flexible
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const paymentSettingsRelations = relations(
  paymentSettings,
  ({ one }) => ({
    provider: one(taskers, {
      fields: [paymentSettings.taskerId],
      references: [taskers.id],
    }),
  })
);

// Schema for platform revenue/transactions ledger
export const platformLedger = pgTable("platform_ledger", {
  id: serial("id").primaryKey(),
  transactionId: uuid("transaction_id").defaultRandom().notNull().unique(),
  paymentId: integer("payment_id").references(() => payments.id),
  payoutId: integer("payout_id").references(() => payouts.id),
  type: varchar("type", { length: 50 }).notNull(), // fee_collection, refund, payout, adjustment
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("USD").notNull(),
  description: text("description"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const platformLedgerRelations = relations(platformLedger, ({ one }) => ({
  payment: one(payments, {
    fields: [platformLedger.paymentId],
    references: [payments.id],
    relationName: "payment_ledger",
  }),
  payout: one(payouts, {
    fields: [platformLedger.payoutId],
    references: [payouts.id],
    relationName: "payout_ledger",
  }),
}));

// Schema for payment disputes/chargebacks
export const paymentDisputes = pgTable("payment_disputes", {
  id: serial("id").primaryKey(),
  paymentId: integer("payment_id")
    .references(() => payments.id)
    .notNull(),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  taskerId: integer("tasker_id")
    .references(() => taskers.id)
    .notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("USD").notNull(),
  status: varchar("status", { length: 50 }).notNull(), // pending, won, lost, withdrawn
  reason: varchar("reason", { length: 100 }).notNull(),
  description: text("description"),
  evidence: jsonb("evidence"), // Evidence submitted for dispute
  dueBy: timestamp("due_by"), // When evidence must be submitted by
  gatewayReference: varchar("gateway_reference", { length: 255 }),
  gatewayResponse: jsonb("gateway_response"),
  resolvedAt: timestamp("resolved_at"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const paymentDisputesRelations = relations(
  paymentDisputes,
  ({ one }) => ({
    payment: one(payments, {
      fields: [paymentDisputes.paymentId],
      references: [payments.id],
    }),
    user: one(users, {
      fields: [paymentDisputes.userId],
      references: [users.id],
    }),
    provider: one(taskers, {
      fields: [paymentDisputes.taskerId],
      references: [taskers.id],
    }),
  })
);

export type PaymentMethod = InferSelectModel<typeof paymentMethods>;
export type NewPaymentMethod = InferInsertModel<typeof paymentMethods>;
export type PaymentDisputeRelations = typeof paymentDisputesRelations;
export type PaymentRelations = typeof paymentsRelations;
export type PayoutAccount = InferSelectModel<typeof payoutAccounts>;
export type NewPayoutAccount = InferInsertModel<typeof payoutAccounts>;
export type Payment = InferSelectModel<typeof payments>;
export type NewPayment = InferInsertModel<typeof payments>;
export type PayoutAccountRelations = typeof payoutAccountsRelations;
export type Payout = InferSelectModel<typeof payouts>;
export type NewPayout = InferInsertModel<typeof payouts>;
export type PayoutRelations = typeof payoutsRelations;
export type PaymentSetting = typeof paymentSettings;
export type PaymentSettingRelations = typeof paymentSettingsRelations;
export type PlatformLedger = typeof platformLedger;
export type PlatformLedgerRelations = typeof platformLedgerRelations;
export type PaymentDispute = typeof paymentDisputes;
