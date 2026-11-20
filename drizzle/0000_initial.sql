CREATE SCHEMA IF NOT EXISTS "factureci";
--> statement-breakpoint
CREATE TYPE "factureci"."document_status" AS ENUM('draft', 'sent', 'partial', 'paid', 'overdue', 'cancelled', 'delivered');--> statement-breakpoint
CREATE TYPE "factureci"."document_type" AS ENUM('FAC', 'DEV', 'BL', 'PRO', 'BC');--> statement-breakpoint
CREATE TYPE "factureci"."user_role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TABLE "factureci"."admin_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_id" uuid NOT NULL,
	"action" text NOT NULL,
	"target_user_id" uuid,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "factureci"."clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"email" text,
	"address" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "factureci"."companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"logo" text,
	"rccm" text,
	"tax_number" text,
	"address" text,
	"phone" text,
	"payment_numbers" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"default_note" text,
	"email" text,
	"website" text,
	"tagline" text,
	"bank_details" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "factureci"."counters" (
	"user_id" uuid NOT NULL,
	"type" "factureci"."document_type" NOT NULL,
	"year" integer NOT NULL,
	"last_number" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "counters_user_id_type_year_pk" PRIMARY KEY("user_id","type","year")
);
--> statement-breakpoint
CREATE TABLE "factureci"."document_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"description" text NOT NULL,
	"quantity" numeric(12, 2) DEFAULT 1 NOT NULL,
	"unit_price" bigint DEFAULT 0 NOT NULL,
	"unit" text,
	"quantity_delivered" numeric(12, 2),
	"observation" text
);
--> statement-breakpoint
CREATE TABLE "factureci"."documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"client_id" uuid,
	"type" "factureci"."document_type" NOT NULL,
	"number" text NOT NULL,
	"status" "factureci"."document_status" DEFAULT 'draft' NOT NULL,
	"issue_date" date NOT NULL,
	"due_date" date,
	"discount_percent" numeric(5, 2) DEFAULT 0 NOT NULL,
	"vat_percent" integer DEFAULT 0 NOT NULL,
	"subtotal" bigint DEFAULT 0 NOT NULL,
	"discount_amount" bigint DEFAULT 0 NOT NULL,
	"vat_amount" bigint DEFAULT 0 NOT NULL,
	"total" bigint DEFAULT 0 NOT NULL,
	"note" text,
	"payment_methods" text[] DEFAULT '{}'::text[] NOT NULL,
	"delivery_address" text,
	"delivered_by" text,
	"subject" text,
	"client_reference" text,
	"source_document_id" uuid,
	"share_token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "documents_share_token_unique" UNIQUE("share_token")
);
--> statement-breakpoint
CREATE TABLE "factureci"."installments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"label" text NOT NULL,
	"amount" bigint NOT NULL,
	"due_date" date,
	"paid_at" timestamp with time zone,
	"method" text
);
--> statement-breakpoint
CREATE TABLE "factureci"."rate_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"reset_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "factureci"."users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"password_hash" text NOT NULL,
	"name" text NOT NULL,
	"role" "factureci"."user_role" DEFAULT 'user' NOT NULL,
	"suspended_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
ALTER TABLE "factureci"."admin_actions" ADD CONSTRAINT "admin_actions_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "factureci"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factureci"."admin_actions" ADD CONSTRAINT "admin_actions_target_user_id_users_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "factureci"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factureci"."clients" ADD CONSTRAINT "clients_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "factureci"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factureci"."companies" ADD CONSTRAINT "companies_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "factureci"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factureci"."counters" ADD CONSTRAINT "counters_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "factureci"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factureci"."document_items" ADD CONSTRAINT "document_items_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "factureci"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factureci"."documents" ADD CONSTRAINT "documents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "factureci"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factureci"."documents" ADD CONSTRAINT "documents_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "factureci"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factureci"."installments" ADD CONSTRAINT "installments_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "factureci"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admin_actions_created_at_idx" ON "factureci"."admin_actions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "clients_user_id_idx" ON "factureci"."clients" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "companies_user_id_key" ON "factureci"."companies" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "document_items_document_id_idx" ON "factureci"."document_items" USING btree ("document_id");--> statement-breakpoint
CREATE UNIQUE INDEX "documents_user_type_number_key" ON "factureci"."documents" USING btree ("user_id","type","number");--> statement-breakpoint
CREATE INDEX "documents_user_id_idx" ON "factureci"."documents" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "documents_client_id_idx" ON "factureci"."documents" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "installments_document_id_idx" ON "factureci"."installments" USING btree ("document_id");