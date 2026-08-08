import { createFileRoute } from "@tanstack/react-router"
import { z } from "zod"
import { getCustomerDirectory } from "@/features/applicants/applicants.functions"
import {
  defaultSeedWorldCart,
  parseSeedWorldCart,
  SeedWorldShop,
} from "@/features/checkout/seed-world-shop"

export const Route = createFileRoute("/")({
  validateSearch: z.object({ cart: z.string().optional().catch(undefined) }),
  loader: () => getCustomerDirectory(),
  component: SeedWorldRoute,
})

function SeedWorldRoute() {
  const customers = Route.useLoaderData()
  const { cart } = Route.useSearch()
  return (
    <SeedWorldShop
      loadedCustomers={customers}
      initialCart={
        cart === undefined ? defaultSeedWorldCart : parseSeedWorldCart(cart)
      }
    />
  )
}
