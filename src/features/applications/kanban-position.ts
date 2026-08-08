export type KanbanApplication = {
  financingUuid: string
  crmStage: string
  crmPosition: number
}

export function computeDrop<T extends KanbanApplication>(
  applications: Array<T>,
  activeId: string,
  overId: string,
  stages: ReadonlySet<string>
) {
  const active = applications.find(
    (application) => application.financingUuid === activeId
  )
  if (!active) return null

  const overApplication = applications.find(
    (application) => application.financingUuid === overId
  )
  const targetStage = stages.has(overId) ? overId : overApplication?.crmStage
  if (!targetStage || activeId === overId) return null

  const ordered = (stage: string) =>
    applications
      .filter((application) => application.crmStage === stage)
      .sort((left, right) => left.crmPosition - right.crmPosition)

  const sourceStage = active.crmStage
  const source = ordered(sourceStage).filter(
    (application) => application.financingUuid !== activeId
  )
  const target =
    sourceStage === targetStage
      ? source
      : ordered(targetStage).filter(
          (application) => application.financingUuid !== activeId
        )
  const targetIndex = overApplication
    ? Math.max(
        0,
        target.findIndex(
          (application) =>
            application.financingUuid === overApplication.financingUuid
        )
      )
    : target.length

  target.splice(targetIndex, 0, { ...active, crmStage: targetStage })

  const updates = new Map<string, T>()
  for (const [position, application] of source.entries()) {
    updates.set(application.financingUuid, {
      ...application,
      crmPosition: position,
    })
  }
  for (const [position, application] of target.entries()) {
    updates.set(application.financingUuid, {
      ...application,
      crmStage: targetStage,
      crmPosition: position,
    })
  }

  const result = applications.map(
    (application) => updates.get(application.financingUuid) ?? application
  )
  const changed = result.some((application, index) => {
    const previous = applications[index]
    return (
      application.crmStage !== previous.crmStage ||
      application.crmPosition !== previous.crmPosition
    )
  })

  return changed ? result : null
}
