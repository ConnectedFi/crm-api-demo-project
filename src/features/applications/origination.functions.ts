import * as Sentry from "@sentry/tanstackstart-react"
import { createServerFn } from "@tanstack/react-start"
import { asc, isNull } from "drizzle-orm"
import { z } from "zod"
import { submitCfiApplication } from "@/cfi/origination.server"
import { CfiV2RequestError } from "@/cfi/v2.server"
import { getDatabase } from "@/db/connection.server"
import { applicants, organizations } from "@/db/schema"

const addressSchema = z.object({
  street: z.string().trim().min(1),
  city: z.string().trim().min(1),
  state: z
    .string()
    .trim()
    .regex(/^[A-Z]{2}$/),
  zip: z.string().trim().min(5),
  type: z.literal("main"),
})

const personReferenceSchema = z.object({
  kind: z.literal("reference"),
  personUuid: z.uuid(),
})

const personRecordSchema = z.object({
  kind: z.literal("record"),
  first_name: z.string().trim().min(1),
  middle_name: z.string().trim().nullable().optional(),
  last_name: z.string().trim().min(1),
  email: z.email(),
  phone: z.string().trim().min(1),
  communication_preference: z.enum(["Phone", "Text", "Email"]),
  birth_date: z.iso.datetime(),
  marital_status: z.enum(["Married", "Single", "Divorced", "Separated"]),
  govID: z.string().regex(/^\d{9}$/),
  title: z.string().trim().optional(),
  year_began_farming: z.number().int().min(1).max(99),
  share_percentage: z.number().int().min(1).max(100),
  totalAssets: z.number().int().min(1),
  totalLiabilities: z.number().int().min(1),
  grossFarmIncome: z.number().int().min(0).optional(),
  nonFarmIncome: z.number().int().min(0).optional(),
  address: z.array(addressSchema).min(1),
})

const organizationReferenceSchema = z.object({
  kind: z.literal("reference"),
  organizationUuid: z.uuid(),
})

export const organizationTypes = [
  "LimitedLiabilityCompany",
  "GeneralPartnership",
  "LimitedPartnership",
  "Corporation",
  "JointVenture",
  "Trust",
] as const

const organizationRecordSchema = z.object({
  kind: z.literal("record"),
  name: z.string().trim().min(1),
  ein: z.string().regex(/^\d{2}[- ]?\d{7}$/),
  type: z.enum(organizationTypes),
  incorporatedDate: z.iso.datetime(),
  incorporatedLocation: z
    .string()
    .trim()
    .regex(/^[A-Z]{2}$/),
  totalAssets: z.number().int().min(1),
  totalLiabilities: z.number().int().min(1),
  grossFarmIncome: z.number().int().min(0).optional(),
  nonFarmIncome: z.number().int().min(0).optional(),
  address: z.array(addressSchema).min(1),
})

export const submissionInputSchema = z.object({
  submissionUuid: z.uuid(),
  persons: z
    .array(
      z.discriminatedUnion("kind", [personReferenceSchema, personRecordSchema])
    )
    .min(1),
  organization: z
    .discriminatedUnion("kind", [
      organizationReferenceSchema,
      organizationRecordSchema,
    ])
    .nullable(),
  financeAmountCents: z.string().regex(/^[1-9]\d*$/),
  inputFinance: z
    .object({
      farmStates: z.array(z.string().regex(/^[A-Z]{2}$/)).optional(),
      cropType: z.array(z.string()).optional(),
      numberOfAcres: z.number().int().min(0).optional(),
      expectedRevenueCents: z.string().regex(/^\d+$/).optional(),
    })
    .optional(),
})

export type SubmissionInput = z.infer<typeof submissionInputSchema>

export type ApplicationSubmissionFailure =
  | {
      ok: false
      reason: "incomplete_application"
      retriable: boolean
      entities: Array<{
        kind: "person" | "organization" | "loan"
        ref: string
        errors: Array<string>
      }>
    }
  | {
      ok: false
      reason: "invalid_request"
      retriable: boolean
      issues: Array<{
        path: Array<string | number>
        code:
          | "required"
          | "invalid_type"
          | "invalid_format"
          | "out_of_range"
          | "unrecognized_key"
          | "invalid_value"
        message: string
      }>
    }

export const getApplicationReferenceData = createServerFn({
  method: "GET",
}).handler(async () => {
  const database = getDatabase()
  const [people, organizationRows] = await Promise.all([
    database
      .select({
        personUuid: applicants.personUuid,
        firstName: applicants.firstName,
        lastName: applicants.lastName,
        email: applicants.email,
        phone: applicants.phone,
        city: applicants.city,
        state: applicants.state,
      })
      .from(applicants)
      .where(isNull(applicants.archivedAt))
      .orderBy(asc(applicants.lastName), asc(applicants.firstName)),
    database
      .select({
        organizationUuid: organizations.organizationUuid,
        name: organizations.name,
        registrationNumber: organizations.registrationNumber,
        type: organizations.type,
        city: organizations.city,
        state: organizations.state,
      })
      .from(organizations)
      .where(isNull(organizations.archivedAt))
      .orderBy(asc(organizations.name)),
  ])

  return { people, organizations: organizationRows }
})

export const submitNewApplication = createServerFn({ method: "POST" })
  .validator(submissionInputSchema)
  .handler(async ({ data }) => {
    try {
      return await submitCfiApplication(data)
    } catch (error) {
      if (
        error instanceof CfiV2RequestError &&
        error.reason === "incomplete_application" &&
        error.entities.length > 0
      ) {
        return {
          ok: false as const,
          reason: "incomplete_application" as const,
          retriable: error.retriable ?? false,
          entities: error.entities,
        } satisfies ApplicationSubmissionFailure
      }
      if (
        error instanceof CfiV2RequestError &&
        error.reason === "invalid_request" &&
        error.issues.length > 0
      ) {
        return {
          ok: false as const,
          reason: "invalid_request" as const,
          retriable: error.retriable ?? false,
          issues: error.issues,
        } satisfies ApplicationSubmissionFailure
      }
      Sentry.captureException(error)
      throw error
    }
  })
