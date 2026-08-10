import {
  boolean,
  date,
  integer,
  jsonb,
  primaryKey,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core"

export type SeedWorldOrderItem = {
  productId: string
  name: string
  quantity: number
  unitPriceCents: number
}

export type CfiDrawRequest = {
  financingUuid: string
  idempotencyKey: string
  loanRef: string
  expectedMainApplicantPersonUuid: string
  amountMinor: string
  description: string
  trancheId: string
  invoiceRef: string
}

export const applicants = pgTable("applicants", {
  personUuid: uuid("person_uuid").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  street: text("street").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  zip: text("zip").notNull(),
  country: text("country"),
  farmName: text("farm_name"),
  cfiCreatedAt: timestamp("cfi_created_at", { withTimezone: true }),
  cfiUpdatedAt: timestamp("cfi_updated_at", { withTimezone: true }),
  archivedAt: timestamp("archived_at", { withTimezone: true }),

  // CRM-owned state. CFI imports deliberately do not overwrite these fields.
  stage: text("stage").notNull().default("new"),

  cfiSyncedAt: timestamp("cfi_synced_at", {
    withTimezone: true,
  }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export type Applicant = typeof applicants.$inferSelect

export const organizations = pgTable("organizations", {
  organizationUuid: uuid("organization_uuid").primaryKey(),
  name: text("name").notNull(),
  registrationNumber: text("registration_number"),
  type: text("type"),
  website: text("website"),
  street: text("street"),
  city: text("city"),
  state: text("state"),
  zip: text("zip"),
  country: text("country"),
  cfiCreatedAt: timestamp("cfi_created_at", { withTimezone: true }).notNull(),
  cfiUpdatedAt: timestamp("cfi_updated_at", { withTimezone: true }).notNull(),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  cfiSyncedAt: timestamp("cfi_synced_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const seedWorldOrders = pgTable("seed_world_orders", {
  orderUuid: uuid("order_uuid").primaryKey(),
  invoiceRef: text("invoice_ref").notNull().unique(),
  customerPersonUuid: uuid("customer_person_uuid"),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email").notNull(),
  items: jsonb("items").$type<Array<SeedWorldOrderItem>>().notNull(),
  totalCents: text("total_cents").notNull(),
  currency: text("currency").notNull().default("USD"),
  paymentMethod: text("payment_method").notNull(),
  orderStatus: text("order_status").notNull(),
  cfiFinancingUuid: uuid("cfi_financing_uuid"),
  cfiDrawUuid: uuid("cfi_draw_uuid"),
  cfiDrawStatus: text("cfi_draw_status"),
  cfiDrawRequest: jsonb("cfi_draw_request").$type<CfiDrawRequest | null>(),
  cfiDrawFailure: jsonb("cfi_draw_failure").$type<{
    reason: string
    retriable: boolean
    message: string
  } | null>(),
  cfiDrawUpdatedAt: timestamp("cfi_draw_updated_at", { withTimezone: true }),
  cfiDrawCompletedAt: timestamp("cfi_draw_completed_at", {
    withTimezone: true,
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const applicantNotes = pgTable("applicant_notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  applicantUuid: uuid("applicant_uuid")
    .notNull()
    .references(() => applicants.personUuid, { onDelete: "cascade" }),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const applicantTasks = pgTable("applicant_tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  applicantUuid: uuid("applicant_uuid")
    .notNull()
    .references(() => applicants.personUuid, { onDelete: "cascade" }),
  title: text("title").notNull(),
  dueDate: date("due_date"),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const financingApplications = pgTable("financing_applications", {
  financingUuid: uuid("financing_uuid").primaryKey(),
  applicantUuid: uuid("applicant_uuid")
    .notNull()
    .references(() => applicants.personUuid, { onDelete: "cascade" }),
  organizationUuid: uuid("organization_uuid").references(
    () => organizations.organizationUuid,
    { onDelete: "set null" }
  ),
  status: text("status").notNull(),
  rawStatus: text("raw_status").notNull(),
  requestedCents: text("requested_cents"),
  currency: text("currency").notNull().default("USD"),
  loanUuid: uuid("loan_uuid"),
  cropYear: integer("crop_year"),
  approvedCents: text("approved_cents"),
  availableCents: text("available_cents"),
  availablePendingCents: text("available_pending_cents"),
  drawnCents: text("drawn_cents"),
  reservedCents: text("reserved_cents"),
  estimatedPayoffCents: text("estimated_payoff_cents"),
  webhookActive: boolean("webhook_active").notNull().default(false),
  cfiCreatedAt: timestamp("cfi_created_at", { withTimezone: true }),
  cfiUpdatedAt: timestamp("cfi_updated_at", { withTimezone: true }),
  archivedAt: timestamp("archived_at", { withTimezone: true }),

  // CRM-owned stage for this deal, independent from CFI's authoritative status.
  crmStage: text("crm_stage").notNull().default("new"),
  crmPosition: integer("crm_position").notNull().default(0),
  cfiSyncedAt: timestamp("cfi_synced_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const financingParticipants = pgTable(
  "financing_participants",
  {
    financingUuid: uuid("financing_uuid")
      .notNull()
      .references(() => financingApplications.financingUuid, {
        onDelete: "cascade",
      }),
    personUuid: uuid("person_uuid")
      .notNull()
      .references(() => applicants.personUuid, { onDelete: "cascade" }),
    role: text("role").notNull(),
    position: integer("position").notNull(),
  },
  (table) => [primaryKey({ columns: [table.financingUuid, table.personUuid] })]
)

export const applicationNotes = pgTable("application_notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  financingUuid: uuid("financing_uuid")
    .notNull()
    .references(() => financingApplications.financingUuid, {
      onDelete: "cascade",
    }),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const applicationTasks = pgTable("application_tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  financingUuid: uuid("financing_uuid")
    .notNull()
    .references(() => financingApplications.financingUuid, {
      onDelete: "cascade",
    }),
  title: text("title").notNull(),
  dueDate: date("due_date"),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
})
