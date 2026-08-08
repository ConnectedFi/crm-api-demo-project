import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core"
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Link } from "@tanstack/react-router"
import {
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  GripVertical,
} from "lucide-react"
import { useRef, useState } from "react"
import { computeDrop } from "./kanban-position"

export const stages = [
  { value: "new", label: "New", accent: "bg-slate-400" },
  { value: "contacted", label: "Contacted", accent: "bg-blue-400" },
  { value: "packaging", label: "Packaging", accent: "bg-amber-400" },
  { value: "submitted", label: "Submitted", accent: "bg-violet-400" },
  { value: "closed", label: "Closed", accent: "bg-emerald-500" },
] as const

export type Stage = (typeof stages)[number]["value"]

export type PipelineApplication = {
  financingUuid: string
  status: string
  requestedCents: string | null
  crmStage: string
  crmPosition: number
  openTaskCount: number
  overdueTaskCount: number
  applicant: {
    firstName: string
    lastName: string
    farmName: string | null
    email: string
    city: string
    state: string
  }
}

export function ApplicationKanban({
  applications,
  visibleApplicationIds,
  onChange,
}: {
  applications: Array<PipelineApplication>
  visibleApplicationIds?: ReadonlySet<string>
  onChange: (applications: Array<PipelineApplication>) => void
}) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [highlightedId, setHighlightedId] = useState<string | null>(null)
  const [collapsedStages, setCollapsedStages] = useState<Set<Stage>>(
    () => new Set()
  )
  const highlightTimer = useRef<ReturnType<typeof setTimeout>>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )
  const activeApplication = applications.find(
    (application) => application.financingUuid === activeId
  )
  const stageSet = new Set<string>(stages.map(({ value }) => value))

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id))
  }

  function handleDragEnd(event: DragEndEvent) {
    const draggedId = String(event.active.id)
    setActiveId(null)
    if (!event.over) return

    const next = computeDrop(
      applications,
      draggedId,
      String(event.over.id),
      stageSet
    )
    if (!next) return

    onChange(next)
    if (highlightTimer.current) clearTimeout(highlightTimer.current)
    setHighlightedId(draggedId)
    highlightTimer.current = setTimeout(() => setHighlightedId(null), 1500)
  }

  return (
    <DndContext
      id="application-kanban"
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragCancel={() => setActiveId(null)}
      onDragEnd={handleDragEnd}
    >
      <div className="flex min-h-0 flex-1 gap-4 overflow-x-auto pb-2">
        {stages.map((stage) => {
          const stageApplications = applications
            .filter((application) => application.crmStage === stage.value)
            .sort((left, right) => left.crmPosition - right.crmPosition)
          const visibleApplications = visibleApplicationIds
            ? stageApplications.filter((application) =>
                visibleApplicationIds.has(application.financingUuid)
              )
            : stageApplications

          return (
            <KanbanColumn
              key={stage.value}
              stage={stage}
              applications={visibleApplications}
              totalCount={stageApplications.length}
              collapsed={collapsedStages.has(stage.value)}
              onToggleCollapsed={() =>
                setCollapsedStages((current) => {
                  const next = new Set(current)
                  if (next.has(stage.value)) next.delete(stage.value)
                  else next.add(stage.value)
                  return next
                })
              }
              activeStage={activeApplication?.crmStage ?? null}
              highlightedId={highlightedId}
            />
          )
        })}
      </div>

      <DragOverlay dropAnimation={{ duration: 180, easing: "ease" }}>
        {activeApplication ? (
          <div className="w-[18rem] rotate-2 cursor-grabbing">
            <ApplicationCardContent application={activeApplication} overlay />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

function KanbanColumn({
  stage,
  applications,
  totalCount,
  collapsed,
  onToggleCollapsed,
  activeStage,
  highlightedId,
}: {
  stage: (typeof stages)[number]
  applications: Array<PipelineApplication>
  totalCount: number
  collapsed: boolean
  onToggleCollapsed: () => void
  activeStage: string | null
  highlightedId: string | null
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.value })
  const showDropIndicator = activeStage !== null && activeStage !== stage.value

  if (collapsed) {
    return (
      <section
        ref={setNodeRef}
        className={`flex h-full w-12 shrink-0 flex-col items-center rounded-2xl border py-3 transition-colors ${
          isOver
            ? "border-[#36734e]/40 bg-[#36734e]/10 ring-2 ring-[#36734e]/15"
            : "border-black/8 bg-black/[0.025]"
        }`}
      >
        <button
          type="button"
          aria-label={`Expand ${stage.label}`}
          onClick={onToggleCollapsed}
          className="grid size-7 place-items-center rounded-md text-black/40 hover:bg-white hover:text-black/70"
        >
          <ChevronRight className="size-4" />
        </button>
        <span className="mt-3 rounded-full bg-white px-1.5 py-0.5 text-[10px] text-black/45 tabular-nums">
          {totalCount}
        </span>
        <h3 className="mt-3 rotate-180 text-xs font-medium [writing-mode:vertical-rl]">
          {stage.label}
        </h3>
      </section>
    )
  }

  return (
    <section
      ref={setNodeRef}
      className={`flex h-full min-h-0 w-[17rem] shrink-0 flex-col rounded-2xl border p-3 transition-colors ${
        isOver
          ? "border-[#36734e]/30 bg-[#36734e]/8"
          : "border-black/8 bg-black/[0.025]"
      }`}
    >
      <div className="flex items-center gap-2 px-1 py-2">
        <span className={`size-2 rounded-full ${stage.accent}`} />
        <h3 className="text-sm font-medium">{stage.label}</h3>
        <span className="ml-auto rounded-full bg-white px-2 py-0.5 text-xs text-black/45">
          {applications.length === totalCount
            ? totalCount
            : `${applications.length}/${totalCount}`}
        </span>
        <button
          type="button"
          aria-label={`Collapse ${stage.label}`}
          onClick={onToggleCollapsed}
          className="grid size-6 place-items-center rounded-md text-black/30 hover:bg-white hover:text-black/65"
        >
          <ChevronLeft className="size-3.5" />
        </button>
      </div>

      <div
        data-stage-drop-zone={stage.value}
        className="mt-2 min-h-0 flex-1 overflow-y-auto pr-1"
      >
        <SortableContext
          items={applications.map(({ financingUuid }) => financingUuid)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-3">
            {applications.map((application) => (
              <SortableApplicationCard
                key={application.financingUuid}
                application={application}
                highlighted={highlightedId === application.financingUuid}
                showDropIndicator={showDropIndicator}
              />
            ))}
            {showDropIndicator && isOver ? <DropIndicator /> : null}
            {applications.length === 0 && !isOver ? (
              <div className="grid min-h-28 place-items-center rounded-xl border border-dashed border-black/10 px-4 text-center text-xs text-black/35">
                Drop applications here
              </div>
            ) : null}
          </div>
        </SortableContext>
      </div>
    </section>
  )
}

function SortableApplicationCard({
  application,
  highlighted,
  showDropIndicator,
}: {
  application: PipelineApplication
  highlighted: boolean
  showDropIndicator: boolean
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({ id: application.financingUuid })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      data-application-card={application.financingUuid}
      className={`relative touch-none select-none ${isDragging ? "opacity-0" : ""}`}
    >
      {showDropIndicator && isOver ? <DropIndicator floating /> : null}
      <ApplicationCardContent
        application={application}
        highlighted={highlighted}
      />
    </div>
  )
}

function DropIndicator({ floating = false }: { floating?: boolean }) {
  return (
    <div
      className={`pointer-events-none h-0.5 rounded-full bg-[#36734e] shadow-[0_0_0_2px_rgba(54,115,78,0.12)] ${
        floating ? "absolute inset-x-0 -top-[7px]" : ""
      }`}
    />
  )
}

function ApplicationCardContent({
  application,
  overlay = false,
  highlighted = false,
}: {
  application: PipelineApplication
  overlay?: boolean
  highlighted?: boolean
}) {
  return (
    <article
      className={`rounded-xl border border-black/8 bg-white p-3 shadow-[0_6px_18px_rgba(17,38,24,0.05)] transition ${
        overlay
          ? "shadow-[0_24px_55px_rgba(17,38,24,0.22)] ring-1 ring-[#36734e]/20"
          : "cursor-grab hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(17,38,24,0.09)] active:cursor-grabbing"
      } ${highlighted ? "animate-pulse ring-2 ring-[#36734e]/25" : ""}`}
    >
      <Link
        to="/applications/$financingUuid"
        params={{ financingUuid: application.financingUuid }}
        className={overlay ? "pointer-events-none block" : "block"}
      >
        <div className="flex items-start gap-2.5">
          <div className="grid size-7 shrink-0 place-items-center rounded-full bg-[#173f2a] text-[10px] font-medium text-white">
            {application.applicant.firstName[0]}
            {application.applicant.lastName[0]}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {application.applicant.firstName} {application.applicant.lastName}
            </p>
            <p className="mt-0.5 truncate text-[11px] text-black/45">
              {application.applicant.farmName ?? "Personal"}
              <span className="mx-1 text-black/20">•</span>
              {application.applicant.city}, {application.applicant.state}
            </p>
          </div>
          <GripVertical className="mt-0.5 size-4 shrink-0 text-black/20" />
        </div>

        <div className="mt-2.5 flex items-center gap-2 border-t border-black/6 pt-2.5 text-[11px]">
          <span className="rounded-full bg-[#edf3ed] px-2 py-0.5 font-medium text-[#285b3d] capitalize">
            {application.status}
          </span>
          <span className="ml-auto font-semibold text-black/65 tabular-nums">
            {formatCents(application.requestedCents)}
          </span>
          {application.openTaskCount > 0 ? (
            <span
              title={`${application.openTaskCount} open task${application.openTaskCount === 1 ? "" : "s"}`}
              className={`inline-flex items-center gap-1 tabular-nums ${
                application.overdueTaskCount > 0
                  ? "text-red-700"
                  : "text-black/40"
              }`}
            >
              <ClipboardCheck className="size-3" />
              {application.openTaskCount}
            </span>
          ) : null}
        </div>
      </Link>
    </article>
  )
}

function formatCents(value: string | null) {
  if (value === null) return "—"

  const dollars = Number(value) / 100
  if (!Number.isFinite(dollars)) return "—"

  const absolute = Math.abs(dollars)
  const sign = dollars < 0 ? "-" : ""

  if (absolute >= 1_000_000) {
    return `${sign}$${formatCompactNumber(absolute / 1_000_000)}M`
  }

  if (absolute >= 1_000) {
    return `${sign}$${formatCompactNumber(absolute / 1_000)}K`
  }

  const wholeDollars = Math.round(absolute)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",")
  return `${sign}$${wholeDollars}`
}

function formatCompactNumber(value: number) {
  return value.toFixed(1).replace(/\.0$/, "")
}
