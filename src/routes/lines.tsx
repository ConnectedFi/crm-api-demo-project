import { createFileRoute } from "@tanstack/react-router"
import { getLinesPageData } from "@/features/directory/directory.functions"
import { LinesDirectory } from "@/features/directory/lines-directory"

export const Route = createFileRoute("/lines")({
  loader: () => getLinesPageData(),
  component: LinesRoute,
})

function LinesRoute() {
  return <LinesDirectory lines={Route.useLoaderData()} />
}
