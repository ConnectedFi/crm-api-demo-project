import { z } from "zod"
import {
  fetchV2OrganizationsPage,
  fetchV2PeoplePage,
  submitV2Application,
} from "@/cfi/v2.server"

const lookupOutcomeSchema = z.discriminatedUnion("outcome", [
  z.object({ outcome: z.literal("not_found") }),
  z.object({ outcome: z.literal("ambiguous") }),
  z.object({
    outcome: z.literal("found"),
    personUuid: z.uuid(),
    firstName: z.string(),
    lastName: z.string(),
  }),
])

const organizationLookupOutcomeSchema = z.discriminatedUnion("outcome", [
  z.object({ outcome: z.literal("not_found") }),
  z.object({ outcome: z.literal("ambiguous") }),
  z.object({
    outcome: z.literal("found"),
    organizationUuid: z.uuid(),
    name: z.string(),
  }),
])

const submissionResponseSchema = z.object({
  ok: z.literal(true),
  replayed: z.boolean(),
  financingUuid: z.uuid(),
  personUuid: z.uuid(),
})

export type PersonLookupOutcome = z.infer<typeof lookupOutcomeSchema>
export type OrganizationLookupOutcome = z.infer<
  typeof organizationLookupOutcomeSchema
>
export type SubmissionResponse = z.infer<typeof submissionResponseSchema>

export async function lookupCfiPerson(email: string) {
  const { items } = await fetchV2PeoplePage({ email, limit: 100 })
  if (items.length === 0) return { outcome: "not_found" as const }
  if (items.length > 1) return { outcome: "ambiguous" as const }
  const person = items[0]
  return lookupOutcomeSchema.parse({
    outcome: "found",
    personUuid: person.personUuid,
    firstName: person.firstName,
    lastName: person.lastName,
  })
}

export async function lookupCfiOrganization(fein: string) {
  const { items } = await fetchV2OrganizationsPage({
    ein: fein.replace(/\D/g, ""),
    limit: 100,
  })
  if (items.length === 0) return { outcome: "not_found" as const }
  if (items.length > 1) return { outcome: "ambiguous" as const }
  const organization = items[0]
  return organizationLookupOutcomeSchema.parse({
    outcome: "found",
    organizationUuid: organization.organizationUuid,
    name: organization.name,
  })
}

export async function submitCfiApplication(body: {
  submissionUuid: string
  persons: Array<unknown>
  organization: unknown | null
  financeAmountCents: string
  inputFinance?: unknown
}) {
  const result = await submitV2Application({
    submissionUuid: body.submissionUuid,
    mainApplicant: body.persons[0],
    coApplicants: body.persons.slice(1),
    organization: body.organization,
    financeAmountCents: body.financeAmountCents,
    ...(body.inputFinance ? { inputFinance: body.inputFinance } : {}),
  })

  return submissionResponseSchema.parse({
    ok: true,
    replayed: result.replayed,
    financingUuid: result.financingLine.financingUuid,
    personUuid: result.financingLine.mainApplicant.personUuid,
  })
}

export function parsePersonLookup(value: unknown) {
  return lookupOutcomeSchema.parse(value)
}

export function parseOrganizationLookup(value: unknown) {
  return organizationLookupOutcomeSchema.parse(value)
}

export function parseSubmissionResponse(value: unknown) {
  return submissionResponseSchema.parse(value)
}
