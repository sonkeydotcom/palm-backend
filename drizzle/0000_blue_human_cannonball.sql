CREATE TABLE "bookings" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"provider_id" integer NOT NULL,
	"service_id" integer NOT NULL,
	"start_time" timestamp NOT NULL,
	"end_time" timestamp NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"notes" text,
	"total_price" integer,
	"payment_status" varchar(20) DEFAULT 'unpaid',
	"payment_method" varchar(20),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"cancelled_at" timestamp,
	"cancellation_reason" text,
	"is_rescheduled" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" varchar(255),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "subcategories" (
	"id" serial PRIMARY KEY NOT NULL,
	"category_id" serial NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" varchar(255),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "subcategories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "locations" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"label" varchar(50) DEFAULT 'home' NOT NULL,
	"address" varchar(255),
	"city" varchar(100),
	"state" varchar(100),
	"longitude" varchar(100),
	"latitude" varchar(100),
	"is_default" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "payment_disputes" (
	"id" serial PRIMARY KEY NOT NULL,
	"payment_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"provider_id" integer NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'USD' NOT NULL,
	"status" varchar(50) NOT NULL,
	"reason" varchar(100) NOT NULL,
	"description" text,
	"evidence" jsonb,
	"due_by" timestamp,
	"gateway_reference" varchar(255),
	"gateway_response" jsonb,
	"resolved_at" timestamp,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "payment_methods" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"type" varchar(50) NOT NULL,
	"is_default" boolean DEFAULT false,
	"card_brand" varchar(50),
	"last_four_digits" varchar(4),
	"expiry_month" varchar(2),
	"expiry_year" varchar(4),
	"holder_name" varchar(255),
	"billing_address" jsonb,
	"payment_token" text,
	"is_verified" boolean DEFAULT false,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "payment_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"provider_id" integer NOT NULL,
	"platform_fee_percentage" numeric(5, 2) DEFAULT '10.00',
	"payout_schedule" varchar(50) DEFAULT 'weekly',
	"payout_day" varchar(20),
	"minimum_payout_amount" numeric(10, 2) DEFAULT '50.00',
	"auto_payout_enabled" boolean DEFAULT true,
	"tax_withholding_enabled" boolean DEFAULT false,
	"tax_withholding_percentage" numeric(5, 2),
	"cancelation_fee_enabled" boolean DEFAULT false,
	"cancelation_fee_amount" numeric(10, 2),
	"cancelation_fee_percentage" numeric(5, 2),
	"refund_policy" varchar(50) DEFAULT 'flexible',
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"transaction_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"provider_id" integer NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'USD' NOT NULL,
	"status" varchar(50) NOT NULL,
	"payment_method_id" integer,
	"payment_type" varchar(50) NOT NULL,
	"gateway_reference" varchar(255),
	"gateway_response" jsonb,
	"refund_status" varchar(50),
	"refund_amount" numeric(10, 2),
	"refund_reason" text,
	"refund_date" timestamp,
	"customer_ip" varchar(50),
	"billing_address" jsonb,
	"metadata" jsonb,
	"description" text,
	"receipt_url" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "payments_transaction_id_unique" UNIQUE("transaction_id")
);
--> statement-breakpoint
CREATE TABLE "payout_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"provider_id" integer NOT NULL,
	"account_type" varchar(50) NOT NULL,
	"account_holder_name" varchar(255) NOT NULL,
	"account_holder_type" varchar(50),
	"bank_name" varchar(255),
	"account_number" varchar(255),
	"routing_number" varchar(255),
	"currency" varchar(3) DEFAULT 'USD',
	"country" varchar(2) DEFAULT 'US',
	"is_verified" boolean DEFAULT false,
	"is_default" boolean DEFAULT false,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "payouts" (
	"id" serial PRIMARY KEY NOT NULL,
	"transaction_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"provider_id" integer NOT NULL,
	"payout_account_id" integer NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"fee" numeric(10, 2) DEFAULT '0',
	"currency" varchar(3) DEFAULT 'USD' NOT NULL,
	"status" varchar(50) NOT NULL,
	"payout_method" varchar(50) NOT NULL,
	"description" text,
	"gateway_reference" varchar(255),
	"gateway_response" jsonb,
	"estimated_arrival_date" timestamp,
	"failure_reason" text,
	"payment_ids" jsonb,
	"statement_descriptor" varchar(255),
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "payouts_transaction_id_unique" UNIQUE("transaction_id")
);
--> statement-breakpoint
CREATE TABLE "platform_ledger" (
	"id" serial PRIMARY KEY NOT NULL,
	"transaction_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"payment_id" integer,
	"payout_id" integer,
	"type" varchar(50) NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'USD' NOT NULL,
	"description" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "platform_ledger_transaction_id_unique" UNIQUE("transaction_id")
);
--> statement-breakpoint
CREATE TABLE "providers" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"business_name" varchar(255) NOT NULL,
	"description" text,
	"logo" text,
	"website" text,
	"location_id" integer,
	"business_hours" jsonb,
	"is_verified" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_seen" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"service_id" integer,
	"booking_id" integer,
	"provider_id" integer NOT NULL,
	"rating" numeric(3, 1) NOT NULL,
	"comment" text,
	"response" text,
	"response_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" serial PRIMARY KEY NOT NULL,
	"provider_id" integer NOT NULL,
	"category_id" integer,
	"name" varchar(255) NOT NULL,
	"description" text,
	"price" numeric(10, 2),
	"duration" integer,
	"images" jsonb,
	"availability" jsonb,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"password" varchar(255) NOT NULL,
	"role" varchar(20) DEFAULT 'user' NOT NULL,
	"first_name" varchar(255),
	"last_name" varchar(255),
	"phone" varchar(255),
	"avatar" varchar(255),
	"is_active" boolean DEFAULT true NOT NULL,
	"last_login" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subcategories" ADD CONSTRAINT "subcategories_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "locations" ADD CONSTRAINT "locations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_disputes" ADD CONSTRAINT "payment_disputes_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_disputes" ADD CONSTRAINT "payment_disputes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_disputes" ADD CONSTRAINT "payment_disputes_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_methods" ADD CONSTRAINT "payment_methods_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_settings" ADD CONSTRAINT "payment_settings_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_payment_method_id_payment_methods_id_fk" FOREIGN KEY ("payment_method_id") REFERENCES "public"."payment_methods"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payout_accounts" ADD CONSTRAINT "payout_accounts_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_payout_account_id_payout_accounts_id_fk" FOREIGN KEY ("payout_account_id") REFERENCES "public"."payout_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_ledger" ADD CONSTRAINT "platform_ledger_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_ledger" ADD CONSTRAINT "platform_ledger_payout_id_payouts_id_fk" FOREIGN KEY ("payout_id") REFERENCES "public"."payouts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "providers" ADD CONSTRAINT "providers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "providers" ADD CONSTRAINT "providers_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;