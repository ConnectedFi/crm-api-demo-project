CREATE TABLE "financing_participants" (
	"financing_uuid" uuid,
	"person_uuid" uuid,
	"role" text NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "financing_participants_pkey" PRIMARY KEY("financing_uuid","person_uuid")
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"organization_uuid" uuid PRIMARY KEY,
	"name" text NOT NULL,
	"registration_number" text NOT NULL,
	"type" text NOT NULL,
	"website" text,
	"street" text NOT NULL,
	"city" text NOT NULL,
	"state" text NOT NULL,
	"zip" text NOT NULL,
	"country" text,
	"cfi_created_at" timestamp with time zone NOT NULL,
	"cfi_updated_at" timestamp with time zone NOT NULL,
	"archived_at" timestamp with time zone,
	"cfi_synced_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "applicants" ADD COLUMN "cfi_created_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "applicants" ADD COLUMN "cfi_updated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "applicants" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "financing_applications" ADD COLUMN "organization_uuid" uuid;--> statement-breakpoint
ALTER TABLE "financing_applications" ADD COLUMN "currency" text DEFAULT 'USD' NOT NULL;--> statement-breakpoint
ALTER TABLE "financing_applications" ADD COLUMN "cfi_created_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "financing_applications" ADD COLUMN "cfi_updated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "financing_applications" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "financing_applications" ALTER COLUMN "webhook_active" SET DEFAULT false;--> statement-breakpoint
ALTER TABLE "financing_applications" ADD CONSTRAINT "financing_applications_lsgBTdaULohK_fkey" FOREIGN KEY ("organization_uuid") REFERENCES "organizations"("organization_uuid") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "financing_participants" ADD CONSTRAINT "financing_participants_S6U1kttcFOqK_fkey" FOREIGN KEY ("financing_uuid") REFERENCES "financing_applications"("financing_uuid") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "financing_participants" ADD CONSTRAINT "financing_participants_person_uuid_applicants_person_uuid_fkey" FOREIGN KEY ("person_uuid") REFERENCES "applicants"("person_uuid") ON DELETE CASCADE;