import { createFileRoute } from "@tanstack/react-router"
import { getPeoplePageData } from "@/features/directory/directory.functions"
import { PeopleDirectory } from "@/features/directory/people-directory"

export const Route = createFileRoute("/people")({
  loader: () => getPeoplePageData(),
  component: PeopleRoute,
})

function PeopleRoute() {
  return <PeopleDirectory people={Route.useLoaderData()} />
}
