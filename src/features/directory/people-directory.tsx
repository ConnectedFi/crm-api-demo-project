import { Search, UserRound } from "lucide-react"
import { useMemo, useState } from "react"
import { DirectoryShell } from "./directory-shell"
import type { getPeoplePageData } from "./directory.functions"

type PeopleData = Awaited<ReturnType<typeof getPeoplePageData>>

export function PeopleDirectory({ people }: { people: PeopleData }) {
  const [query, setQuery] = useState("")
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return people
    return people.filter((person) =>
      [
        person.firstName,
        person.lastName,
        person.email,
        person.phone,
        person.city,
        person.state,
        ...person.organizations.map(({ name }) => name),
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalized)
    )
  }, [people, query])

  return (
    <DirectoryShell
      section="people"
      title="CFI people"
      description="Every accessible main applicant and co-applicant, linked to the organizations and financing lines where they participate."
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="People" value={people.length} />
        <Stat
          label="With funded lines"
          value={
            people.filter(({ fundedLineCount }) => fundedLineCount > 0).length
          }
        />
        <Stat
          label="Co-applicants"
          value={
            people.filter(({ roles }) => roles.includes("co_applicant")).length
          }
        />
      </div>

      <label className="relative mt-5 block max-w-xl">
        <Search className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-black/30" />
        <span className="sr-only">Search CFI people</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search name, email, organization, or location"
          className="h-11 w-full rounded-xl border border-black/10 bg-white pr-4 pl-10 text-sm outline-none focus:border-[#39754d]"
        />
      </label>

      <div className="mt-5 overflow-hidden rounded-2xl border border-black/8 bg-white">
        <div className="divide-y divide-black/6">
          {filtered.map((person) => (
            <article
              key={person.personUuid}
              className="grid gap-4 p-4 sm:grid-cols-[minmax(240px,1.2fr)_minmax(180px,1fr)_160px_140px] sm:items-center"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#174b2c] text-xs font-semibold text-white">
                  {initials(person.firstName, person.lastName)}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {person.firstName} {person.lastName}
                  </p>
                  <p className="truncate text-xs text-black/45">
                    {person.email}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-sm">
                  {person.organizations.map(({ name }) => name).join(", ") ||
                    "Personal"}
                </p>
                <p className="mt-0.5 text-xs text-black/40">
                  {person.city}, {person.state}
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {person.roles.map((role) => (
                  <span
                    key={role}
                    className="rounded-full bg-[#edf4eb] px-2 py-1 text-[11px] font-medium text-[#285b3d]"
                  >
                    {role === "main_applicant" ? "Main" : "Co-applicant"}
                  </span>
                ))}
              </div>
              <div className="text-sm sm:text-right">
                <p className="font-semibold">{person.lineCount} lines</p>
                <p className="text-xs text-black/40">
                  {formatMinor(person.availableMinor)} available
                </p>
              </div>
            </article>
          ))}
        </div>
        {!filtered.length ? (
          <div className="grid place-items-center gap-2 py-16 text-center text-black/40">
            <UserRound className="size-6" />
            <p className="text-sm">No people match this search.</p>
          </div>
        ) : null}
      </div>
    </DirectoryShell>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-black/8 bg-white p-4">
      <p className="text-2xl font-semibold tracking-[-0.04em]">{value}</p>
      <p className="mt-1 text-xs text-black/45">{label}</p>
    </div>
  )
}

function initials(firstName: string, lastName: string) {
  return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase()
}

function formatMinor(value: string | null) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(value ?? "0") / 100)
}
