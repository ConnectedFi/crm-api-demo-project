ALTER TABLE "seed_world_orders" ADD COLUMN "cfi_draw_failure" jsonb;--> statement-breakpoint
ALTER TABLE "seed_world_orders" ADD COLUMN "cfi_draw_updated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "seed_world_orders" ADD COLUMN "cfi_draw_completed_at" timestamp with time zone;