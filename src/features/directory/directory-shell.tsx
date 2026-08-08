import { Link } from "@tanstack/react-router"
import { ChevronLeft, Leaf, Sprout } from "lucide-react"

export function DirectoryShell({
  section,
  title,
  description,
  children,
}: {
  section: "people" | "lines" | "orders"
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <main className="min-h-svh bg-[#f5f4ec] text-[#172019]">
      <header className="border-b border-[#193b27]/10 bg-[#fffdf7]">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-5 py-3.5 sm:px-8">
          <Link to="/" className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-[#174b2c] text-white">
              <Sprout className="size-5" />
            </div>
            <div>
              <p className="text-lg leading-none font-semibold">Seed World</p>
              <p className="mt-1 text-[11px] font-medium tracking-wide text-[#174b2c]/55 uppercase">
                CFI integration
              </p>
            </div>
          </Link>
          <nav className="flex items-center gap-1 rounded-xl border border-black/8 bg-white p-1 text-sm">
            <Link
              to="/orders"
              className={`rounded-lg px-3 py-1.5 ${section === "orders" ? "bg-[#174b2c] text-white" : "text-black/50 hover:bg-black/5"}`}
            >
              Orders
            </Link>
            <Link
              to="/people"
              className={`rounded-lg px-3 py-1.5 ${section === "people" ? "bg-[#174b2c] text-white" : "text-black/50 hover:bg-black/5"}`}
            >
              People
            </Link>
            <Link
              to="/lines"
              className={`rounded-lg px-3 py-1.5 ${section === "lines" ? "bg-[#174b2c] text-white" : "text-black/50 hover:bg-black/5"}`}
            >
              Lines
            </Link>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-[1400px] px-5 py-8 sm:px-8">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-xs font-medium text-black/45 hover:text-black"
        >
          <ChevronLeft className="size-3.5" /> Back to order desk
        </Link>
        <p className="mt-7 flex items-center gap-2 text-sm font-semibold text-[#39754d]">
          <Leaf className="size-4" /> CFI synchronized data
        </p>
        <h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em]">
          {title}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-black/50">
          {description}
        </p>
        <div className="mt-7">{children}</div>
      </div>
    </main>
  )
}
