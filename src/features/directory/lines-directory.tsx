import { Search, WalletCards } from "lucide-react"
import { useMemo, useState } from "react"
import { DirectoryShell } from "./directory-shell"
import type { getLinesPageData } from "./directory.functions"

type LinesData = Awaited<ReturnType<typeof getLinesPageData>>

export function LinesDirectory({ lines }: { lines: LinesData }) {
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState("all")
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return lines.filter((line) => {
      if (status !== "all" && line.status !== status) return false
      if (!normalized) return true
      return [
        line.financingUuid,
        line.organization?.name,
        ...line.participants.flatMap((person) => [
          person.firstName,
          person.lastName,
          person.email,
        ]),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalized)
    })
  }, [lines, query, status])

  const totalAvailable = lines.reduce(
    (sum, line) => sum + BigInt(line.availableMinor ?? "0"),
    0n
  )

  return (
    <DirectoryShell
      section="lines"
      title="CFI financing lines"
      description="Complete application-to-loan aggregates with every participant, organization, lifecycle status, and current funded availability."
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Financing lines" value={String(lines.length)} />
        <Stat
          label="Funded lines"
          value={String(
            lines.filter(({ status }) => status === "funded").length
          )}
        />
        <Stat
          label="Available credit"
          value={formatMinor(totalAvailable.toString())}
        />
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <label className="relative block max-w-xl flex-1">
          <Search className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-black/30" />
          <span className="sr-only">Search financing lines</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search person, organization, or financing UUID"
            className="h-11 w-full rounded-xl border border-black/10 bg-white pr-4 pl-10 text-sm outline-none focus:border-[#39754d]"
          />
        </label>
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="h-11 rounded-xl border border-black/10 bg-white px-3 text-sm outline-none"
        >
          <option value="all">All statuses</option>
          {[
            "draft",
            "submitted",
            "underwriting",
            "approved",
            "declined",
            "funded",
          ].map((value) => (
            <option key={value} value={value}>
              {value[0].toUpperCase() + value.slice(1)}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-5 grid gap-3">
        {filtered.map((line) => {
          const main = line.participants.find(
            ({ role }) => role === "main_applicant"
          )
          const coApplicants = line.participants.filter(
            ({ role }) => role === "co_applicant"
          )
          return (
            <article
              key={line.financingUuid}
              className="rounded-2xl border border-black/8 bg-white p-5 shadow-[0_10px_30px_rgba(33,54,39,0.035)]"
            >
              <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusClass(line.status)}`}
                    >
                      {line.status}
                    </span>
                    {line.cropYear ? (
                      <span className="text-xs text-black/40">
                        {line.cropYear} crop year
                      </span>
                    ) : null}
                  </div>
                  <h2 className="mt-3 text-lg font-semibold">
                    {main
                      ? `${main.firstName} ${main.lastName}`
                      : "Unresolved main applicant"}
                  </h2>
                  <p className="mt-1 text-sm text-black/45">
                    {line.organization?.name ?? "Personal application"}
                    {coApplicants.length
                      ? ` · ${coApplicants.length} co-applicant${coApplicants.length === 1 ? "" : "s"}`
                      : ""}
                  </p>
                  <p className="mt-3 font-mono text-[11px] text-black/30">
                    {line.financingUuid}
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-5 lg:text-right">
                  <Money label="Requested" value={line.requestedMinor} />
                  <Money label="Approved" value={line.approvedMinor} />
                  <Money label="Available" value={line.availableMinor} strong />
                </div>
              </div>
              {coApplicants.length ? (
                <div className="mt-4 flex flex-wrap gap-2 border-t border-black/6 pt-4">
                  {coApplicants.map((person) => (
                    <span
                      key={person.personUuid}
                      className="rounded-lg bg-black/[0.035] px-2.5 py-1.5 text-xs text-black/60"
                    >
                      {person.firstName} {person.lastName} · co-applicant
                    </span>
                  ))}
                </div>
              ) : null}
            </article>
          )
        })}
        {!filtered.length ? (
          <div className="grid place-items-center gap-2 rounded-2xl border border-dashed border-black/12 py-16 text-black/40">
            <WalletCards className="size-6" />
            <p className="text-sm">No financing lines match these filters.</p>
          </div>
        ) : null}
      </div>
    </DirectoryShell>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-black/8 bg-white p-4">
      <p className="text-2xl font-semibold tracking-[-0.04em]">{value}</p>
      <p className="mt-1 text-xs text-black/45">{label}</p>
    </div>
  )
}

function Money({
  label,
  value,
  strong = false,
}: {
  label: string
  value: string | null
  strong?: boolean
}) {
  return (
    <div>
      <p
        className={`text-sm ${strong ? "font-semibold text-[#285b3d]" : "font-medium"}`}
      >
        {formatMinor(value)}
      </p>
      <p className="mt-0.5 text-[11px] text-black/35">{label}</p>
    </div>
  )
}

function formatMinor(value: string | null) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(value ?? "0") / 100)
}

function statusClass(status: string) {
  if (status === "funded") return "bg-emerald-100 text-emerald-800"
  if (status === "declined") return "bg-rose-100 text-rose-800"
  if (status === "approved") return "bg-blue-100 text-blue-800"
  return "bg-amber-100 text-amber-800"
}
