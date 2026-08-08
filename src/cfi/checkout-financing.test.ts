import { describe, expect, it } from "vitest"
import {
  normalizeApplicationsForPerson,
  normalizeCreditLinesForPerson,
  parseCreditLines,
  parseDrawEligibility,
} from "./checkout-financing.server"
import { parseV2Draw } from "./v2.server"

describe("CFI V2 checkout financing responses", () => {
  it("parses normalized funded credit lines in cents", () => {
    expect(
      parseCreditLines([
        {
          financingUuid: "50000000-0000-4000-8000-000000000001",
          loanUuid: "60000000-0000-4000-8000-000000000001",
          mainApplicantPersonUuid: "30000000-0000-4000-8000-000000000001",
          customerRole: "co_applicant",
          cropYear: 2026,
          status: "funded",
          approved: "6000000",
          drawn: "1000000",
          available: "5000000",
          currency: "USD",
        },
      ])[0].available
    ).toBe("5000000")
  })

  it("distinguishes drawability from amount eligibility", () => {
    const result = parseDrawEligibility({
      drawable: true,
      requestedAmountEligible: false,
      availableMinor: "5000000",
      currency: "USD",
      reason: {
        code: "insufficient_credit",
        message: "Available credit does not cover the requested amount.",
      },
      tranches: [],
    })

    expect(result.drawable).toBe(true)
    expect(result.requestedAmountEligible).toBe(false)
    expect(result.reason?.code).toBe("insufficient_credit")
  })

  it("keeps lines for main applicants and co-applicants but rejects unrelated people", () => {
    const mainPersonUuid = "30000000-0000-4000-8000-000000000001"
    const coPersonUuid = "30000000-0000-4000-8000-000000000002"
    const line = {
      financingUuid: "50000000-0000-4000-8000-000000000001",
      status: "funded" as const,
      rawStatus: "funded" as const,
      requestedMinor: "6000000",
      currency: "USD",
      mainApplicant: { personUuid: mainPersonUuid },
      coApplicants: [{ personUuid: coPersonUuid }],
      organizationUuid: null,
      loan: {
        loanUuid: "60000000-0000-4000-8000-000000000001",
        cropYear: 2026,
        approvedMinor: "6000000",
        availableMinor: "5000000",
        availablePendingMinor: "5000000",
        drawnMinor: "1000000",
        reservedMinor: "0",
        estimatedPayoffMinor: "1000000",
      },
      createdAt: "2026-01-10T15:00:00.000Z",
      updatedAt: "2026-06-15T18:30:00.000Z",
      archivedAt: null,
    }

    expect(
      normalizeCreditLinesForPerson([line], mainPersonUuid)[0]
    ).toMatchObject({
      customerRole: "main_applicant",
      mainApplicantPersonUuid: mainPersonUuid,
    })
    expect(
      normalizeCreditLinesForPerson([line], coPersonUuid)[0]
    ).toMatchObject({
      customerRole: "co_applicant",
      mainApplicantPersonUuid: mainPersonUuid,
    })
    expect(
      normalizeCreditLinesForPerson(
        [line],
        "30000000-0000-4000-8000-000000000099"
      )
    ).toEqual([])
  })

  it("keeps non-funded application history and identifies the customer's role", () => {
    const mainPersonUuid = "30000000-0000-4000-8000-000000000001"
    const coPersonUuid = "30000000-0000-4000-8000-000000000002"
    const application = {
      financingUuid: "50000000-0000-4000-8000-000000000001",
      status: "underwriting" as const,
      rawStatus: "risk_review" as const,
      requestedMinor: "6000000",
      currency: "USD",
      mainApplicant: { personUuid: mainPersonUuid },
      coApplicants: [{ personUuid: coPersonUuid }],
      organizationUuid: null,
      loan: null,
      createdAt: "2026-01-10T15:00:00.000Z",
      updatedAt: "2026-06-15T18:30:00.000Z",
      archivedAt: null,
    }

    expect(
      normalizeApplicationsForPerson([application], coPersonUuid)
    ).toMatchObject([
      {
        status: "underwriting",
        rawStatus: "risk_review",
        customerRole: "co_applicant",
        mainApplicantPersonUuid: mainPersonUuid,
        loan: null,
      },
    ])
  })

  it("parses a durable in-progress draw without treating it as a failure", () => {
    expect(
      parseV2Draw({
        drawUuid: "80000000-0000-4000-8000-000000000002",
        idempotencyKey: "invoice-inv-2026-0043-draw-1",
        financingUuid: "50000000-0000-4000-8000-000000000001",
        loanUuid: "60000000-0000-4000-8000-000000000001",
        status: "in_progress",
        amountMinor: "150000",
        currency: "USD",
        description: "Seed invoice awaiting provider reconciliation",
        tranche: {
          trancheId: "70000000-0000-4000-8000-000000000001",
          reference: "348613002-A",
        },
        invoiceRef: "INV-2026-0043",
        failure: null,
        createdAt: "2026-06-15T18:30:00.000Z",
        updatedAt: "2026-06-15T18:30:01.000Z",
        completedAt: null,
      }).status
    ).toBe("in_progress")
  })
})
