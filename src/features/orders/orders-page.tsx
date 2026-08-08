import { useRouter } from "@tanstack/react-router"
import { useServerFn } from "@tanstack/react-start"
import {
  Check,
  CircleAlert,
  LoaderCircle,
  RefreshCw,
  ShoppingBag,
  WalletCards,
} from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { syncApplicants } from "@/features/applicants/applicants.functions"
import { DirectoryShell } from "@/features/directory/directory-shell"
import {
  checkOrderDrawEligibility,
  drawOrderWithCfi,
  reconcileOrderDraws,
} from "./orders.functions"
import type { getOrdersPageData } from "./orders.functions"
import type { CfiDrawEligibility } from "@/cfi/checkout-financing.server"

type Order = Awaited<ReturnType<typeof getOrdersPageData>>[number]

export function OrdersPage({ orders }: { orders: Array<Order> }) {
  const router = useRouter()
  const sync = useServerFn(syncApplicants)
  const reconcileDraws = useServerFn(reconcileOrderDraws)
  const [isSyncing, setIsSyncing] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  async function handleSync() {
    setIsSyncing(true)
    setNotice(null)
    try {
      await sync()
      const drawResult = await reconcileDraws()
      await router.invalidate()
      setNotice(
        `CFI financing statuses are up to date. Reconciled ${drawResult.reconciled} ${drawResult.reconciled === 1 ? "draw" : "draws"}${drawResult.recovered ? `, including ${drawResult.recovered} recovered ${drawResult.recovered === 1 ? "link" : "links"}` : ""}.`
      )
    } catch (error) {
      setNotice(errorMessage(error, "CFI sync failed."))
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <DirectoryShell
      section="orders"
      title="Seed World orders"
      description="Track retailer orders, their CFI application lifecycle, and funded orders that are ready for an eligibility check and draw."
    >
      <div className="mb-5 flex items-center justify-between gap-4">
        <p className="text-sm text-black/45">
          {orders.length} {orders.length === 1 ? "order" : "orders"}
        </p>
        <Button
          variant="outline"
          onClick={() => void handleSync()}
          disabled={isSyncing}
        >
          <RefreshCw className={isSyncing ? "animate-spin" : ""} />
          {isSyncing ? "Syncing…" : "Sync CFI statuses"}
        </Button>
      </div>
      {notice ? (
        <div className="mb-5 rounded-xl border border-black/8 bg-white px-4 py-3 text-sm text-black/60">
          {notice}
        </div>
      ) : null}
      {orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-black/12 bg-white/50 px-6 py-16 text-center">
          <ShoppingBag className="mx-auto size-7 text-black/25" />
          <h2 className="mt-3 font-semibold">No orders yet</h2>
          <p className="mt-1 text-sm text-black/45">
            Completed card payments and submitted CFI applications will appear
            here.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {orders.map((order) => (
            <OrderCard key={order.orderUuid} order={order} />
          ))}
        </div>
      )}
    </DirectoryShell>
  )
}

function OrderCard({ order }: { order: Order }) {
  const router = useRouter()
  const checkEligibility = useServerFn(checkOrderDrawEligibility)
  const drawOrder = useServerFn(drawOrderWithCfi)
  const [eligibility, setEligibility] = useState<CfiDrawEligibility | null>(
    null
  )
  const [trancheId, setTrancheId] = useState("")
  const [isChecking, setIsChecking] = useState(false)
  const [isDrawing, setIsDrawing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const status = orderPresentation(order)
  const canCheck =
    order.paymentMethod === "cfi" &&
    Boolean(order.loanUuid) &&
    Boolean(order.mainApplicantPersonUuid) &&
    !order.hasApplicantMismatch &&
    !order.cfiDrawUuid &&
    order.orderStatus === "financing_pending"

  async function handleCheck() {
    setIsChecking(true)
    setError(null)
    try {
      const result = await checkEligibility({
        data: { orderUuid: order.orderUuid },
      })
      setEligibility(result)
      setTrancheId(result.tranches[0]?.trancheId ?? "")
    } catch (checkError) {
      setError(errorMessage(checkError, "Eligibility check failed."))
    } finally {
      setIsChecking(false)
    }
  }

  async function handleDraw() {
    if (!trancheId) return
    setIsDrawing(true)
    setError(null)
    try {
      await drawOrder({ data: { orderUuid: order.orderUuid, trancheId } })
      await router.invalidate()
    } catch (drawError) {
      setError(errorMessage(drawError, "CFI draw failed."))
    } finally {
      setIsDrawing(false)
    }
  }

  return (
    <article className="overflow-hidden rounded-2xl border border-black/8 bg-white shadow-[0_10px_35px_rgba(33,54,39,0.04)]">
      <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_220px]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-semibold">{order.invoiceRef}</h2>
            <span
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${status.className}`}
            >
              {status.label}
            </span>
            <span className="rounded-full bg-black/5 px-2.5 py-1 text-[11px] text-black/45">
              {order.paymentMethod === "cfi" ? "CFI financing" : "Card"}
            </span>
          </div>
          <p className="mt-2 text-sm text-black/55">
            {order.customerName} · {order.customerEmail}
          </p>
          {order.customerRole ? (
            <p className="mt-1 text-xs font-medium text-[#39754d]">
              CFI{" "}
              {order.customerRole === "main_applicant"
                ? "main applicant"
                : "co-applicant"}
            </p>
          ) : null}
          <p className="mt-1 text-xs text-black/35">
            {order.items
              .map((item) => `${item.quantity}× ${item.name}`)
              .join(" · ")}
          </p>
          {order.paymentMethod === "cfi" ? (
            <div className="mt-4 grid gap-2 text-xs sm:grid-cols-3">
              <MoneyDatum
                label="Requested"
                value={order.requestedCents ?? order.totalCents}
              />
              <MoneyDatum label="Approved" value={order.approvedCents} />
              <MoneyDatum label="Available" value={order.availableCents} />
            </div>
          ) : null}
          {order.cfiFinancingUuid ? (
            <p className="mt-3 truncate font-mono text-[10px] text-black/30">
              Financing {order.cfiFinancingUuid}
            </p>
          ) : null}
          {order.hasApplicantMismatch ? (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
              <CircleAlert className="mt-0.5 size-4 shrink-0" />
              This order’s customer is not the main applicant or a co-applicant
              on the linked financing line. Drawing is blocked until the order
              is linked to the correct application.
              {order.mainApplicantName
                ? ` The linked line belongs to ${order.mainApplicantName}.`
                : ""}
            </div>
          ) : null}
          {order.cfiDrawFailure ? (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
              <p className="font-medium">{order.cfiDrawFailure.message}</p>
              <p className="mt-1 text-xs opacity-70">
                {order.cfiDrawFailure.reason} ·{" "}
                {order.cfiDrawFailure.retriable
                  ? "Retry may succeed"
                  : "Do not retry without changing the request"}
              </p>
            </div>
          ) : null}
        </div>
        <div className="flex flex-col items-end justify-between gap-4 border-black/8 lg:border-l lg:pl-5">
          <div className="text-right">
            <p className="text-2xl font-semibold tracking-[-0.04em]">
              {formatMinor(order.totalCents)}
            </p>
            <p className="mt-1 text-xs text-black/35">
              {new Date(order.createdAt).toLocaleDateString()}
            </p>
          </div>
          {canCheck ? (
            <Button
              variant="outline"
              onClick={() => void handleCheck()}
              disabled={isChecking}
            >
              {isChecking ? (
                <LoaderCircle className="animate-spin" />
              ) : (
                <WalletCards />
              )}
              {isChecking ? "Checking…" : "Check draw eligibility"}
            </Button>
          ) : null}
        </div>
      </div>

      {eligibility ? (
        <div className="border-t border-black/8 bg-[#f8f8f3] px-5 py-4">
          {eligibility.drawable && eligibility.requestedAmountEligible ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="flex items-center gap-2 text-sm font-medium text-emerald-800">
                  <Check className="size-4" /> Eligible to draw{" "}
                  {formatMinor(order.totalCents)}
                </p>
                <label className="mt-3 grid gap-1 text-xs text-black/50">
                  Draw tranche
                  <select
                    value={trancheId}
                    onChange={(event) => setTrancheId(event.target.value)}
                    className="h-9 min-w-72 rounded-lg border border-black/10 bg-white px-3 text-sm"
                  >
                    {eligibility.tranches.map((tranche) => (
                      <option key={tranche.trancheId} value={tranche.trancheId}>
                        {tranche.reference} · {tranche.description}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <Button
                onClick={() => void handleDraw()}
                disabled={!trancheId || isDrawing}
              >
                {isDrawing ? (
                  <LoaderCircle className="animate-spin" />
                ) : (
                  <WalletCards />
                )}
                {isDrawing ? "Drawing…" : "Draw & pay order"}
              </Button>
            </div>
          ) : (
            <p className="flex items-start gap-2 text-sm text-amber-900">
              <CircleAlert className="mt-0.5 size-4 shrink-0" />
              {eligibility.reason?.message ??
                "The full order amount is not currently eligible to draw."}
            </p>
          )}
        </div>
      ) : null}
      {error ? (
        <div className="border-t border-red-200 bg-red-50 px-5 py-3 text-sm text-red-900">
          {error}
        </div>
      ) : null}
    </article>
  )
}

function MoneyDatum({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded-lg bg-black/[0.025] px-3 py-2">
      <span className="block text-[10px] font-medium text-black/35 uppercase">
        {label}
      </span>
      <span className="mt-0.5 block font-medium">
        {value ? formatMinor(value) : "—"}
      </span>
    </div>
  )
}

function orderPresentation(order: Order) {
  if (order.hasApplicantMismatch)
    return { label: "Applicant mismatch", className: "bg-red-100 text-red-800" }
  if (order.orderStatus === "paid")
    return { label: "Paid", className: "bg-emerald-100 text-emerald-800" }
  if (order.orderStatus === "draw_processing")
    return { label: "Draw processing", className: "bg-blue-100 text-blue-800" }
  if (!order.financingStatus)
    return {
      label: "Awaiting CFI sync",
      className: "bg-amber-100 text-amber-900",
    }
  if (order.financingRawStatus === "cancelled")
    return { label: "Cancelled", className: "bg-slate-100 text-slate-700" }
  if (order.financingStatus === "declined")
    return { label: "Declined", className: "bg-red-100 text-red-800" }
  if (order.financingStatus === "approved" && !order.loanUuid)
    return {
      label: "Approved · awaiting funding",
      className: "bg-violet-100 text-violet-800",
    }
  if (order.loanUuid)
    return {
      label: "Funded · eligibility required",
      className: "bg-cyan-100 text-cyan-900",
    }
  const label = order.financingStatus.replaceAll("_", " ")
  return {
    label: label.charAt(0).toUpperCase() + label.slice(1),
    className: "bg-amber-100 text-amber-900",
  }
}

function formatMinor(value: string) {
  const cents = BigInt(value)
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(cents) / 100)
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}
