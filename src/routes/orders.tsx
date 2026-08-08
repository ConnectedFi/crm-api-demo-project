import { createFileRoute } from "@tanstack/react-router"
import { getOrdersPageData } from "@/features/orders/orders.functions"
import { OrdersPage } from "@/features/orders/orders-page"

export const Route = createFileRoute("/orders")({
  loader: () => getOrdersPageData(),
  component: OrdersRoute,
})

function OrdersRoute() {
  return <OrdersPage orders={Route.useLoaderData()} />
}
