import { createFileRoute } from "@tanstack/react-router"
import { z } from "zod"
import { getCustomerDirectory } from "@/features/applicants/applicants.functions"
import {
  parseSeedWorldCart,
  SeedWorldCheckoutPage,
} from "@/features/checkout/seed-world-shop"

export const Route = createFileRoute("/checkout")({
  validateSearch: z.object({ cart: z.string().catch("") }),
  loader: () => getCustomerDirectory(),
  component: CheckoutRoute,
})

function CheckoutRoute() {
  const customers = Route.useLoaderData()
  const { cart } = Route.useSearch()
  return (
    <SeedWorldCheckoutPage
      customers={customers}
      cart={parseSeedWorldCart(cart)}
    />
  )
}
