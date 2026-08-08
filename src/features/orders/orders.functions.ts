import * as Sentry from "@sentry/tanstackstart-react"
import { createServerFn } from "@tanstack/react-start"
import { asc, desc, eq } from "drizzle-orm"
import { z } from "zod"
import {
  createCfiDraw,
  fetchCfiDraw,
  fetchCfiDrawsPage,
  fetchDrawEligibility,
} from "@/cfi/checkout-financing.server"
import { getDatabase } from "@/db/connection.server"
import {
  applicants,
  financingApplications,
  financingParticipants,
  seedWorldOrders,
} from "@/db/schema"
import { getApplicantRelationship } from "./order-relationship"

const orderItemSchema = z.object({
  productId: z.string().min(1),
  name: z.string().min(1),
  quantity: z.number().int().positive(),
  unitPriceCents: z.number().int().positive(),
})

const saveOrderSchema = z.object({
  orderUuid: z.uuid(),
  invoiceRef: z.string().min(1),
  customerPersonUuid: z.uuid().nullable(),
  customerName: z.string().trim().min(1),
  customerEmail: z.email(),
  items: z.array(orderItemSchema).min(1),
  totalCents: z.string().regex(/^[1-9]\d*$/),
  paymentMethod: z.enum(["card", "cfi"]),
  orderStatus: z.enum([
    "paid",
    "financing_pending",
    "draw_processing",
    "draw_rejected",
  ]),
  cfiFinancingUuid: z.uuid().nullable(),
  cfiDrawUuid: z.uuid().nullable(),
  cfiDrawStatus: z.enum(["in_progress", "succeeded", "rejected"]).nullable(),
})

export const saveSeedWorldOrder = createServerFn({ method: "POST" })
  .validator(saveOrderSchema)
  .handler(async ({ data }) => {
    const database = getDatabase()
    await database
      .insert(seedWorldOrders)
      .values({ ...data, currency: "USD", updatedAt: new Date() })
      .onConflictDoUpdate({
        target: seedWorldOrders.orderUuid,
        set: {
          customerPersonUuid: data.customerPersonUuid,
          customerName: data.customerName,
          customerEmail: data.customerEmail,
          items: data.items,
          totalCents: data.totalCents,
          paymentMethod: data.paymentMethod,
          orderStatus: data.orderStatus,
          cfiFinancingUuid: data.cfiFinancingUuid,
          cfiDrawUuid: data.cfiDrawUuid,
          cfiDrawStatus: data.cfiDrawStatus,
          updatedAt: new Date(),
        },
      })
    return { orderUuid: data.orderUuid }
  })

export const getOrdersPageData = createServerFn({ method: "GET" }).handler(
  async () => {
    const database = getDatabase()
    const rows = await database
      .select({
        orderUuid: seedWorldOrders.orderUuid,
        invoiceRef: seedWorldOrders.invoiceRef,
        customerPersonUuid: seedWorldOrders.customerPersonUuid,
        customerName: seedWorldOrders.customerName,
        customerEmail: seedWorldOrders.customerEmail,
        items: seedWorldOrders.items,
        totalCents: seedWorldOrders.totalCents,
        currency: seedWorldOrders.currency,
        paymentMethod: seedWorldOrders.paymentMethod,
        orderStatus: seedWorldOrders.orderStatus,
        cfiFinancingUuid: seedWorldOrders.cfiFinancingUuid,
        cfiDrawUuid: seedWorldOrders.cfiDrawUuid,
        cfiDrawStatus: seedWorldOrders.cfiDrawStatus,
        cfiDrawFailure: seedWorldOrders.cfiDrawFailure,
        cfiDrawUpdatedAt: seedWorldOrders.cfiDrawUpdatedAt,
        cfiDrawCompletedAt: seedWorldOrders.cfiDrawCompletedAt,
        createdAt: seedWorldOrders.createdAt,
        updatedAt: seedWorldOrders.updatedAt,
        financingStatus: financingApplications.status,
        financingRawStatus: financingApplications.rawStatus,
        requestedCents: financingApplications.requestedCents,
        loanUuid: financingApplications.loanUuid,
        approvedCents: financingApplications.approvedCents,
        availableCents: financingApplications.availableCents,
      })
      .from(seedWorldOrders)
      .leftJoin(
        financingApplications,
        eq(
          seedWorldOrders.cfiFinancingUuid,
          financingApplications.financingUuid
        )
      )
      .orderBy(desc(seedWorldOrders.createdAt))

    const participantRows = await database
      .select({
        financingUuid: financingParticipants.financingUuid,
        personUuid: financingParticipants.personUuid,
        role: financingParticipants.role,
        position: financingParticipants.position,
        firstName: applicants.firstName,
        lastName: applicants.lastName,
      })
      .from(financingParticipants)
      .innerJoin(
        applicants,
        eq(financingParticipants.personUuid, applicants.personUuid)
      )
      .orderBy(asc(financingParticipants.position))

    return rows.map((row) => {
      const participants = participantRows.filter(
        ({ financingUuid }) => financingUuid === row.cfiFinancingUuid
      )
      const applicantRelationship = getApplicantRelationship({
        paymentMethod: row.paymentMethod,
        financingUuid: row.cfiFinancingUuid,
        financingSynchronized: Boolean(row.financingStatus),
        customerPersonUuid: row.customerPersonUuid,
        participants,
      })
      return {
        ...row,
        mainApplicantPersonUuid:
          participants.find(({ role }) => role === "main_applicant")
            ?.personUuid ?? null,
        mainApplicantName: (() => {
          const main = participants.find(
            ({ role }) => role === "main_applicant"
          )
          return main ? `${main.firstName} ${main.lastName}`.trim() : null
        })(),
        customerRole:
          applicantRelationship === "main_applicant" ||
          applicantRelationship === "co_applicant"
            ? applicantRelationship
            : null,
        applicantRelationship,
        hasApplicantMismatch: applicantRelationship === "mismatch",
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
        cfiDrawUpdatedAt: row.cfiDrawUpdatedAt?.toISOString() ?? null,
        cfiDrawCompletedAt: row.cfiDrawCompletedAt?.toISOString() ?? null,
      }
    })
  }
)

const orderUuidSchema = z.object({ orderUuid: z.uuid() })

async function getDrawableOrder(orderUuid: string) {
  const database = getDatabase()
  const rows = await database
    .select({ order: seedWorldOrders, line: financingApplications })
    .from(seedWorldOrders)
    .leftJoin(
      financingApplications,
      eq(seedWorldOrders.cfiFinancingUuid, financingApplications.financingUuid)
    )
    .where(eq(seedWorldOrders.orderUuid, orderUuid))
    .limit(1)
  const row = rows.at(0)

  if (!row) throw new Error("Order not found.")
  if (row.order.paymentMethod !== "cfi")
    throw new Error("This order is not using CFI financing.")
  if (!row.line?.loanUuid)
    throw new Error("CFI has not created a funded loan for this order yet.")
  if (!row.order.customerPersonUuid)
    throw new Error("This order is missing its CFI customer identity.")
  const participants = await database
    .select()
    .from(financingParticipants)
    .where(eq(financingParticipants.financingUuid, row.line.financingUuid))
  if (
    !participants.some(
      ({ personUuid }) => personUuid === row.order.customerPersonUuid
    )
  ) {
    throw new Error(
      "This order's customer is not an applicant on the selected financing line."
    )
  }
  const mainApplicantPersonUuid = participants.find(
    ({ role }) => role === "main_applicant"
  )?.personUuid
  if (!mainApplicantPersonUuid)
    throw new Error("The selected financing line has no main applicant.")
  return { ...row, mainApplicantPersonUuid }
}

export const checkOrderDrawEligibility = createServerFn({ method: "POST" })
  .validator(orderUuidSchema)
  .handler(async ({ data }) => {
    try {
      const row = await getDrawableOrder(data.orderUuid)
      return await fetchDrawEligibility({
        financingUuid: row.line!.financingUuid,
        loanRef: row.line!.loanUuid!,
        expectedMainApplicantPersonUuid: row.mainApplicantPersonUuid,
        amountMinor: row.order.totalCents,
      })
    } catch (error) {
      Sentry.captureException(error)
      throw error
    }
  })

export const drawOrderWithCfi = createServerFn({ method: "POST" })
  .validator(orderUuidSchema.extend({ trancheId: z.uuid() }))
  .handler(async ({ data }) => {
    try {
      const row = await getDrawableOrder(data.orderUuid)
      const loanUuid = row.line!.loanUuid!
      const eligibility = await fetchDrawEligibility({
        financingUuid: row.line!.financingUuid,
        loanRef: loanUuid,
        expectedMainApplicantPersonUuid: row.mainApplicantPersonUuid,
        amountMinor: row.order.totalCents,
        trancheId: data.trancheId,
      })
      if (!eligibility.drawable || !eligibility.requestedAmountEligible) {
        throw new Error(
          eligibility.reason?.message ??
            "This order is not currently eligible to draw."
        )
      }

      const result = await createCfiDraw({
        financingUuid: row.line!.financingUuid,
        idempotencyKey: `seedworld-${row.order.orderUuid}-draw-1`,
        loanRef: loanUuid,
        expectedMainApplicantPersonUuid: row.mainApplicantPersonUuid,
        amountMinor: row.order.totalCents,
        description: `Seed World order ${row.order.invoiceRef}`,
        trancheId: data.trancheId,
        invoiceRef: row.order.invoiceRef,
      })
      const status = result.draw.status
      await getDatabase()
        .update(seedWorldOrders)
        .set({
          cfiDrawUuid: result.draw.drawUuid,
          cfiDrawStatus: status,
          cfiDrawFailure: result.draw.failure,
          cfiDrawUpdatedAt: new Date(result.draw.updatedAt),
          cfiDrawCompletedAt: result.draw.completedAt
            ? new Date(result.draw.completedAt)
            : null,
          orderStatus:
            status === "succeeded"
              ? "paid"
              : status === "in_progress"
                ? "draw_processing"
                : "draw_rejected",
          updatedAt: new Date(),
        })
        .where(eq(seedWorldOrders.orderUuid, row.order.orderUuid))
      return result
    } catch (error) {
      Sentry.captureException(error)
      throw error
    }
  })

export const reconcileOrderDraws = createServerFn({ method: "POST" }).handler(
  async () => {
    try {
      const database = getDatabase()
      const orders = await database.select().from(seedWorldOrders)
      const trackedOrders = orders.filter(
        (order): order is typeof order & { cfiDrawUuid: string } =>
          Boolean(order.cfiDrawUuid)
      )
      const results = await Promise.all(
        trackedOrders.map(async (order) => ({
          order,
          draw: await fetchCfiDraw(order.cfiDrawUuid),
        }))
      )
      const unlinkedOrders = orders.filter(
        (order) =>
          order.paymentMethod === "cfi" &&
          order.orderStatus === "draw_processing" &&
          Boolean(order.cfiFinancingUuid) &&
          !order.cfiDrawUuid
      )
      const recoveredResults = (
        await Promise.all(
          unlinkedOrders.map(async (order) => {
            const page = await fetchCfiDrawsPage({
              financingUuid: order.cfiFinancingUuid!,
              limit: 100,
            })
            const draw = page.items.find(
              (candidate) =>
                candidate.invoiceRef === order.invoiceRef ||
                candidate.idempotencyKey ===
                  `seedworld-${order.orderUuid}-draw-1`
            )
            return draw ? { order, draw } : null
          })
        )
      ).filter((result): result is NonNullable<typeof result> =>
        Boolean(result)
      )
      const allResults = [...results, ...recoveredResults]
      await database.transaction(async (transaction) => {
        for (const { order, draw } of allResults) {
          await transaction
            .update(seedWorldOrders)
            .set({
              cfiDrawUuid: draw.drawUuid,
              cfiDrawStatus: draw.status,
              cfiDrawFailure: draw.failure,
              cfiDrawUpdatedAt: new Date(draw.updatedAt),
              cfiDrawCompletedAt: draw.completedAt
                ? new Date(draw.completedAt)
                : null,
              orderStatus:
                draw.status === "succeeded"
                  ? "paid"
                  : draw.status === "in_progress"
                    ? "draw_processing"
                    : "draw_rejected",
              updatedAt: new Date(),
            })
            .where(eq(seedWorldOrders.orderUuid, order.orderUuid))
        }
      })
      return {
        reconciled: allResults.length,
        recovered: recoveredResults.length,
      }
    } catch (error) {
      Sentry.captureException(error)
      throw error
    }
  }
)
