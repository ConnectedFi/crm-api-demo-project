CREATE TABLE "applicant_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"applicant_uuid" uuid NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "applicant_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"applicant_uuid" uuid NOT NULL,
	"title" text NOT NULL,
	"due_date" date,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "applicant_notes" ADD CONSTRAINT "applicant_notes_applicant_uuid_applicants_person_uuid_fkey" FOREIGN KEY ("applicant_uuid") REFERENCES "applicants"("person_uuid") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "applicant_tasks" ADD CONSTRAINT "applicant_tasks_applicant_uuid_applicants_person_uuid_fkey" FOREIGN KEY ("applicant_uuid") REFERENCES "applicants"("person_uuid") ON DELETE CASCADE;