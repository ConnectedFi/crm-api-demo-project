import { z } from "zod"

const minorSchema = z.string().regex(/^-?\d+$/)
const cursorSchema = z.string().min(1).nullable()
const timestampSchema = z.iso.datetime()

const addressSchema = z.object({
  street: z.string(),
  city: z.string(),
  state: z.string(),
  zip: z.string(),
  country: z.string().nullable(),
})

const nullableAddressSchema = z.object({
  street: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  zip: z.string().nullable(),
  country: z.string().nullable(),
})

export const personSchema = z.object({
  personUuid: z.uuid(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.email(),
  phone: z.string(),
  address: addressSchema,
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
  archivedAt: timestampSchema.nullable(),
})

export const organizationSchema = z.object({
  organizationUuid: z.uuid(),
  name: z.string(),
  ein: z
    .string()
    .regex(/^\d{9}$/)
    .nullable(),
  type: z.string().nullable(),
  website: z.string().nullable(),
  address: nullableAddressSchema.nullable(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
  archivedAt: timestampSchema.nullable(),
})

export const financingLineSchema = z.object({
  financingUuid: z.uuid(),
  status: z.enum([
    "draft",
    "submitted",
    "underwriting",
    "approved",
    "declined",
    "funded",
  ]),
  rawStatus: z.enum([
    "quick_renewal",
    "created",
    "draft",
    "application",
    "submitted",
    "workflow_running",
    "contract_pending",
    "contract_offered",
    "final_details",
    "signed",
    "risk_review",
    "funder_offer",
    "funder_offer_accepted",
    "funder_offer_pending",
    "funded",
    "extended_review",
    "borrower_declined",
    "workflow_declined",
    "dealer_declined",
    "cancelled",
    "declined",
  ]),
  requestedMinor: minorSchema.nullable(),
  currency: z.string().length(3),
  mainApplicant: z.object({ personUuid: z.uuid() }),
  coApplicants: z.array(z.object({ personUuid: z.uuid() })),
  organizationUuid: z.uuid().nullable(),
  loan: z
    .object({
      loanUuid: z.uuid(),
      cropYear: z.number().int().nullable(),
      approvedMinor: minorSchema,
      availableMinor: minorSchema,
      availablePendingMinor: minorSchema,
      drawnMinor: minorSchema,
      reservedMinor: minorSchema.nullable(),
      estimatedPayoffMinor: minorSchema.nullable(),
    })
    .nullable(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
  archivedAt: timestampSchema.nullable(),
})

const peoplePageSchema = z.object({
  items: z.array(personSchema),
  nextCursor: cursorSchema,
})

const organizationsPageSchema = z.object({
  items: z.array(organizationSchema),
  nextCursor: cursorSchema,
})

const financingLinesPageSchema = z.object({
  items: z.array(financingLineSchema),
  nextCursor: cursorSchema,
})

export const drawEligibilitySchema = z.object({
  drawable: z.boolean(),
  requestedAmountEligible: z.boolean().nullable(),
  availableMinor: minorSchema,
  currency: z.string().length(3),
  reason: z
    .object({
      code: z.string(),
      message: z.string(),
    })
    .nullable(),
  tranches: z.array(
    z.object({
      trancheId: z.uuid(),
      reference: z.string(),
      description: z.string(),
    })
  ),
})

export const drawSchema = z.object({
  drawUuid: z.uuid(),
  idempotencyKey: z.string(),
  financingUuid: z.uuid(),
  loanUuid: z.uuid(),
  status: z.enum(["in_progress", "succeeded", "rejected"]),
  amountMinor: minorSchema,
  currency: z.string().length(3),
  description: z.string(),
  tranche: z.object({ trancheId: z.uuid(), reference: z.string() }),
  invoiceRef: z.string().nullable(),
  failure: z
    .object({
      reason: z.string(),
      retriable: z.boolean(),
      message: z.string(),
    })
    .nullable(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
  completedAt: timestampSchema.nullable(),
})

const createDrawResponseSchema = z.object({
  replayed: z.boolean(),
  draw: drawSchema,
})

const submitApplicationResponseSchema = z.object({
  replayed: z.boolean(),
  financingLine: financingLineSchema,
})

const incompleteApplicationEntitySchema = z.object({
  kind: z.enum(["person", "organization", "loan"]),
  ref: z.string(),
  errors: z.array(z.string()),
})

const requestValidationIssueSchema = z.object({
  path: z.array(z.union([z.string(), z.number().int().nonnegative()])),
  code: z.enum([
    "required",
    "invalid_type",
    "invalid_format",
    "out_of_range",
    "unrecognized_key",
    "invalid_value",
  ]),
  message: z.string(),
})

const cfiErrorResponseSchema = z.object({
  message: z.string().optional(),
  data: z
    .object({
      reason: z.string().optional(),
      retriable: z.boolean().optional(),
      guidance: z.string().optional(),
      entities: z.array(incompleteApplicationEntitySchema).optional(),
      issues: z.array(requestValidationIssueSchema).optional(),
    })
    .passthrough()
    .optional(),
})

export type CfiV2Person = z.infer<typeof personSchema>
export type CfiV2Organization = z.infer<typeof organizationSchema>
export type CfiV2FinancingLine = z.infer<typeof financingLineSchema>
export type CfiV2DrawEligibility = z.infer<typeof drawEligibilitySchema>
export type CfiV2Draw = z.infer<typeof drawSchema>
export type CfiIncompleteApplicationEntity = z.infer<
  typeof incompleteApplicationEntitySchema
>
export type CfiRequestValidationIssue = z.infer<
  typeof requestValidationIssueSchema
>

export class CfiV2RequestError extends Error {
  reason: string | null
  retriable: boolean | null
  entities: Array<CfiIncompleteApplicationEntity>
  issues: Array<CfiRequestValidationIssue>

  constructor({
    message,
    reason,
    retriable,
    entities,
    issues,
  }: {
    message: string
    reason?: string
    retriable?: boolean
    entities?: Array<CfiIncompleteApplicationEntity>
    issues?: Array<CfiRequestValidationIssue>
  }) {
    super(message)
    this.name = "CfiV2RequestError"
    this.reason = reason ?? null
    this.retriable = retriable ?? null
    this.entities = entities ?? []
    this.issues = issues ?? []
  }
}

function getCfiConfig() {
  const apiKey = process.env.CFI_API_KEY
  const baseUrl =
    process.env.CFI_API_BASE_URL ?? "https://dev.connected.financial/api/orpc"

  if (!apiKey) throw new Error("CFI_API_KEY is not configured")
  return { apiKey, baseUrl: baseUrl.replace(/\/$/, "") }
}

async function postV2(path: string, body: unknown) {
  const { apiKey, baseUrl } = getCfiConfig()
  const response = await fetch(`${baseUrl}/crmFinancingV2/${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
    },
    body: JSON.stringify(body),
  })
  const value = await response.json().catch(() => null)

  if (!response.ok) {
    const parsed = cfiErrorResponseSchema.safeParse(value)
    const reason = parsed.success
      ? [
          parsed.data.data?.reason ?? parsed.data.message,
          parsed.data.data?.guidance,
        ]
          .filter(Boolean)
          .join(": ")
      : undefined
    throw new CfiV2RequestError({
      message: reason ?? `CFI V2 request failed with status ${response.status}`,
      reason: parsed.success ? parsed.data.data?.reason : undefined,
      retriable: parsed.success ? parsed.data.data?.retriable : undefined,
      entities: parsed.success ? parsed.data.data?.entities : undefined,
      issues: parsed.success ? parsed.data.data?.issues : undefined,
    })
  }

  return value
}

export async function fetchV2Me() {
  return z
    .object({
      dealerUuid: z.uuid(),
      dealerName: z.string(),
      environment: z.string(),
    })
    .parse(await postV2("me", {}))
}

export async function fetchV2PeoplePage(
  input: {
    cursor?: string
    limit?: number
    email?: string
  } = {}
) {
  return peoplePageSchema.parse(await postV2("people", input))
}

export async function fetchAllV2People() {
  const items: Array<CfiV2Person> = []
  let cursor: string | undefined
  do {
    const page = await fetchV2PeoplePage({ cursor, limit: 100 })
    items.push(...page.items)
    cursor = page.nextCursor ?? undefined
  } while (cursor)
  return items
}

export async function fetchV2OrganizationsPage(
  input: {
    cursor?: string
    limit?: number
    ein?: string
  } = {}
) {
  return organizationsPageSchema.parse(await postV2("organizations", input))
}

export async function fetchAllV2Organizations() {
  const items: Array<CfiV2Organization> = []
  let cursor: string | undefined
  do {
    const page = await fetchV2OrganizationsPage({ cursor, limit: 100 })
    items.push(...page.items)
    cursor = page.nextCursor ?? undefined
  } while (cursor)
  return items
}

export async function fetchV2FinancingLinesPage(
  input: {
    cursor?: string
    limit?: number
    personUuid?: string
    organizationUuid?: string
    status?:
      | "draft"
      | "submitted"
      | "underwriting"
      | "approved"
      | "declined"
      | "funded"
  } = {}
) {
  return financingLinesPageSchema.parse(await postV2("financingLines", input))
}

export async function fetchAllV2FinancingLines(
  filters: Omit<
    Parameters<typeof fetchV2FinancingLinesPage>[0],
    "cursor" | "limit"
  > = {}
) {
  const items: Array<CfiV2FinancingLine> = []
  let cursor: string | undefined
  do {
    const page = await fetchV2FinancingLinesPage({
      ...filters,
      cursor,
      limit: 100,
    })
    items.push(...page.items)
    cursor = page.nextCursor ?? undefined
  } while (cursor)
  return items
}

export async function fetchV2FinancingLine(financingUuid: string) {
  return financingLineSchema.parse(
    await postV2("financingLine", { financingUuid })
  )
}

export async function submitV2Application(body: unknown) {
  return submitApplicationResponseSchema.parse(
    await postV2("submitApplication", body)
  )
}

export async function fetchV2DrawEligibility(input: {
  financingUuid: string
  loanRef: string
  expectedMainApplicantPersonUuid: string
  amountMinor?: string
  trancheId?: string
}) {
  return drawEligibilitySchema.parse(await postV2("drawEligibility", input))
}

export async function createV2Draw(input: {
  financingUuid: string
  idempotencyKey: string
  loanRef: string
  expectedMainApplicantPersonUuid: string
  amountMinor: string
  description: string
  trancheId: string
  invoiceRef?: string
}) {
  return createDrawResponseSchema.parse(await postV2("createDraw", input))
}

export async function fetchV2Draw(drawUuid: string) {
  return drawSchema.parse(await postV2("draw", { drawUuid }))
}

export function parseV2PeoplePage(value: unknown) {
  return peoplePageSchema.parse(value)
}

export function parseV2OrganizationsPage(value: unknown) {
  return organizationsPageSchema.parse(value)
}

export function parseV2FinancingLinesPage(value: unknown) {
  return financingLinesPageSchema.parse(value)
}

export function parseV2Draw(value: unknown) {
  return drawSchema.parse(value)
}
