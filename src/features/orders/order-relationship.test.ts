import { describe, expect, it } from "vitest"
import { getApplicantRelationship } from "./order-relationship"

const base = {
  paymentMethod: "cfi",
  financingUuid: "50000000-0000-4000-8000-000000000001",
  customerPersonUuid: "30000000-0000-4000-8000-000000000001",
  participants: [] as Array<{ personUuid: string; role: string }>,
}

describe("getApplicantRelationship", () => {
  it("treats a newly submitted but unsynchronized line as awaiting sync", () => {
    expect(
      getApplicantRelationship({ ...base, financingSynchronized: false })
    ).toBe("awaiting_sync")
  })

  it("only reports a mismatch after a synchronized snapshot excludes the customer", () => {
    expect(
      getApplicantRelationship({ ...base, financingSynchronized: true })
    ).toBe("mismatch")
  })

  it("recognizes both main applicants and co-applicants", () => {
    expect(
      getApplicantRelationship({
        ...base,
        financingSynchronized: true,
        participants: [
          {
            personUuid: base.customerPersonUuid,
            role: "main_applicant",
          },
        ],
      })
    ).toBe("main_applicant")

    expect(
      getApplicantRelationship({
        ...base,
        financingSynchronized: true,
        participants: [
          {
            personUuid: base.customerPersonUuid,
            role: "co_applicant",
          },
        ],
      })
    ).toBe("co_applicant")
  })
})
