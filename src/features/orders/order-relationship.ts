export type FinancingParticipant = {
  personUuid: string
  role: string
}

export type ApplicantRelationship =
  | "not_applicable"
  | "awaiting_sync"
  | "missing_customer"
  | "main_applicant"
  | "co_applicant"
  | "mismatch"

export function getApplicantRelationship({
  paymentMethod,
  financingUuid,
  financingSynchronized,
  customerPersonUuid,
  participants,
}: {
  paymentMethod: string
  financingUuid: string | null
  financingSynchronized: boolean
  customerPersonUuid: string | null
  participants: Array<FinancingParticipant>
}): ApplicantRelationship {
  if (paymentMethod !== "cfi" || !financingUuid) return "not_applicable"
  if (!financingSynchronized) return "awaiting_sync"
  if (!customerPersonUuid) return "missing_customer"

  const participant = participants.find(
    ({ personUuid }) => personUuid === customerPersonUuid
  )
  if (participant?.role === "main_applicant") return "main_applicant"
  if (participant?.role === "co_applicant") return "co_applicant"
  return "mismatch"
}
