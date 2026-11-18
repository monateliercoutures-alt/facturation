ALTER TYPE "public"."document_type" ADD VALUE 'PRO';--> statement-breakpoint
ALTER TYPE "public"."document_type" ADD VALUE 'BC';--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "email" text;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "website" text;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "tagline" text;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "bank_details" text;--> statement-breakpoint
ALTER TABLE "document_items" ADD COLUMN "unit" text;--> statement-breakpoint
ALTER TABLE "document_items" ADD COLUMN "quantity_delivered" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "document_items" ADD COLUMN "observation" text;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "subject" text;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "client_reference" text;