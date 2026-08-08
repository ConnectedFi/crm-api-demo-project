import * as Sentry from "@sentry/tanstackstart-react"
import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"
import {
  createCfiDraw,
  fetchCustomerFinancingOverview,
  fetchDrawEligibility,
} from "@/cfi/checkout-financing.server"

const drawContextInput = z.object({
  financingUuid: z.uuid(),
  loanRef: z.uuid(),
  expectedMainApplicantPersonUuid: z.uuid(),
})

export const getCustomerCreditLines = createServerFn({ method: "POST" })
  .validator(
    z.object({
      personUuid: z.uuid().optional(),
      email: z.email(),
    })
  )
  .handler(async ({ data }) => {
    try {
      return await fetchCustomerFinancingOverview(data)
    } catch (error) {
      Sentry.captureException(error)
      throw error
    }
  })

export const checkCreditLineEligibility = createServerFn({ method: "POST" })
  .validator(
    drawContextInput.extend({
      amountMinor: z
        .string()
        .regex(/^[1-9]\d*$/)
        .optional(),
    })
  )
  .handler(async ({ data }) => {
    try {
      return await fetchDrawEligibility(data)
    } catch (error) {
      Sentry.captureException(error)
      throw error
    }
  })

export const payOrderWithCfi = createServerFn({ method: "POST" })
  .validator(
    drawContextInput.extend({
      idempotencyKey: z.string().min(8).max(128),
      amountMinor: z.string().regex(/^[1-9]\d*$/),
      description: z.string().trim().min(1),
      trancheId: z.uuid(),
      invoiceRef: z.string().trim().min(1),
    })
  )
  .handler(async ({ data }) => {
    try {
      return await createCfiDraw(data)
    } catch (error) {
      Sentry.captureException(error)
      throw error
    }
  })
