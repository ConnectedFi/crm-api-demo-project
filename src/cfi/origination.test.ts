import { afterEach, describe, expect, it, vi } from "vitest"
import {
  parseOrganizationLookup,
  parsePersonLookup,
  parseSubmissionResponse,
  submitCfiApplication,
} from "./origination.server"
import { CfiV2RequestError } from "./v2.server"
import { submissionInputSchema } from "@/features/applications/origination.functions"

const originalApiKey = process.env.CFI_API_KEY

afterEach(() => {
  vi.unstubAllGlobals()
  process.env.CFI_API_KEY = originalApiKey
})

const submissionInput = {
  submissionUuid: "10000000-0000-4000-8000-000000000001",
  persons: [
    {
      kind: "reference",
      personUuid: "30000000-0000-4000-8000-000000000001",
    },
  ],
  organization: null,
  financeAmountCents: "2000000",
}

describe("CFI V2 origination responses", () => {
  it("parses person and organization lookup outcomes", () => {
    expect(
      parsePersonLookup({
        outcome: "found",
        personUuid: "30000000-0000-4000-8000-000000000001",
        firstName: "Jordan",
        lastName: "Miller",
      }).outcome
    ).toBe("found")
    expect(parseOrganizationLookup({ outcome: "not_found" }).outcome).toBe(
      "not_found"
    )
  })

  it("parses the replay-aware submission result", () => {
    expect(
      parseSubmissionResponse({
        ok: true,
        replayed: true,
        financingUuid: "50000000-0000-4000-8000-000000000001",
        personUuid: "30000000-0000-4000-8000-000000000001",
      }).replayed
    ).toBe(true)
  })

  it("uses the V2 ein field for a new organization", () => {
    const organization = {
      kind: "record" as const,
      name: "Billtons Chilltons LLC",
      ein: "12-3456789",
      type: "LimitedLiabilityCompany" as const,
      incorporatedDate: "2020-01-01T00:00:00.000Z",
      incorporatedLocation: "IA",
      totalAssets: 100000,
      totalLiabilities: 10000,
      address: [
        {
          street: "1 Seed Way",
          city: "Ames",
          state: "IA",
          zip: "50010",
          type: "main" as const,
        },
      ],
    }

    expect(
      submissionInputSchema.parse({
        ...submissionInput,
        organization,
      }).organization
    ).toMatchObject({ ein: "12-3456789" })
    expect(
      submissionInputSchema.safeParse({
        ...submissionInput,
        organization: {
          ...organization,
          ein: undefined,
          registrationNumber: "12-3456789",
        },
      }).success
    ).toBe(false)
  })

  it("submits only through crmFinancingV2", async () => {
    process.env.CFI_API_KEY = "test-key"
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        replayed: true,
        financingLine: {
          financingUuid: "50000000-0000-4000-8000-000000000001",
          status: "submitted",
          rawStatus: "submitted",
          requestedMinor: "2000000",
          currency: "USD",
          mainApplicant: {
            personUuid: "30000000-0000-4000-8000-000000000001",
          },
          coApplicants: [],
          organizationUuid: null,
          loan: null,
          createdAt: "2026-08-07T12:00:00.000Z",
          updatedAt: "2026-08-07T12:00:00.000Z",
          archivedAt: null,
        },
      })
    )
    vi.stubGlobal("fetch", fetchMock)

    await expect(submitCfiApplication(submissionInput)).resolves.toMatchObject({
      ok: true,
      replayed: true,
      financingUuid: "50000000-0000-4000-8000-000000000001",
    })
    expect(fetchMock.mock.calls[0][0]).toContain(
      "/crmFinancingV2/submitApplication"
    )
  })

  it("preserves entity validation details for incomplete applications", async () => {
    process.env.CFI_API_KEY = "test-key"
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json(
          {
            defined: true,
            code: "BAD_REQUEST",
            status: 400,
            message: "Bad Request",
            data: {
              reason: "incomplete_application",
              retriable: false,
              entities: [
                {
                  kind: "person",
                  ref: "30000000-0000-4000-8000-000000000001",
                  errors: ["birth_date: Invalid date"],
                },
                {
                  kind: "organization",
                  ref: "40000000-0000-4000-8000-000000000001",
                  errors: ["totalAssets: Required"],
                },
              ],
            },
          },
          { status: 400 }
        )
      )
    )

    const error = await submitCfiApplication(submissionInput).catch(
      (reason: unknown) => reason
    )

    expect(error).toBeInstanceOf(CfiV2RequestError)
    expect(error).toMatchObject({
      reason: "incomplete_application",
      retriable: false,
      entities: [
        {
          kind: "person",
          errors: ["birth_date: Invalid date"],
        },
        {
          kind: "organization",
          errors: ["totalAssets: Required"],
        },
      ],
    })
  })

  it("preserves field paths and codes for invalid requests", async () => {
    process.env.CFI_API_KEY = "test-key"
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json(
          {
            defined: true,
            code: "BAD_REQUEST",
            status: 400,
            message: "Input validation failed",
            data: {
              reason: "invalid_request",
              retriable: false,
              issues: [
                {
                  path: ["organization", "ein"],
                  code: "required",
                  message: "EIN is required.",
                },
                {
                  path: ["coApplicants", 0, "email"],
                  code: "invalid_format",
                  message: "Must be a valid email address.",
                },
              ],
            },
          },
          { status: 400 }
        )
      )
    )

    const error = await submitCfiApplication(submissionInput).catch(
      (reason: unknown) => reason
    )

    expect(error).toBeInstanceOf(CfiV2RequestError)
    expect(error).toMatchObject({
      reason: "invalid_request",
      retriable: false,
      issues: [
        {
          path: ["organization", "ein"],
          code: "required",
        },
        {
          path: ["coApplicants", 0, "email"],
          code: "invalid_format",
        },
      ],
    })
  })
})
