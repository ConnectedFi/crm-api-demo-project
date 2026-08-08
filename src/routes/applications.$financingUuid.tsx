import { useState } from "react"
import type { FormEvent } from "react"
import { createFileRoute, Link } from "@tanstack/react-router"
import { useServerFn } from "@tanstack/react-start"
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  ClipboardCheck,
  Mail,
  MapPin,
  MessageSquareText,
  Phone,
  Radio,
  Send,
  WalletCards,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  addApplicationNote,
  createApplicationTask,
  getApplicationDetail,
  setApplicationTaskCompleted,
  updateApplicationStage,
} from "@/features/applications/application.functions"

export const Route = createFileRoute("/applications/$financingUuid")({
  loader: ({ params }) =>
    getApplicationDetail({
      data: { financingUuid: params.financingUuid },
    }),
  component: ApplicationDetail,
})

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
})

function formatCents(value: string | null) {
  if (value === null) return "—"
  return currency.format(Number(value) / 100)
}

function ApplicationDetail() {
  const {
    applicant,
    application,
    notes: initialNotes,
    tasks: initialTasks,
  } = Route.useLoaderData()
  const saveStage = useServerFn(updateApplicationStage)
  const saveNote = useServerFn(addApplicationNote)
  const saveTask = useServerFn(createApplicationTask)
  const saveTaskCompleted = useServerFn(setApplicationTaskCompleted)
  const [stage, setStage] = useState(application.crmStage)
  const [notes, setNotes] = useState(initialNotes)
  const [tasks, setTasks] = useState(initialTasks)
  const [noteBody, setNoteBody] = useState("")
  const [taskTitle, setTaskTitle] = useState("")
  const [taskDueDate, setTaskDueDate] = useState("")
  const [isSavingNote, setIsSavingNote] = useState(false)
  const [isSavingTask, setIsSavingTask] = useState(false)

  async function handleStageChange(nextStage: string) {
    const previousStage = stage
    setStage(nextStage)
    try {
      await saveStage({
        data: {
          financingUuid: application.financingUuid,
          stage: nextStage as
            "new" | "contacted" | "packaging" | "submitted" | "closed",
        },
      })
    } catch {
      setStage(previousStage)
    }
  }

  async function handleAddNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!noteBody.trim()) return
    setIsSavingNote(true)
    try {
      const note = await saveNote({
        data: {
          financingUuid: application.financingUuid,
          body: noteBody,
        },
      })
      setNotes((current) => [note, ...current])
      setNoteBody("")
    } finally {
      setIsSavingNote(false)
    }
  }

  async function handleAddTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!taskTitle.trim()) return
    setIsSavingTask(true)
    try {
      const task = await saveTask({
        data: {
          financingUuid: application.financingUuid,
          title: taskTitle,
          dueDate: taskDueDate || null,
        },
      })
      setTasks((current) => [...current, task])
      setTaskTitle("")
      setTaskDueDate("")
    } finally {
      setIsSavingTask(false)
    }
  }

  async function handleTaskCompleted(taskId: string, completed: boolean) {
    const task = await saveTaskCompleted({
      data: {
        financingUuid: application.financingUuid,
        taskId,
        completed,
      },
    })
    setTasks((current) =>
      current.map((existing) => (existing.id === task.id ? task : existing))
    )
  }

  return (
    <main className="min-h-svh bg-[#f5f6f2] text-[#18211b]">
      <header className="border-b border-black/8 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-lg bg-[#173f2a] text-white">
              <Building2 className="size-5" />
            </div>
            <div>
              <p className="leading-none font-semibold">Deal Desk</p>
              <p className="mt-1 text-xs text-black/50">ConnectedFi CRM demo</p>
            </div>
          </Link>
          <div className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-medium text-black/60">
            Sandbox
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-10">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-black/50 hover:text-black"
        >
          <ArrowLeft className="size-4" /> Pipeline
        </Link>

        <section className="mt-7 grid gap-6 lg:grid-cols-[1fr_2fr]">
          <aside className="h-fit rounded-2xl border border-black/8 bg-white p-6 shadow-[0_16px_50px_rgba(17,38,24,0.06)]">
            <div className="flex items-center gap-4">
              <div className="grid size-14 place-items-center rounded-full bg-[#173f2a] text-lg font-medium text-white">
                {applicant.firstName[0]}
                {applicant.lastName[0]}
              </div>
              <div>
                <p className="text-xs font-medium tracking-[0.14em] text-[#36734e] uppercase">
                  Applicant
                </p>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight">
                  {applicant.firstName} {applicant.lastName}
                </h1>
              </div>
            </div>

            <div className="mt-7 space-y-4 border-t border-black/8 pt-6 text-sm text-black/60">
              <p className="flex items-center gap-3">
                <Building2 className="size-4 text-[#36734e]" />
                {applicant.farmName ?? "Personal application"}
              </p>
              <p className="flex items-center gap-3">
                <Mail className="size-4 text-[#36734e]" /> {applicant.email}
              </p>
              <p className="flex items-center gap-3">
                <Phone className="size-4 text-[#36734e]" /> {applicant.phone}
              </p>
              <p className="flex items-start gap-3">
                <MapPin className="mt-0.5 size-4 shrink-0 text-[#36734e]" />
                <span>
                  {applicant.street}
                  <br />
                  {applicant.city}, {applicant.state} {applicant.zip}
                </span>
              </p>
            </div>
          </aside>

          <section>
            <p className="text-sm font-medium text-[#36734e]">
              Financing application
            </p>
            <div className="mt-2 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <h2 className="text-3xl font-semibold tracking-[-0.035em] capitalize">
                  {application.status}
                </h2>
                <p className="mt-2 font-mono text-xs text-black/40">
                  {application.financingUuid}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800">
                  <Radio className="mr-1 inline size-3.5" />
                  {application.webhookActive
                    ? "Webhook active"
                    : "Polling only"}
                </span>
                <select
                  aria-label="CRM stage"
                  value={stage}
                  onChange={(event) => handleStageChange(event.target.value)}
                  className="rounded-md border border-black/10 bg-white px-3 py-1.5 text-xs font-medium text-[#285b3d] capitalize"
                >
                  <option value="new">New</option>
                  <option value="contacted">Contacted</option>
                  <option value="packaging">Packaging</option>
                  <option value="submitted">Submitted</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
            </div>

            <div className="mt-6 grid overflow-hidden rounded-2xl border border-black/8 bg-black/6 shadow-[0_16px_50px_rgba(17,38,24,0.06)] sm:grid-cols-3">
              <Metric
                icon={CircleDollarSign}
                label="Requested"
                value={formatCents(application.requestedCents)}
              />
              <Metric
                icon={CheckCircle2}
                label="Approved"
                value={formatCents(application.approvedCents)}
              />
              <Metric
                icon={WalletCards}
                label="Available"
                value={formatCents(application.availableCents)}
              />
              <Metric
                icon={CircleDollarSign}
                label="Drawn"
                value={formatCents(application.drawnCents)}
              />
              <Metric
                icon={CalendarDays}
                label="Crop year"
                value={application.cropYear?.toString() ?? "—"}
              />
              <Metric
                icon={Radio}
                label="CFI status"
                value={application.rawStatus.replaceAll("_", " ")}
              />
            </div>
          </section>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-black/8 bg-white p-6 shadow-[0_16px_50px_rgba(17,38,24,0.06)]">
            <div className="flex items-center gap-2">
              <MessageSquareText className="size-4 text-[#36734e]" />
              <h2 className="font-medium">Application notes</h2>
              <span className="ml-auto text-xs text-black/40">
                {notes.length}
              </span>
            </div>
            <form onSubmit={handleAddNote} className="mt-5">
              <textarea
                value={noteBody}
                onChange={(event) => setNoteBody(event.target.value)}
                placeholder="Add context for this application…"
                rows={3}
                maxLength={2000}
                className="w-full resize-none rounded-xl border border-black/10 bg-[#fafbf8] px-4 py-3 text-sm outline-none focus:border-[#36734e]"
              />
              <div className="mt-2 flex justify-end">
                <Button
                  type="submit"
                  disabled={isSavingNote || !noteBody.trim()}
                >
                  <Send className="size-4" />{" "}
                  {isSavingNote ? "Saving…" : "Add note"}
                </Button>
              </div>
            </form>
            <div className="mt-6 space-y-3">
              {notes.length === 0 ? (
                <Empty>No application notes yet.</Empty>
              ) : (
                notes.map((note) => (
                  <article
                    key={note.id}
                    className="rounded-xl bg-[#f5f7f3] p-4"
                  >
                    <p className="text-sm leading-6 whitespace-pre-wrap">
                      {note.body}
                    </p>
                    <p className="mt-3 text-xs text-black/40">
                      {new Date(note.createdAt).toLocaleString()}
                    </p>
                  </article>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-black/8 bg-white p-6 shadow-[0_16px_50px_rgba(17,38,24,0.06)]">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="size-4 text-[#36734e]" />
              <h2 className="font-medium">Application tasks</h2>
              <span className="ml-auto text-xs text-black/40">
                {tasks.filter((task) => !task.completedAt).length} open
              </span>
            </div>
            <form
              onSubmit={handleAddTask}
              className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto_auto]"
            >
              <input
                value={taskTitle}
                onChange={(event) => setTaskTitle(event.target.value)}
                placeholder="Follow up about documents"
                maxLength={200}
                className="min-w-0 rounded-lg border border-black/10 bg-[#fafbf8] px-3 py-2 text-sm outline-none focus:border-[#36734e]"
              />
              <input
                type="date"
                aria-label="Task due date"
                value={taskDueDate}
                onChange={(event) => setTaskDueDate(event.target.value)}
                className="rounded-lg border border-black/10 bg-[#fafbf8] px-3 py-2 text-sm outline-none focus:border-[#36734e]"
              />
              <Button
                type="submit"
                disabled={isSavingTask || !taskTitle.trim()}
              >
                {isSavingTask ? "Adding…" : "Add"}
              </Button>
            </form>
            <div className="mt-6 space-y-2">
              {tasks.length === 0 ? (
                <Empty>No application tasks yet.</Empty>
              ) : (
                tasks.map((task) => (
                  <label
                    key={task.id}
                    className="flex cursor-pointer items-start gap-3 rounded-xl border border-black/8 px-4 py-3"
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(task.completedAt)}
                      onChange={(event) =>
                        handleTaskCompleted(task.id, event.target.checked)
                      }
                      className="mt-0.5 size-4 accent-[#285b3d]"
                    />
                    <span className="min-w-0">
                      <span
                        className={`block text-sm ${task.completedAt ? "text-black/35 line-through" : ""}`}
                      >
                        {task.title}
                      </span>
                      {task.dueDate ? (
                        <span className="mt-1 block text-xs text-black/40">
                          Due {task.dueDate}
                        </span>
                      ) : null}
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CircleDollarSign
  label: string
  value: string
}) {
  return (
    <div className="bg-white px-6 py-5">
      <p className="flex items-center gap-2 text-xs text-black/45">
        <Icon className="size-3.5 text-[#36734e]" /> {label}
      </p>
      <p className="mt-2 text-xl font-semibold tracking-tight capitalize">
        {value}
      </p>
    </div>
  )
}

function Empty({ children }: { children: string }) {
  return (
    <p className="rounded-xl border border-dashed border-black/10 px-4 py-8 text-center text-sm text-black/40">
      {children}
    </p>
  )
}
