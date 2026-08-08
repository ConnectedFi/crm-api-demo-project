CREATE TABLE "application_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"financing_uuid" uuid NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "application_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"financing_uuid" uuid NOT NULL,
	"title" text NOT NULL,
	"due_date" date,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "financing_applications" (
	"financing_uuid" uuid PRIMARY KEY,
	"applicant_uuid" uuid NOT NULL,
	"status" text NOT NULL,
	"raw_status" text NOT NULL,
	"requested_cents" text,
	"loan_uuid" uuid,
	"crop_year" integer,
	"approved_cents" text,
	"available_cents" text,
	"available_pending_cents" text,
	"drawn_cents" text,
	"reserved_cents" text,
	"estimated_payoff_cents" text,
	"webhook_active" boolean NOT NULL,
	"crm_stage" text DEFAULT 'new' NOT NULL,
	"cfi_synced_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "application_notes" ADD CONSTRAINT "application_notes_0ajikA5tEqPC_fkey" FOREIGN KEY ("financing_uuid") REFERENCES "financing_applications"("financing_uuid") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "application_tasks" ADD CONSTRAINT "application_tasks_U49M4SEkr9cF_fkey" FOREIGN KEY ("financing_uuid") REFERENCES "financing_applications"("financing_uuid") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "financing_applications" ADD CONSTRAINT "financing_applications_wNUszQOindTi_fkey" FOREIGN KEY ("applicant_uuid") REFERENCES "applicants"("person_uuid") ON DELETE CASCADE;