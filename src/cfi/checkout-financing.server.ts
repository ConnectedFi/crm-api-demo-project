import { z } from "zod"
import type { CfiV2FinancingLine } from "@/cfi/v2.server"
import {
  createV2Draw,
  drawEligibilitySchema,
  fetchV2Draw,
  fetchV2DrawsPage,
  fetchAllV2FinancingLines,
  fetchV2DrawEligibility,
  fetchV2PeoplePage,
} from "@/cfi/v2.server"

const moneySchema = z.string().regex(/^\d+$/)

const creditLineSchema = z.object({
  financingUuid: z.uuid(),
  loanUuid: z.uuid(),
  mainApplicantPersonUuid: z.uuid(),
  customerRole: z.enum(["main_applicant", "co_applicant"]),
  cropYear: z.number().int().nullable(),
  status: z.string(),
  approved: moneySchema,
  drawn: moneySchema,
  available: moneySchema,
  currency: z.string().length(3),
})

const creditLinesSchema = z.array(creditLineSchema)

const financingApplicationSchema = z.object({
  financingUuid: z.uuid(),
  customerRole: z.enum(["main_applicant", "co_applicant"]),
  mainApplicantPersonUuid: z.uuid(),
  status: z.enum([
    "draft",
    "submitted",
    "underwriting",
    "approved",
    "declined",
    "funded",
  ]),
  rawStatus: z.string(),
  requested: moneySchema.nullable(),
  currency: z.string().length(3),
  organizationUuid: z.uuid().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  loan: z
    .object({
      loanUuid: z.uuid(),
      cropYear: z.number().int().nullable(),
      approved: moneySchema,
      available: moneySchema,
    })
    .nullable(),
})

const customerFinancingOverviewSchema = z.object({
  lookupStatus: z.enum(["known", "matched", "not_found", "ambiguous"]),
  personUuid: z.uuid().nullable(),
  matchedPersonName: z.string().nullable(),
  applications: z.array(financingApplicationSchema),
  creditLines: creditLinesSchema,
})

export type CfiCreditLine = z.infer<typeof creditLineSchema>
export type CfiFinancingApplication = z.infer<typeof financingApplicationSchema>
export type CfiCustomerFinancingOverview = z.infer<
  typeof customerFinancingOverviewSchema
>
export type CfiDrawEligibility = z.infer<typeof drawEligibilitySchema>
export type CfiDrawResult = Awaited<ReturnType<typeof createV2Draw>>

export async function fetchAccountFinancing(personUuid: string) {
  const lines = await fetchAllV2FinancingLines({
    personUuid,
    status: "funded",
  })

  return normalizeCreditLinesForPerson(lines, personUuid)
}

export async function fetchCustomerFinancingOverview(input: {
  personUuid?: string
  email: string
}) {
  let personUuid = input.personUuid
  let lookupStatus: CfiCustomerFinancingOverview["lookupStatus"] = "known"
  let matchedPersonName: string | null = null

  if (!personUuid) {
    const people = await fetchV2PeoplePage({ email: input.email, limit: 100 })
    if (people.items.length === 0) {
      return customerFinancingOverviewSchema.parse({
        lookupStatus: "not_found",
        personUuid: null,
        matchedPersonName: null,
        applications: [],
        creditLines: [],
      })
    }
    if (people.items.length > 1) {
      return customerFinancingOverviewSchema.parse({
        lookupStatus: "ambiguous",
        personUuid: null,
        matchedPersonName: null,
        applications: [],
        creditLines: [],
      })
    }
    const person = people.items[0]
    personUuid = person.personUuid
    lookupStatus = "matched"
    matchedPersonName = `${person.firstName} ${person.lastName}`.trim()
  }

  const lines = await fetchAllV2FinancingLines({ personUuid })
  const applications = normalizeApplicationsForPerson(lines, personUuid)

  return customerFinancingOverviewSchema.parse({
    lookupStatus,
    personUuid,
    matchedPersonName,
    applications,
    creditLines: normalizeCreditLinesForPerson(
      lines.filter((line) => line.status === "funded"),
      personUuid
    ),
  })
}

export function normalizeApplicationsForPerson(
  lines: Array<CfiV2FinancingLine>,
  personUuid: string
) {
  return z.array(financingApplicationSchema).parse(
    lines
      .flatMap((line) => {
        const customerRole = roleForPerson(line, personUuid)
        if (!customerRole) return []
        return [
          {
            financingUuid: line.financingUuid,
            customerRole,
            mainApplicantPersonUuid: line.mainApplicant.personUuid,
            status: line.status,
            rawStatus: line.rawStatus,
            requested: line.requestedMinor,
            currency: line.currency,
            organizationUuid: line.organizationUuid,
            createdAt: line.createdAt,
            updatedAt: line.updatedAt,
            loan: line.loan
              ? {
                  loanUuid: line.loan.loanUuid,
                  cropYear: line.loan.cropYear,
                  approved: line.loan.approvedMinor,
                  available: line.loan.availableMinor,
                }
              : null,
          },
        ]
      })
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
  )
}

function roleForPerson(line: CfiV2FinancingLine, personUuid: string) {
  if (line.mainApplicant.personUuid === personUuid)
    return "main_applicant" as const
  if (
    line.coApplicants.some((applicant) => applicant.personUuid === personUuid)
  )
    return "co_applicant" as const
  return null
}

export function normalizeCreditLinesForPerson(
  lines: Array<CfiV2FinancingLine>,
  personUuid: string
) {
  return creditLinesSchema.parse(
    lines.flatMap((line) => {
      if (!line.loan) return []
      const customerRole = roleForPerson(line, personUuid)
      if (!customerRole) return []
      return [
        {
          financingUuid: line.financingUuid,
          loanUuid: line.loan.loanUuid,
          mainApplicantPersonUuid: line.mainApplicant.personUuid,
          customerRole,
          cropYear: line.loan.cropYear,
          status: line.status,
          approved: line.loan.approvedMinor,
          drawn: line.loan.drawnMinor,
          available: line.loan.availableMinor,
          currency: line.currency,
        },
      ]
    })
  )
}

export async function fetchDrawEligibility(input: {
  financingUuid: string
  loanRef: string
  expectedMainApplicantPersonUuid: string
  amountMinor?: string
  trancheId?: string
}) {
  return drawEligibilitySchema.parse(await fetchV2DrawEligibility(input))
}

export async function createCfiDraw(input: {
  financingUuid: string
  idempotencyKey: string
  loanRef: string
  expectedMainApplicantPersonUuid: string
  amountMinor: string
  description: string
  trancheId: string
  invoiceRef: string
}) {
  return createV2Draw(input)
}

export async function fetchCfiDraw(drawUuid: string) {
  return fetchV2Draw(drawUuid)
}

export async function fetchCfiDrawsPage(input: {
  financingUuid?: string
  loanUuid?: string
  limit?: number
}) {
  return fetchV2DrawsPage(input)
}

export function parseCreditLines(value: unknown) {
  return creditLinesSchema.parse(value)
}

export function parseDrawEligibility(value: unknown) {
  return drawEligibilitySchema.parse(value)
}
