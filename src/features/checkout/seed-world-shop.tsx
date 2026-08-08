import { Link, useRouter } from "@tanstack/react-router"
import { useServerFn } from "@tanstack/react-start"
import {
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  CreditCard,
  Leaf,
  LoaderCircle,
  Minus,
  PackageCheck,
  Plus,
  RefreshCw,
  Search,
  ShoppingBag,
  Sprout,
  UserRound,
  WalletCards,
} from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { syncApplicants } from "@/features/applicants/applicants.functions"
import { NewApplicationForm } from "@/features/applications/new-application-dialog"
import { saveSeedWorldOrder } from "@/features/orders/orders.functions"
import {
  checkCreditLineEligibility,
  getCustomerCreditLines,
  payOrderWithCfi,
} from "./checkout.functions"
import type {
  CfiCustomerFinancingOverview,
  CfiCreditLine,
  CfiDrawEligibility,
  CfiFinancingApplication,
} from "@/cfi/checkout-financing.server"

export type SeedWorldCustomer = {
  personUuid: string
  firstName: string
  lastName: string
  email: string
  phone: string
  farmName: string | null
  city: string
  state: string
}

type Product = {
  id: string
  name: string
  variety: string
  unit: string
  priceCents: number
  category: string
  accent: string
  initials: string
}

export const seedWorldProducts: Array<Product> = [
  {
    id: "corn-7210",
    name: "Field Corn 7210",
    variety: "High-yield dent hybrid",
    unit: "80,000 seed unit",
    priceCents: 28900,
    category: "Corn",
    accent: "from-amber-100 to-yellow-50 text-amber-700",
    initials: "C7",
  },
  {
    id: "soy-38x",
    name: "Soybean 38X",
    variety: "Mid-season, strong emergence",
    unit: "140,000 seed unit",
    priceCents: 7240,
    category: "Soybean",
    accent: "from-emerald-100 to-lime-50 text-emerald-700",
    initials: "S3",
  },
  {
    id: "wheat-red",
    name: "Hard Red Winter Wheat",
    variety: "Cold-hardy certified seed",
    unit: "50 lb bag",
    priceCents: 4650,
    category: "Wheat",
    accent: "from-orange-100 to-amber-50 text-orange-700",
    initials: "RW",
  },
  {
    id: "alfalfa-44",
    name: "Alfalfa 4.4",
    variety: "Fast recovery forage blend",
    unit: "50 lb bag",
    priceCents: 21800,
    category: "Forage",
    accent: "from-green-100 to-emerald-50 text-green-700",
    initials: "A4",
  },
  {
    id: "cover-mix",
    name: "Soil Builder Mix",
    variety: "Eight-species cover crop",
    unit: "40 lb bag",
    priceCents: 8290,
    category: "Cover crop",
    accent: "from-teal-100 to-cyan-50 text-teal-700",
    initials: "SB",
  },
  {
    id: "sorghum-92",
    name: "Grain Sorghum 92",
    variety: "Drought-tolerant full season",
    unit: "50 lb bag",
    priceCents: 11850,
    category: "Sorghum",
    accent: "from-rose-100 to-orange-50 text-rose-700",
    initials: "G9",
  },
]

const checkoutCustomerResultLimit = 4

export function SeedWorldShop({
  loadedCustomers,
  initialCart,
}: {
  loadedCustomers: Array<SeedWorldCustomer>
  initialCart: Record<string, number>
}) {
  const router = useRouter()
  const sync = useServerFn(syncApplicants)
  const [customers, setCustomers] =
    useState<Array<SeedWorldCustomer>>(loadedCustomers)
  const [cart, setCart] = useState<Record<string, number>>(initialCart)
  const [isSyncing, setIsSyncing] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => setCustomers(loadedCustomers), [loadedCustomers])

  const cartItems = seedWorldProducts
    .filter(({ id }) => cart[id])
    .map((product) => ({ ...product, quantity: cart[product.id] }))
  const totalCents = cartItems.reduce(
    (sum, item) => sum + item.priceCents * item.quantity,
    0
  )

  function changeQuantity(productId: string, delta: number) {
    setCart((current) => {
      const nextQuantity = Math.max(0, (current[productId] ?? 0) + delta)
      const next = { ...current }
      if (nextQuantity === 0) delete next[productId]
      else next[productId] = nextQuantity
      return next
    })
  }

  async function handleCustomerSync() {
    setIsSyncing(true)
    setNotice(null)
    try {
      const result = await sync()
      await router.invalidate()
      setNotice(
        result.newPeople || result.newLines || result.newOrganizations
          ? `Added ${result.newPeople} people, ${result.newOrganizations} organizations, and ${result.newLines} financing lines from CFI.`
          : `CFI is up to date: ${result.people} people, ${result.organizations} organizations, and ${result.lines} lines.`
      )
    } catch (error) {
      setNotice(errorMessage(error, "Customer sync failed."))
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <main className="min-h-svh bg-[#f5f4ec] text-[#172019]">
      <header className="sticky top-0 z-20 border-b border-[#193b27]/10 bg-[#fffdf7]/92 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between px-5 py-3.5 sm:px-8">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-[#174b2c] text-white shadow-sm">
              <Sprout className="size-5" />
            </div>
            <div>
              <p className="text-lg leading-none font-semibold tracking-[-0.03em]">
                Seed World
              </p>
              <p className="mt-1 text-[11px] font-medium tracking-wide text-[#174b2c]/55 uppercase">
                Retail order desk
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <nav className="hidden items-center gap-1 md:flex">
              <Link
                to="/orders"
                className="rounded-lg px-3 py-2 text-xs font-medium text-black/50 hover:bg-black/[0.04]"
              >
                Orders
              </Link>
              <Link
                to="/people"
                className="rounded-lg px-3 py-2 text-xs font-medium text-black/50 hover:bg-black/[0.04]"
              >
                CFI People
              </Link>
              <Link
                to="/lines"
                className="rounded-lg px-3 py-2 text-xs font-medium text-black/50 hover:bg-black/[0.04]"
              >
                CFI Lines
              </Link>
            </nav>
            <button
              type="button"
              onClick={() => void handleCustomerSync()}
              disabled={isSyncing}
              className="hidden items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-black/50 hover:bg-black/[0.04] disabled:opacity-50 sm:flex"
            >
              <RefreshCw
                className={`size-3.5 ${isSyncing ? "animate-spin" : ""}`}
              />
              Sync CFI customers
            </button>
            <div className="flex items-center gap-2 rounded-full border border-[#174b2c]/12 bg-white px-3 py-1.5 text-xs font-medium text-[#174b2c]">
              <UserRound className="size-3.5" /> Seed World admin
            </div>
          </div>
        </div>
      </header>

      {notice ? (
        <div className="mx-auto mt-5 max-w-[1500px] px-5 sm:px-8">
          <div className="rounded-xl border border-[#174b2c]/15 bg-white px-4 py-3 text-sm text-[#174b2c]">
            {notice}
          </div>
        </div>
      ) : null}

      <div className="mx-auto grid max-w-[1500px] gap-8 px-5 py-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:px-8">
        <section>
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="flex items-center gap-2 text-sm font-semibold text-[#39754d]">
                <Leaf className="size-4" /> Spring 2027 catalog
              </p>
              <h1 className="mt-2 max-w-2xl text-4xl font-semibold tracking-[-0.055em] sm:text-5xl">
                Better seed starts here.
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-black/50">
                Build a grower’s order, then pay by card or use an available CFI
                financing line at checkout.
              </p>
            </div>
            <div className="rounded-full border border-black/8 bg-white px-4 py-2 text-xs font-medium text-black/45">
              {customers.length} CFI customers synced
            </div>
          </div>

          <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {seedWorldProducts.map((product) => (
              <article
                key={product.id}
                className="group overflow-hidden rounded-2xl border border-black/8 bg-[#fffdf8] shadow-[0_12px_35px_rgba(33,54,39,0.045)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_45px_rgba(33,54,39,0.09)]"
              >
                <div
                  className={`grid h-32 place-items-center bg-gradient-to-br ${product.accent}`}
                >
                  <div className="grid size-16 place-items-center rounded-2xl border border-current/10 bg-white/65 text-xl font-semibold tracking-[-0.04em] shadow-sm backdrop-blur">
                    {product.initials}
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold tracking-wide text-[#39754d] uppercase">
                        {product.category}
                      </p>
                      <h2 className="mt-1 font-semibold tracking-[-0.02em]">
                        {product.name}
                      </h2>
                    </div>
                    <p className="font-semibold">
                      {formatCents(product.priceCents)}
                    </p>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-black/45">
                    {product.variety} · {product.unit}
                  </p>
                  <div className="mt-4 flex items-center justify-between">
                    {cart[product.id] ? (
                      <QuantityControl
                        quantity={cart[product.id]}
                        onDecrease={() => changeQuantity(product.id, -1)}
                        onIncrease={() => changeQuantity(product.id, 1)}
                      />
                    ) : (
                      <Button
                        variant="outline"
                        onClick={() => changeQuantity(product.id, 1)}
                      >
                        <Plus /> Add to order
                      </Button>
                    )}
                    <span className="text-[11px] text-black/35">In stock</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="overflow-hidden rounded-2xl border border-black/8 bg-white shadow-[0_20px_60px_rgba(33,54,39,0.08)]">
            <div className="flex items-center justify-between border-b border-black/8 px-5 py-4">
              <div className="flex items-center gap-2">
                <ShoppingBag className="size-4 text-[#39754d]" />
                <h2 className="font-semibold">Current order</h2>
              </div>
              <span className="text-xs text-black/40">
                {cartItems.reduce((sum, item) => sum + item.quantity, 0)} units
              </span>
            </div>
            <div className="max-h-[440px] overflow-y-auto px-5">
              {cartItems.length ? (
                cartItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 border-b border-black/6 py-4 last:border-0"
                  >
                    <div
                      className={`grid size-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-xs font-semibold ${item.accent}`}
                    >
                      {item.initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {item.name}
                      </p>
                      <p className="mt-0.5 text-xs text-black/40">
                        {item.quantity} × {formatCents(item.priceCents)}
                      </p>
                    </div>
                    <p className="text-sm font-semibold">
                      {formatCents(item.priceCents * item.quantity)}
                    </p>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center text-sm text-black/40">
                  Add seed to begin an order.
                </div>
              )}
            </div>
            <div className="border-t border-black/8 bg-[#fbfaf5] p-5">
              <div className="flex items-center justify-between text-sm text-black/50">
                <span>Subtotal</span>
                <span>{formatCents(totalCents)}</span>
              </div>
              <div className="mt-2 flex items-end justify-between">
                <span className="font-medium">Order total</span>
                <span className="text-2xl font-semibold tracking-[-0.04em]">
                  {formatCents(totalCents)}
                </span>
              </div>
              <Button
                size="lg"
                className="mt-5 w-full bg-[#174b2c] hover:bg-[#24623c]"
                disabled={!cartItems.length}
                onClick={() =>
                  void router.navigate({
                    to: "/checkout",
                    search: { cart: encodeSeedWorldCart(cart) },
                  })
                }
              >
                Continue to checkout <ArrowRight />
              </Button>
              <p className="mt-3 text-center text-[11px] leading-4 text-black/35">
                CFI availability is checked only after selecting a customer.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </main>
  )
}

export function SeedWorldCheckoutPage({
  customers,
  cart,
}: {
  customers: Array<SeedWorldCustomer>
  cart: Record<string, number>
}) {
  const router = useRouter()
  const cartItems = seedWorldProducts
    .filter(({ id }) => cart[id])
    .map((product) => ({ ...product, quantity: cart[product.id] }))
  const totalCents = cartItems.reduce(
    (sum, item) => sum + item.priceCents * item.quantity,
    0
  )
  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0)
  const getCreditLines = useServerFn(getCustomerCreditLines)
  const checkEligibility = useServerFn(checkCreditLineEligibility)
  const createDraw = useServerFn(payOrderWithCfi)
  const saveOrder = useServerFn(saveSeedWorldOrder)
  const [step, setStep] = useState<
    "customer" | "payment" | "application" | "complete"
  >("customer")
  const [customerQuery, setCustomerQuery] = useState("")
  const [customerPage, setCustomerPage] = useState(0)
  const [selectedCustomer, setSelectedCustomer] =
    useState<SeedWorldCustomer | null>(null)
  const [newCustomer, setNewCustomer] = useState({
    firstName: "",
    lastName: "",
    email: "",
  })
  const [usingNewCustomer, setUsingNewCustomer] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<"card" | "cfi" | null>(
    null
  )
  const [financingOverview, setFinancingOverview] =
    useState<CfiCustomerFinancingOverview | null>(null)
  const [selectedLine, setSelectedLine] = useState<CfiCreditLine | null>(null)
  const [eligibility, setEligibility] = useState<CfiDrawEligibility | null>(
    null
  )
  const [selectedTrancheId, setSelectedTrancheId] = useState("")
  const [isChecking, setIsChecking] = useState(false)
  const [isPaying, setIsPaying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{
    kind: "paid" | "pending" | "processing" | "card"
    reference: string
  } | null>(null)
  const [orderId] = useState(() => crypto.randomUUID())

  const customer = selectedCustomer
    ? selectedCustomer
    : usingNewCustomer
      ? {
          personUuid: "",
          phone: "",
          farmName: null,
          city: "",
          state: "",
          ...newCustomer,
        }
      : null
  const customerEmail = customer?.email ?? ""
  const invoiceRef = `SW-${orderId.slice(0, 8).toUpperCase()}`
  const matchingCustomers = useMemo(() => {
    const query = customerQuery.trim().toLowerCase()
    if (!query) return customers
    return customers.filter((candidate) =>
      [
        candidate.firstName,
        candidate.lastName,
        candidate.email,
        candidate.farmName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query)
    )
  }, [customerQuery, customers])
  const customerPageCount = Math.max(
    1,
    Math.ceil(matchingCustomers.length / checkoutCustomerResultLimit)
  )
  const activeCustomerPage = Math.min(customerPage, customerPageCount - 1)
  const pagedCustomers = matchingCustomers.slice(
    activeCustomerPage * checkoutCustomerResultLimit,
    (activeCustomerPage + 1) * checkoutCustomerResultLimit
  )

  useEffect(() => {
    setPaymentMethod(null)
    setFinancingOverview(null)
    setSelectedLine(null)
    setEligibility(null)
    setSelectedTrancheId("")
    setError(null)
  }, [customerEmail])

  async function loadCreditLines() {
    if (!customer?.email) return
    setIsChecking(true)
    setError(null)
    setSelectedLine(null)
    setEligibility(null)
    try {
      const overview = await getCreditLines({
        data: {
          ...(customer.personUuid ? { personUuid: customer.personUuid } : {}),
          email: customer.email,
        },
      })
      setFinancingOverview(overview)
    } catch (loadError) {
      setError(errorMessage(loadError, "Could not check CFI financing."))
    } finally {
      setIsChecking(false)
    }
  }

  async function chooseLine(line: CfiCreditLine) {
    setSelectedLine(line)
    setEligibility(null)
    setSelectedTrancheId("")
    setIsChecking(true)
    setError(null)
    try {
      const value = await checkEligibility({
        data: {
          financingUuid: line.financingUuid,
          loanRef: line.loanUuid,
          expectedMainApplicantPersonUuid: line.mainApplicantPersonUuid,
          amountMinor: String(totalCents),
        },
      })
      setEligibility(value)
      setSelectedTrancheId(value.tranches[0]?.trancheId ?? "")
    } catch (eligibilityError) {
      setError(errorMessage(eligibilityError, "Eligibility check failed."))
    } finally {
      setIsChecking(false)
    }
  }

  async function payWithCfi() {
    if (!selectedLine || !selectedTrancheId || !invoiceRef) return
    setIsPaying(true)
    setError(null)
    let orderSavedForDraw = false
    try {
      await persistOrder({
        paymentMethod: "cfi",
        orderStatus: "draw_processing",
        financingUuid: selectedLine.financingUuid,
        resolvedCustomerPersonUuid: financingOverview?.personUuid,
      })
      orderSavedForDraw = true
      const draw = await createDraw({
        data: {
          financingUuid: selectedLine.financingUuid,
          loanRef: selectedLine.loanUuid,
          expectedMainApplicantPersonUuid: selectedLine.mainApplicantPersonUuid,
          trancheId: selectedTrancheId,
          amountMinor: String(totalCents),
          description: `Seed World order ${invoiceRef}`,
          invoiceRef,
          idempotencyKey: `seedworld-${orderId}-draw-1`,
        },
      })
      await persistOrder({
        paymentMethod: "cfi",
        orderStatus:
          draw.draw.status === "succeeded"
            ? "paid"
            : draw.draw.status === "in_progress"
              ? "draw_processing"
              : "draw_rejected",
        financingUuid: selectedLine.financingUuid,
        drawUuid: draw.draw.drawUuid,
        drawStatus: draw.draw.status,
      })
      if (draw.draw.status !== "succeeded") {
        if (draw.draw.status === "in_progress") {
          setResult({ kind: "processing", reference: draw.draw.drawUuid })
          setStep("complete")
          return
        }
        throw new Error(
          "CFI rejected this draw. The order was saved for review."
        )
      }
      setResult({ kind: "paid", reference: draw.draw.drawUuid })
      setStep("complete")
    } catch (drawError) {
      setError(
        orderSavedForDraw
          ? `${errorMessage(drawError, "CFI payment failed.")} The order is saved in Orders and can be reconciled safely.`
          : errorMessage(drawError, "CFI payment failed.")
      )
    } finally {
      setIsPaying(false)
    }
  }

  async function finishCardOrder() {
    setIsPaying(true)
    setError(null)
    try {
      await persistOrder({
        paymentMethod: "card",
        orderStatus: "paid",
      })
      setResult({ kind: "card", reference: invoiceRef })
      setStep("complete")
    } catch (saveError) {
      setError(errorMessage(saveError, "Could not save this order."))
    } finally {
      setIsPaying(false)
    }
  }

  async function handleApplicationSubmitted(submissionResult: {
    financingUuid: string
    personUuid: string
    replayed: boolean
  }) {
    await persistOrder({
      paymentMethod: "cfi",
      orderStatus: "financing_pending",
      financingUuid: submissionResult.financingUuid,
      resolvedCustomerPersonUuid: submissionResult.personUuid,
    })
    setResult({ kind: "pending", reference: submissionResult.financingUuid })
    setStep("complete")
  }

  async function persistOrder({
    paymentMethod: savedPaymentMethod,
    orderStatus,
    financingUuid = null,
    drawUuid = null,
    drawStatus = null,
    resolvedCustomerPersonUuid,
  }: {
    paymentMethod: "card" | "cfi"
    orderStatus:
      "paid" | "financing_pending" | "draw_processing" | "draw_rejected"
    financingUuid?: string | null
    drawUuid?: string | null
    drawStatus?: "in_progress" | "succeeded" | "rejected" | null
    resolvedCustomerPersonUuid?: string | null
  }) {
    if (!customer) throw new Error("Choose a customer before saving the order.")
    await saveOrder({
      data: {
        orderUuid: orderId,
        invoiceRef,
        customerPersonUuid:
          resolvedCustomerPersonUuid ??
          financingOverview?.personUuid ??
          (customer.personUuid || null),
        customerName: `${customer.firstName} ${customer.lastName}`.trim(),
        customerEmail: customer.email,
        items: cartItems.map((item) => ({
          productId: item.id,
          name: item.name,
          quantity: item.quantity,
          unitPriceCents: item.priceCents,
        })),
        totalCents: String(totalCents),
        paymentMethod: savedPaymentMethod,
        orderStatus,
        cfiFinancingUuid: financingUuid,
        cfiDrawUuid: drawUuid,
        cfiDrawStatus: drawStatus,
      },
    })
  }

  const enoughLines =
    financingOverview?.creditLines.filter(
      (line) => BigInt(line.available) >= BigInt(totalCents)
    ) ?? []
  const creditLines = financingOverview?.creditLines ?? null

  return (
    <main className="min-h-svh bg-[#f5f4ec] text-[#172019]">
      <header className="border-b border-[#193b27]/10 bg-[#fffdf7]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <Link
            to="/"
            search={{ cart: encodeSeedWorldCart(cart) }}
            className="flex items-center gap-3"
          >
            <span className="grid size-10 place-items-center rounded-xl bg-[#174b2c] text-white">
              <Sprout className="size-5" />
            </span>
            <span>
              <span className="block font-semibold">Seed World</span>
              <span className="block text-xs text-black/40">
                Secure checkout
              </span>
            </span>
          </Link>
          <Link
            to="/"
            search={{ cart: encodeSeedWorldCart(cart) }}
            className="flex items-center gap-1.5 text-sm font-medium text-black/50 hover:text-black"
          >
            <ChevronLeft className="size-4" /> Back to catalog
          </Link>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-6 px-5 py-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:px-8">
        <section className="overflow-hidden rounded-2xl border border-black/8 bg-[#f7f7f1] shadow-[0_20px_60px_rgba(33,54,39,0.08)]">
          <header className="border-b border-black/8 bg-white px-6 py-5">
            <p className="text-xs font-semibold tracking-wide text-[#39754d] uppercase">
              {invoiceRef || "Seed World checkout"}
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-[-0.035em]">
              {step === "customer"
                ? "Who is this order for?"
                : step === "payment"
                  ? "How do they want to pay?"
                  : step === "application"
                    ? "Apply for CFI financing"
                    : "Order updated"}
            </h1>
            <p className="mt-1 text-sm text-black/45">
              {itemCount} units · {formatCents(totalCents)} total
            </p>
          </header>

          <div className="p-6">
            {step === "customer" ? (
              <CustomerStep
                query={customerQuery}
                onQueryChange={(value) => {
                  setCustomerQuery(value)
                  setCustomerPage(0)
                }}
                customers={pagedCustomers}
                totalCustomers={matchingCustomers.length}
                page={activeCustomerPage}
                pageCount={customerPageCount}
                onPageChange={setCustomerPage}
                selected={selectedCustomer}
                usingNew={usingNewCustomer}
                newCustomer={newCustomer}
                onSelect={(value) => {
                  setSelectedCustomer(value)
                  setUsingNewCustomer(false)
                }}
                onUseNew={() => {
                  setUsingNewCustomer(true)
                  setSelectedCustomer(null)
                }}
                onNewCustomerChange={setNewCustomer}
              />
            ) : null}

            {step === "payment" && customer ? (
              <PaymentStep
                customer={customer}
                customerDirectory={customers}
                paymentMethod={paymentMethod}
                onPaymentMethodChange={(method) => {
                  setPaymentMethod(method)
                  setError(null)
                  if (method === "cfi" && creditLines === null)
                    void loadCreditLines()
                }}
                creditLines={creditLines}
                applications={financingOverview?.applications ?? null}
                lookupStatus={financingOverview?.lookupStatus ?? null}
                matchedPersonName={financingOverview?.matchedPersonName ?? null}
                enoughLines={enoughLines}
                selectedLine={selectedLine}
                eligibility={eligibility}
                selectedTrancheId={selectedTrancheId}
                isChecking={isChecking}
                isPaying={isPaying}
                totalCents={totalCents}
                onChooseLine={(line) => void chooseLine(line)}
                onTrancheChange={setSelectedTrancheId}
                onRetry={() => void loadCreditLines()}
                onPay={() => void payWithCfi()}
                onCardPayment={finishCardOrder}
                applicationAction={
                  <Button onClick={() => setStep("application")}>
                    <Plus />
                    {financingOverview?.applications.length
                      ? "Start another application"
                      : "Apply for CFI financing"}
                  </Button>
                }
              />
            ) : null}

            {step === "application" && customer ? (
              <NewApplicationForm
                initialApplicant={
                  selectedCustomer
                    ? {
                        personUuid: selectedCustomer.personUuid,
                        firstName: selectedCustomer.firstName,
                        lastName: selectedCustomer.lastName,
                        email: selectedCustomer.email,
                      }
                    : financingOverview?.personUuid
                      ? {
                          personUuid: financingOverview.personUuid,
                          firstName:
                            financingOverview.matchedPersonName?.split(
                              " "
                            )[0] ?? newCustomer.firstName,
                          lastName:
                            financingOverview.matchedPersonName
                              ?.split(" ")
                              .slice(1)
                              .join(" ") ?? newCustomer.lastName,
                          email: newCustomer.email,
                        }
                      : undefined
                }
                initialNewApplicant={
                  selectedCustomer || financingOverview?.personUuid
                    ? undefined
                    : newCustomer
                }
                initialAmountDollars={(totalCents / 100).toFixed(2)}
                onBack={() => setStep("payment")}
                onSubmitted={handleApplicationSubmitted}
              />
            ) : null}

            {step === "complete" && result ? (
              <OrderResult result={result} invoiceRef={invoiceRef} />
            ) : null}

            {error ? (
              <div className="mt-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
                <CircleAlert className="mt-0.5 size-4 shrink-0" /> {error}
              </div>
            ) : null}
          </div>

          {step !== "application" ? (
            <footer className="flex items-center justify-between border-t border-black/8 bg-white px-6 py-4">
              {step === "customer" ? (
                <span className="text-xs text-black/35">
                  Acting as Seed World admin
                </span>
              ) : step === "payment" ? (
                <Button variant="ghost" onClick={() => setStep("customer")}>
                  <ChevronLeft /> Customer
                </Button>
              ) : (
                <span />
              )}
              {step === "customer" ? (
                <Button
                  disabled={!customer || !customer.email || totalCents === 0}
                  onClick={() => setStep("payment")}
                >
                  Continue to payment <ArrowRight />
                </Button>
              ) : null}
              {step === "complete" ? (
                <Button
                  onClick={() =>
                    void router.navigate({ to: "/", search: { cart: "" } })
                  }
                >
                  Done
                </Button>
              ) : null}
            </footer>
          ) : null}
        </section>

        <aside className="h-fit rounded-2xl border border-black/8 bg-white p-5 shadow-[0_16px_45px_rgba(33,54,39,0.06)] lg:sticky lg:top-6">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Order summary</h2>
            <span className="text-xs text-black/40">{itemCount} units</span>
          </div>
          <div className="mt-4 divide-y divide-black/6 border-y border-black/8">
            {cartItems.map((item) => (
              <div key={item.id} className="flex gap-3 py-3">
                <span
                  className={`grid size-10 shrink-0 place-items-center rounded-lg bg-gradient-to-br text-xs font-semibold ${item.accent}`}
                >
                  {item.initials}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {item.name}
                  </span>
                  <span className="block text-xs text-black/40">
                    {item.quantity} × {formatCents(item.priceCents)}
                  </span>
                </span>
                <span className="text-sm font-medium">
                  {formatCents(item.quantity * item.priceCents)}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-end justify-between">
            <span className="text-sm text-black/50">Total</span>
            <span className="text-2xl font-semibold tracking-[-0.04em]">
              {formatCents(totalCents)}
            </span>
          </div>
        </aside>
      </div>
    </main>
  )
}

function CustomerStep({
  query,
  onQueryChange,
  customers,
  totalCustomers,
  page,
  pageCount,
  onPageChange,
  selected,
  usingNew,
  newCustomer,
  onSelect,
  onUseNew,
  onNewCustomerChange,
}: {
  query: string
  onQueryChange: (value: string) => void
  customers: Array<SeedWorldCustomer>
  totalCustomers: number
  page: number
  pageCount: number
  onPageChange: (page: number) => void
  selected: SeedWorldCustomer | null
  usingNew: boolean
  newCustomer: { firstName: string; lastName: string; email: string }
  onSelect: (customer: SeedWorldCustomer) => void
  onUseNew: () => void
  onNewCustomerChange: (value: {
    firstName: string
    lastName: string
    email: string
  }) => void
}) {
  return (
    <section>
      <label className="relative block">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-black/35" />
        <span className="sr-only">Search synced CFI customers</span>
        <input
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search customer, email, or farm"
          className="h-11 w-full rounded-xl border border-black/10 bg-white pr-4 pl-10 text-sm outline-none focus:border-[#39754d] focus:ring-2 focus:ring-[#39754d]/10"
        />
      </label>
      <p className="mt-2 text-xs text-black/40">
        {query
          ? `${totalCustomers} matching synced ${totalCustomers === 1 ? "customer" : "customers"}.`
          : `Search all ${totalCustomers} synced customers by name, email, or farm.`}
      </p>

      <div className="mt-4 grid gap-2">
        {customers.map((customer) => {
          const active = selected?.personUuid === customer.personUuid
          return (
            <button
              key={customer.personUuid}
              type="button"
              onClick={() => onSelect(customer)}
              className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${active ? "border-[#39754d]/35 bg-[#edf4eb]" : "border-black/8 bg-white hover:border-black/15"}`}
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#174b2c] text-xs font-semibold text-white">
                {initials(customer.firstName, customer.lastName)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">
                  {customer.firstName} {customer.lastName}
                </span>
                <span className="block truncate text-xs text-black/45">
                  {customer.farmName || "Personal"} · {customer.email}
                </span>
              </span>
              {active ? <Check className="size-4 text-[#39754d]" /> : null}
            </button>
          )
        })}
        {customers.length === 0 ? (
          <div className="rounded-xl border border-dashed border-black/12 bg-white/50 px-4 py-6 text-center text-sm text-black/40">
            No synced customers match this search.
          </div>
        ) : null}
      </div>

      {totalCustomers > checkoutCustomerResultLimit ? (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-black/[0.025] px-3 py-2">
          <span className="text-xs text-black/45">
            Showing {page * checkoutCustomerResultLimit + 1}–
            {Math.min((page + 1) * checkoutCustomerResultLimit, totalCustomers)}{" "}
            of {totalCustomers}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Previous customers"
              disabled={page === 0}
              onClick={() => onPageChange(page - 1)}
              className="grid size-8 place-items-center rounded-lg border border-black/8 bg-white text-black/55 hover:bg-black/[0.03] disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="min-w-14 text-center text-xs font-medium text-black/50">
              {page + 1} / {pageCount}
            </span>
            <button
              type="button"
              aria-label="Next customers"
              disabled={page + 1 >= pageCount}
              onClick={() => onPageChange(page + 1)}
              className="grid size-8 place-items-center rounded-lg border border-black/8 bg-white text-black/55 hover:bg-black/[0.03] disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      ) : null}

      <div className="my-5 flex items-center gap-3 text-[11px] font-medium tracking-wide text-black/30 uppercase">
        <span className="h-px flex-1 bg-black/8" /> or{" "}
        <span className="h-px flex-1 bg-black/8" />
      </div>

      <button
        type="button"
        onClick={onUseNew}
        className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left ${usingNew ? "border-[#39754d]/35 bg-[#edf4eb]" : "border-black/8 bg-white"}`}
      >
        <span className="grid size-9 place-items-center rounded-full bg-black/5">
          <Plus className="size-4" />
        </span>
        <span>
          <span className="block text-sm font-medium">New customer</span>
          <span className="block text-xs text-black/45">
            Not in the synced CFI customer list
          </span>
        </span>
      </button>

      {usingNew ? (
        <div className="mt-3 grid gap-3 rounded-xl border border-black/8 bg-white p-4 sm:grid-cols-2">
          <SimpleField
            label="First name"
            value={newCustomer.firstName}
            onChange={(firstName) =>
              onNewCustomerChange({ ...newCustomer, firstName })
            }
          />
          <SimpleField
            label="Last name"
            value={newCustomer.lastName}
            onChange={(lastName) =>
              onNewCustomerChange({ ...newCustomer, lastName })
            }
          />
          <div className="sm:col-span-2">
            <SimpleField
              label="Email"
              type="email"
              value={newCustomer.email}
              onChange={(email) =>
                onNewCustomerChange({ ...newCustomer, email })
              }
            />
          </div>
        </div>
      ) : null}
    </section>
  )
}

function PaymentStep({
  customer,
  customerDirectory,
  paymentMethod,
  onPaymentMethodChange,
  creditLines,
  applications,
  lookupStatus,
  matchedPersonName,
  enoughLines,
  selectedLine,
  eligibility,
  selectedTrancheId,
  isChecking,
  isPaying,
  totalCents,
  onChooseLine,
  onTrancheChange,
  onRetry,
  onPay,
  onCardPayment,
  applicationAction,
}: {
  customer: { firstName: string; lastName: string; email: string }
  customerDirectory: Array<SeedWorldCustomer>
  paymentMethod: "card" | "cfi" | null
  onPaymentMethodChange: (method: "card" | "cfi") => void
  creditLines: Array<CfiCreditLine> | null
  applications: Array<CfiFinancingApplication> | null
  lookupStatus: CfiCustomerFinancingOverview["lookupStatus"] | null
  matchedPersonName: string | null
  enoughLines: Array<CfiCreditLine>
  selectedLine: CfiCreditLine | null
  eligibility: CfiDrawEligibility | null
  selectedTrancheId: string
  isChecking: boolean
  isPaying: boolean
  totalCents: number
  onChooseLine: (line: CfiCreditLine) => void
  onTrancheChange: (value: string) => void
  onRetry: () => void
  onPay: () => void
  onCardPayment: () => void
  applicationAction: React.ReactNode
}) {
  return (
    <section>
      <div className="mb-5 flex items-center gap-3 rounded-xl border border-black/8 bg-white p-3">
        <span className="grid size-9 place-items-center rounded-full bg-[#edf4eb] text-[#39754d]">
          <UserRound className="size-4" />
        </span>
        <div>
          <p className="text-sm font-medium">
            {customer.firstName} {customer.lastName}
          </p>
          <p className="text-xs text-black/45">{customer.email}</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <PaymentMethodCard
          icon={<CreditCard />}
          title="Card payment"
          description="Take payment outside CFI"
          active={paymentMethod === "card"}
          onClick={() => onPaymentMethodChange("card")}
        />
        <PaymentMethodCard
          icon={<WalletCards />}
          title="CFI financing"
          description="Use an available funded line"
          active={paymentMethod === "cfi"}
          onClick={() => onPaymentMethodChange("cfi")}
        />
      </div>

      {paymentMethod === "card" ? (
        <div className="mt-5 rounded-xl border border-black/8 bg-white p-5">
          <p className="text-sm font-medium">Card terminal handoff</p>
          <p className="mt-1 text-sm leading-5 text-black/45">
            This demo treats the retailer’s card terminal as an external payment
            method.
          </p>
          <Button className="mt-4" onClick={onCardPayment}>
            <CreditCard /> Mark card payment complete
          </Button>
        </div>
      ) : null}

      {paymentMethod === "cfi" ? (
        <div className="mt-5 rounded-xl border border-black/8 bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">CFI financing</p>
              <p className="mt-1 text-xs text-black/45">
                Review this customer’s application history and any funded lines
                available for this order.
              </p>
            </div>
            {isChecking ? (
              <LoaderCircle className="size-4 animate-spin text-[#39754d]" />
            ) : null}
          </div>

          {!isChecking && lookupStatus === "matched" ? (
            <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 text-xs text-blue-950">
              Existing CFI customer found for this email
              {matchedPersonName ? `: ${matchedPersonName}` : ""}. Their CFI
              history is shown below and will be used if you apply again.
            </div>
          ) : null}

          {!isChecking && lookupStatus === "ambiguous" ? (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-950">
              More than one CFI person matched this email. Select the existing
              customer from the customer directory before continuing.
            </div>
          ) : null}

          {!isChecking && applications?.length ? (
            <ExistingApplications
              applications={applications}
              customerDirectory={customerDirectory}
            />
          ) : null}

          {!isChecking && creditLines?.length === 0 ? (
            <EmptyFinancing
              message={noFundedLineMessage(applications ?? [])}
              action={applicationAction}
            />
          ) : null}

          {!isChecking &&
          creditLines &&
          creditLines.length > 0 &&
          enoughLines.length === 0 ? (
            <EmptyFinancing
              message="The customer has funded lines, but none has enough available credit for this order."
              action={applicationAction}
            />
          ) : null}

          {enoughLines.length ? (
            <div className="mt-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold tracking-wide text-black/55 uppercase">
                  Funded lines available for this order
                </p>
                <span className="text-xs text-black/40">
                  {formatCents(totalCents)} order
                </span>
              </div>
              <div className="mt-2 grid gap-2">
                {enoughLines.map((line) => (
                  <button
                    key={line.loanUuid}
                    type="button"
                    onClick={() => onChooseLine(line)}
                    className={`flex items-center justify-between rounded-xl border p-3 text-left ${selectedLine?.loanUuid === line.loanUuid ? "border-[#39754d]/35 bg-[#edf4eb]" : "border-black/8 hover:border-black/15"}`}
                  >
                    <span>
                      <span className="block text-sm font-medium">
                        {line.cropYear
                          ? `${line.cropYear} crop-year line`
                          : "Funded credit line"}
                      </span>
                      <span className="mt-0.5 block text-xs text-black/40">
                        {line.status} ·{" "}
                        {line.customerRole === "main_applicant"
                          ? "main applicant"
                          : `co-applicant · primary ${customerNameForUuid(customerDirectory, line.mainApplicantPersonUuid)}`}{" "}
                        · {line.loanUuid.slice(0, 8)}…
                      </span>
                    </span>
                    <span className="text-right">
                      <span className="block text-sm font-semibold">
                        {formatMoneyString(line.available)}
                      </span>
                      <span className="block text-[11px] text-black/35">
                        available
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {selectedLine && eligibility ? (
            <div
              className={`mt-4 rounded-xl border p-4 ${eligibility.drawable && eligibility.requestedAmountEligible ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}
            >
              {eligibility.drawable && eligibility.requestedAmountEligible ? (
                <>
                  <p className="flex items-center gap-2 text-sm font-medium text-emerald-900">
                    <Check className="size-4" /> Eligible to draw
                  </p>
                  {eligibility.tranches.length ? (
                    <label className="mt-3 grid gap-1.5 text-xs font-medium text-emerald-950/65">
                      Program
                      <select
                        value={selectedTrancheId}
                        onChange={(event) =>
                          onTrancheChange(event.target.value)
                        }
                        className="h-9 rounded-lg border border-emerald-900/15 bg-white px-3 text-sm outline-none"
                      >
                        {eligibility.tranches.map((tranche) => (
                          <option
                            key={tranche.trancheId}
                            value={tranche.trancheId}
                          >
                            {tranche.description} · {tranche.reference}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : (
                    <p className="mt-2 text-xs text-amber-900">
                      CFI marked the loan drawable but did not return a tranche.
                    </p>
                  )}
                  <Button
                    className="mt-4 bg-[#174b2c] hover:bg-[#24623c]"
                    disabled={!selectedTrancheId || isPaying}
                    onClick={onPay}
                  >
                    {isPaying ? (
                      <LoaderCircle className="animate-spin" />
                    ) : (
                      <PackageCheck />
                    )}
                    {isPaying
                      ? "Creating draw…"
                      : `Place order & draw ${formatCents(totalCents)}`}
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium text-amber-950">
                    This line cannot be drawn right now
                  </p>
                  <p className="mt-1 text-sm text-amber-900/70">
                    {eligibility.reason?.message ??
                      (eligibility.drawable
                        ? "This line cannot cover the full order amount."
                        : "The line is not currently drawable.")}
                  </p>
                  <div className="mt-4">{applicationAction}</div>
                </>
              )}
            </div>
          ) : null}

          {!isChecking && creditLines === null ? (
            <Button variant="outline" className="mt-4" onClick={onRetry}>
              <RefreshCw /> Check CFI availability
            </Button>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}

function ExistingApplications({
  applications,
  customerDirectory,
}: {
  applications: Array<CfiFinancingApplication>
  customerDirectory: Array<SeedWorldCustomer>
}) {
  return (
    <div className="mt-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold tracking-wide text-black/55 uppercase">
          Existing CFI applications
        </p>
        <span className="text-xs text-black/40">
          {applications.length}{" "}
          {applications.length === 1 ? "record" : "records"}
        </span>
      </div>
      <div className="mt-2 grid gap-2">
        {applications.map((application) => (
          <div
            key={application.financingUuid}
            className="rounded-xl border border-black/8 bg-[#fafaf6] p-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${applicationStatusClass(application.status)}`}
                  >
                    {applicationStatusLabel(application.status)}
                  </span>
                  <span className="text-xs text-black/45">
                    {application.customerRole === "main_applicant"
                      ? "Main applicant"
                      : `Co-applicant · primary ${customerNameForUuid(customerDirectory, application.mainApplicantPersonUuid)}`}
                  </span>
                </div>
                <p className="mt-1.5 truncate font-mono text-[11px] text-black/35">
                  {application.financingUuid}
                </p>
                <p className="mt-1 text-[11px] text-black/40">
                  Updated {formatShortDate(application.updatedAt)} ·{" "}
                  {application.rawStatus.replaceAll("_", " ")}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-semibold">
                  {application.requested
                    ? formatMoneyString(application.requested)
                    : "—"}
                </p>
                <p className="text-[11px] text-black/35">requested</p>
                {application.loan ? (
                  <p className="mt-1 text-[11px] font-medium text-[#39754d]">
                    {formatMoneyString(application.loan.available)} available
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[11px] leading-4 text-black/40">
        Existing records are informational. Seed World can still deliberately
        start another application.
      </p>
    </div>
  )
}

function noFundedLineMessage(applications: Array<CfiFinancingApplication>) {
  const applicationsInProgress = applications.filter(
    (application) =>
      application.status !== "declined" && application.status !== "funded"
  ).length

  if (applicationsInProgress > 0) {
    return `${applicationsInProgress} existing ${applicationsInProgress === 1 ? "application is" : "applications are"} still in progress. This order cannot use CFI financing until an application produces a funded, eligible line.`
  }
  if (applications.length > 0) {
    return "This customer has CFI application history, but no funded line is currently available for this order."
  }
  return "No CFI applications or funded lines were found for this customer."
}

function applicationStatusLabel(status: CfiFinancingApplication["status"]) {
  if (status === "funded") return "Funded"
  if (status === "approved") return "Approved"
  if (status === "underwriting") return "Underwriting"
  if (status === "submitted") return "Submitted"
  if (status === "declined") return "Declined / closed"
  return "Draft"
}

function applicationStatusClass(status: CfiFinancingApplication["status"]) {
  if (status === "funded") return "bg-emerald-100 text-emerald-800"
  if (status === "approved") return "bg-blue-100 text-blue-800"
  if (status === "declined") return "bg-red-100 text-red-800"
  if (status === "draft") return "bg-black/5 text-black/55"
  return "bg-amber-100 text-amber-900"
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value))
}

function customerNameForUuid(
  customers: Array<SeedWorldCustomer>,
  personUuid: string
) {
  const person = customers.find(
    (candidate) => candidate.personUuid === personUuid
  )
  return person
    ? `${person.firstName} ${person.lastName}`.trim()
    : `${personUuid.slice(0, 8)}…`
}

function EmptyFinancing({
  message,
  action,
}: {
  message: string
  action: React.ReactNode
}) {
  return (
    <div className="mt-4 rounded-xl border border-dashed border-black/12 bg-[#fafaf6] p-5 text-center">
      <p className="text-sm text-black/55">{message}</p>
      <div className="mt-4 flex justify-center">{action}</div>
      <p className="mt-3 text-[11px] text-black/35">
        The order will be held while financing is reviewed.
      </p>
    </div>
  )
}

function OrderResult({
  result,
  invoiceRef,
}: {
  result: {
    kind: "paid" | "pending" | "processing" | "card"
    reference: string
  }
  invoiceRef: string
}) {
  const pending = result.kind === "pending"
  const processing = result.kind === "processing"
  return (
    <section className="py-10 text-center">
      <div
        className={`mx-auto grid size-14 place-items-center rounded-full ${pending || processing ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}
      >
        {pending || processing ? (
          <RefreshCw className="size-6" />
        ) : (
          <Check className="size-6" />
        )}
      </div>
      <h3 className="mt-4 text-xl font-semibold">
        {pending
          ? "Order held for financing"
          : processing
            ? "Draw is processing"
            : "Order paid"}
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-black/50">
        {pending
          ? "The CFI application was submitted. Seed World can release this order after a funded line becomes available."
          : processing
            ? "CFI recorded the draw, but the provider outcome is still unknown. Keep the order in processing and use Orders to refresh its durable status."
            : result.kind === "paid"
              ? "CFI accepted the draw and the Seed World order can move to fulfillment."
              : "The retailer marked the external card payment complete."}
      </p>
      <div className="mx-auto mt-5 max-w-sm rounded-xl border border-black/8 bg-white p-4 text-left text-xs">
        <div className="flex justify-between">
          <span className="text-black/40">Order</span>
          <span className="font-medium">{invoiceRef}</span>
        </div>
        <div className="mt-2 flex justify-between">
          <span className="text-black/40">
            {pending
              ? "Application"
              : processing
                ? "CFI draw"
                : result.kind === "paid"
                  ? "CFI transaction"
                  : "Payment"}
          </span>
          <span className="max-w-[220px] truncate font-mono">
            {result.reference}
          </span>
        </div>
      </div>
    </section>
  )
}

function PaymentMethodCard({
  icon,
  title,
  description,
  active,
  onClick,
}: {
  icon: React.ReactNode
  title: string
  description: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-3 rounded-xl border p-4 text-left transition ${active ? "border-[#39754d]/35 bg-[#edf4eb]" : "border-black/8 bg-white hover:border-black/15"}`}
    >
      <span
        className={`grid size-10 place-items-center rounded-xl [&_svg]:size-5 ${active ? "bg-[#174b2c] text-white" : "bg-black/5 text-black/45"}`}
      >
        {icon}
      </span>
      <span>
        <span className="block text-sm font-medium">{title}</span>
        <span className="block text-xs text-black/40">{description}</span>
      </span>
    </button>
  )
}

function QuantityControl({
  quantity,
  onDecrease,
  onIncrease,
}: {
  quantity: number
  onDecrease: () => void
  onIncrease: () => void
}) {
  return (
    <div className="flex items-center rounded-lg border border-black/10 bg-white">
      <button
        type="button"
        aria-label="Decrease quantity"
        onClick={onDecrease}
        className="grid size-8 place-items-center text-black/45 hover:bg-black/5"
      >
        <Minus className="size-3.5" />
      </button>
      <span className="min-w-8 text-center text-xs font-semibold">
        {quantity}
      </span>
      <button
        type="button"
        aria-label="Increase quantity"
        onClick={onIncrease}
        className="grid size-8 place-items-center text-black/45 hover:bg-black/5"
      >
        <Plus className="size-3.5" />
      </button>
    </div>
  )
}

function SimpleField({
  label,
  onChange,
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> & {
  label: string
  onChange: (value: string) => void
}) {
  return (
    <label className="grid gap-1.5 text-xs font-medium text-black/60">
      {label}
      <input
        {...props}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 rounded-lg border border-black/10 px-3 text-sm outline-none focus:border-[#39754d]"
      />
    </label>
  )
}

export function encodeSeedWorldCart(cart: Record<string, number>) {
  return Object.entries(cart)
    .filter(([, quantity]) => Number.isInteger(quantity) && quantity > 0)
    .map(([id, quantity]) => `${id}:${quantity}`)
    .join(",")
}

export function parseSeedWorldCart(value: string) {
  const knownIds = new Set(seedWorldProducts.map((product) => product.id))
  const cart: Record<string, number> = {}
  for (const entry of value.split(",")) {
    const [id, rawQuantity] = entry.split(":")
    const quantity = Number(rawQuantity)
    if (knownIds.has(id) && Number.isInteger(quantity) && quantity > 0) {
      cart[id] = Math.min(quantity, 999)
    }
  }
  return cart
}

export const defaultSeedWorldCart = {
  "corn-7210": 8,
  "soy-38x": 12,
}

function formatCents(value: number) {
  const dollars = Math.floor(value / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",")
  return `$${dollars}.${String(value % 100).padStart(2, "0")}`
}

function formatMoneyString(value: string) {
  const cents = BigInt(value)
  const dollars = (cents / 100n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",")
  return `$${dollars}.${(cents % 100n).toString().padStart(2, "0")}`
}

function initials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}
