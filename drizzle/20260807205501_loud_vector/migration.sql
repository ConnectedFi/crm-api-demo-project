CREATE TABLE "seed_world_orders" (
	"order_uuid" uuid PRIMARY KEY,
	"invoice_ref" text NOT NULL UNIQUE,
	"customer_person_uuid" uuid,
	"customer_name" text NOT NULL,
	"customer_email" text NOT NULL,
	"items" jsonb NOT NULL,
	"total_cents" text NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"payment_method" text NOT NULL,
	"order_status" text NOT NULL,
	"cfi_financing_uuid" uuid,
	"cfi_draw_uuid" uuid,
	"cfi_draw_status" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
