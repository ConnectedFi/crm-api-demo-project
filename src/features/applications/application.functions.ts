import { and, asc, desc, eq } from "drizzle-orm"
import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"
import { getDatabase } from "@/db/connection.server"
import {
  applicants,
  applicationNotes,
  applicationTasks,
  financingApplications,
} from "@/db/schema"

const applicationInput = z.object({ financingUuid: z.uuid() })
const stageSchema = z.enum([
  "new",
  "contacted",
  "packaging",
  "submitted",
  "closed",
])

export const getApplicationDetail = createServerFn({ method: "GET" })
  .validator(applicationInput)
  .handler(async ({ data }) => {
    const database = getDatabase()
    const [applicationRows, noteRows, taskRows] = await Promise.all([
      database
        .select({ application: financingApplications, applicant: applicants })
        .from(financingApplications)
        .innerJoin(
          applicants,
          eq(financingApplications.applicantUuid, applicants.personUuid)
        )
        .where(eq(financingApplications.financingUuid, data.financingUuid))
        .limit(1),
      database
        .select()
        .from(applicationNotes)
        .where(eq(applicationNotes.financingUuid, data.financingUuid))
        .orderBy(desc(applicationNotes.createdAt)),
      database
        .select()
        .from(applicationTasks)
        .where(eq(applicationTasks.financingUuid, data.financingUuid))
        .orderBy(
          asc(applicationTasks.completedAt),
          asc(applicationTasks.dueDate)
        ),
    ])
    const detail = applicationRows.at(0)

    if (!detail) throw new Error("Application not found")

    return {
      application: {
        ...detail.application,
        cfiSyncedAt: detail.application.cfiSyncedAt.toISOString(),
        createdAt: detail.application.createdAt.toISOString(),
        updatedAt: detail.application.updatedAt.toISOString(),
      },
      applicant: {
        ...detail.applicant,
        cfiSyncedAt: detail.applicant.cfiSyncedAt.toISOString(),
        createdAt: detail.applicant.createdAt.toISOString(),
        updatedAt: detail.applicant.updatedAt.toISOString(),
      },
      notes: noteRows.map((note) => ({
        ...note,
        createdAt: note.createdAt.toISOString(),
      })),
      tasks: taskRows.map((task) => ({
        ...task,
        completedAt: task.completedAt?.toISOString() ?? null,
        createdAt: task.createdAt.toISOString(),
      })),
    }
  })

export const updateApplicationStage = createServerFn({ method: "POST" })
  .validator(applicationInput.extend({ stage: stageSchema }))
  .handler(async ({ data }) => {
    const updatedRows = await getDatabase()
      .update(financingApplications)
      .set({ crmStage: data.stage, updatedAt: new Date() })
      .where(eq(financingApplications.financingUuid, data.financingUuid))
      .returning({ crmStage: financingApplications.crmStage })
    const updated = updatedRows.at(0)

    if (!updated) throw new Error("Application not found")
    return updated
  })

export const updateApplicationBoard = createServerFn({ method: "POST" })
  .validator(
    z.object({
      applications: z
        .array(
          z.object({
            financingUuid: z.uuid(),
            stage: stageSchema,
            position: z.number().int().nonnegative(),
          })
        )
        .min(1)
        .max(500),
    })
  )
  .handler(async ({ data }) => {
    const database = getDatabase()
    const updatedAt = new Date()

    await database.transaction(async (transaction) => {
      for (const application of data.applications) {
        await transaction
          .update(financingApplications)
          .set({
            crmStage: application.stage,
            crmPosition: application.position,
            updatedAt,
          })
          .where(
            eq(financingApplications.financingUuid, application.financingUuid)
          )
      }
    })

    return { updated: data.applications.length }
  })

export const addApplicationNote = createServerFn({ method: "POST" })
  .validator(
    applicationInput.extend({ body: z.string().trim().min(1).max(2_000) })
  )
  .handler(async ({ data }) => {
    const [note] = await getDatabase()
      .insert(applicationNotes)
      .values({ financingUuid: data.financingUuid, body: data.body })
      .returning()

    return { ...note, createdAt: note.createdAt.toISOString() }
  })

export const createApplicationTask = createServerFn({ method: "POST" })
  .validator(
    applicationInput.extend({
      title: z.string().trim().min(1).max(200),
      dueDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .nullable(),
    })
  )
  .handler(async ({ data }) => {
    const [task] = await getDatabase()
      .insert(applicationTasks)
      .values({
        financingUuid: data.financingUuid,
        title: data.title,
        dueDate: data.dueDate,
      })
      .returning()

    return {
      ...task,
      completedAt: null,
      createdAt: task.createdAt.toISOString(),
    }
  })

export const setApplicationTaskCompleted = createServerFn({ method: "POST" })
  .validator(
    applicationInput.extend({ taskId: z.uuid(), completed: z.boolean() })
  )
  .handler(async ({ data }) => {
    const taskRows = await getDatabase()
      .update(applicationTasks)
      .set({ completedAt: data.completed ? new Date() : null })
      .where(
        and(
          eq(applicationTasks.id, data.taskId),
          eq(applicationTasks.financingUuid, data.financingUuid)
        )
      )
      .returning()
    const task = taskRows.at(0)

    if (!task) throw new Error("Task not found")

    return {
      ...task,
      completedAt: task.completedAt?.toISOString() ?? null,
      createdAt: task.createdAt.toISOString(),
    }
  })
