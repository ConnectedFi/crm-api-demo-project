import * as Sentry from "@sentry/tanstackstart-react"
import { asc, eq } from "drizzle-orm"
import { createServerFn } from "@tanstack/react-start"
import {
  fetchAllV2FinancingLines,
  fetchAllV2Organizations,
  fetchAllV2People,
  fetchV2Me,
} from "@/cfi/v2.server"
import { getDatabase } from "@/db/connection.server"
import {
  applicants,
  applicationTasks,
  financingApplications,
  financingParticipants,
  organizations,
} from "@/db/schema"

export const syncApplicants = createServerFn({ method: "POST" }).handler(
  async () => {
    try {
      const [dealer, remotePeople, remoteOrganizations, remoteLines] =
        await Promise.all([
          fetchV2Me(),
          fetchAllV2People(),
          fetchAllV2Organizations(),
          fetchAllV2FinancingLines(),
        ])

      const syncedAt = new Date()
      const database = getDatabase()
      const [
        existingApplicantRows,
        existingOrganizationRows,
        existingLineRows,
      ] = await Promise.all([
        database.select({ id: applicants.personUuid }).from(applicants),
        database
          .select({ id: organizations.organizationUuid })
          .from(organizations),
        database
          .select({ id: financingApplications.financingUuid })
          .from(financingApplications),
      ])
      const existingApplicantIds = new Set(
        existingApplicantRows.map(({ id }) => id)
      )
      const existingOrganizationIds = new Set(
        existingOrganizationRows.map(({ id }) => id)
      )
      const existingLineIds = new Set(existingLineRows.map(({ id }) => id))
      const newApplicants = new Set(
        remotePeople
          .filter(({ personUuid }) => !existingApplicantIds.has(personUuid))
          .map(({ personUuid }) => personUuid)
      ).size
      const newOrganizations = new Set(
        remoteOrganizations
          .filter(
            ({ organizationUuid }) =>
              !existingOrganizationIds.has(organizationUuid)
          )
          .map(({ organizationUuid }) => organizationUuid)
      ).size
      const newApplications = new Set(
        remoteLines
          .filter(({ financingUuid }) => !existingLineIds.has(financingUuid))
          .map(({ financingUuid }) => financingUuid)
      ).size
      const remotePersonIds = new Set(
        remotePeople.map(({ personUuid }) => personUuid)
      )
      const remoteOrganizationIds = new Set(
        remoteOrganizations.map(({ organizationUuid }) => organizationUuid)
      )
      const syncableLines = remoteLines.filter((line) => {
        const personUuids = [
          line.mainApplicant.personUuid,
          ...line.coApplicants.map(({ personUuid }) => personUuid),
        ]
        return (
          personUuids.every((personUuid) => remotePersonIds.has(personUuid)) &&
          (!line.organizationUuid ||
            remoteOrganizationIds.has(line.organizationUuid))
        )
      })

      await database.transaction(async (transaction) => {
        for (const person of remotePeople) {
          const cfiFields = {
            firstName: person.firstName,
            lastName: person.lastName,
            email: person.email,
            phone: person.phone,
            street: person.address.street,
            city: person.address.city,
            state: person.address.state,
            zip: person.address.zip,
            country: person.address.country,
            cfiCreatedAt: new Date(person.createdAt),
            cfiUpdatedAt: new Date(person.updatedAt),
            archivedAt: person.archivedAt ? new Date(person.archivedAt) : null,
            cfiSyncedAt: syncedAt,
            updatedAt: syncedAt,
          }

          await transaction
            .insert(applicants)
            .values({ personUuid: person.personUuid, ...cfiFields })
            .onConflictDoUpdate({
              target: applicants.personUuid,
              set: cfiFields,
            })
        }

        for (const organization of remoteOrganizations) {
          const cfiFields = {
            name: organization.name,
            registrationNumber: organization.ein,
            type: organization.type,
            website: organization.website ?? null,
            street: organization.address?.street ?? null,
            city: organization.address?.city ?? null,
            state: organization.address?.state ?? null,
            zip: organization.address?.zip ?? null,
            country: organization.address?.country ?? null,
            cfiCreatedAt: new Date(organization.createdAt),
            cfiUpdatedAt: new Date(organization.updatedAt),
            archivedAt: organization.archivedAt
              ? new Date(organization.archivedAt)
              : null,
            cfiSyncedAt: syncedAt,
            updatedAt: syncedAt,
          }

          await transaction
            .insert(organizations)
            .values({
              organizationUuid: organization.organizationUuid,
              ...cfiFields,
            })
            .onConflictDoUpdate({
              target: organizations.organizationUuid,
              set: cfiFields,
            })
        }

        for (const line of syncableLines) {
          const cfiFields = {
            applicantUuid: line.mainApplicant.personUuid,
            organizationUuid: line.organizationUuid,
            status: line.status,
            rawStatus: line.rawStatus,
            requestedCents: line.requestedMinor,
            currency: line.currency,
            loanUuid: line.loan?.loanUuid ?? null,
            cropYear: line.loan?.cropYear ?? null,
            approvedCents: line.loan?.approvedMinor ?? null,
            availableCents: line.loan?.availableMinor ?? null,
            availablePendingCents: line.loan?.availablePendingMinor ?? null,
            drawnCents: line.loan?.drawnMinor ?? null,
            reservedCents: line.loan?.reservedMinor ?? null,
            estimatedPayoffCents: line.loan?.estimatedPayoffMinor ?? null,
            webhookActive: false,
            cfiCreatedAt: new Date(line.createdAt),
            cfiUpdatedAt: new Date(line.updatedAt),
            archivedAt: line.archivedAt ? new Date(line.archivedAt) : null,
            cfiSyncedAt: syncedAt,
            updatedAt: syncedAt,
          }

          await transaction
            .insert(financingApplications)
            .values({ financingUuid: line.financingUuid, ...cfiFields })
            .onConflictDoUpdate({
              target: financingApplications.financingUuid,
              set: cfiFields,
            })

          await transaction
            .delete(financingParticipants)
            .where(eq(financingParticipants.financingUuid, line.financingUuid))

          await transaction.insert(financingParticipants).values([
            {
              financingUuid: line.financingUuid,
              personUuid: line.mainApplicant.personUuid,
              role: "main_applicant",
              position: 0,
            },
            ...line.coApplicants.map((participant, index) => ({
              financingUuid: line.financingUuid,
              personUuid: participant.personUuid,
              role: "co_applicant" as const,
              position: index + 1,
            })),
          ])
        }
      })

      return {
        dealer,
        newApplicants,
        newPeople: newApplicants,
        newOrganizations,
        newApplications,
        newLines: newApplications,
        people: remotePeople.length,
        organizations: remoteOrganizations.length,
        lines: syncableLines.length,
        skippedLines: remoteLines.length - syncableLines.length,
        syncedAt: syncedAt.toISOString(),
      }
    } catch (error) {
      Sentry.captureException(error)
      throw error
    }
  }
)

export const getPipelineApplications = createServerFn({
  method: "GET",
}).handler(async () => {
  const database = getDatabase()
  const [rows, tasks] = await Promise.all([
    database
      .select({ application: financingApplications, applicant: applicants })
      .from(financingApplications)
      .innerJoin(
        applicants,
        eq(financingApplications.applicantUuid, applicants.personUuid)
      )
      .orderBy(
        asc(financingApplications.crmStage),
        asc(financingApplications.crmPosition),
        asc(applicants.lastName),
        asc(applicants.firstName)
      ),
    database.select().from(applicationTasks),
  ])
  const today = new Date().toISOString().slice(0, 10)

  return rows.map(({ application, applicant }) => {
    const openTasks = tasks.filter(
      (task) =>
        task.financingUuid === application.financingUuid && !task.completedAt
    )

    return {
      ...application,
      applicant: {
        personUuid: applicant.personUuid,
        firstName: applicant.firstName,
        lastName: applicant.lastName,
        email: applicant.email,
        city: applicant.city,
        state: applicant.state,
        farmName: applicant.farmName,
      },
      openTaskCount: openTasks.length,
      overdueTaskCount: openTasks.filter(
        (task) => task.dueDate && task.dueDate < today
      ).length,
      cfiSyncedAt: application.cfiSyncedAt.toISOString(),
      createdAt: application.createdAt.toISOString(),
      updatedAt: application.updatedAt.toISOString(),
    }
  })
})

export const getCustomerDirectory = createServerFn({ method: "GET" }).handler(
  async () => {
    const database = getDatabase()
    const [people, relationships] = await Promise.all([
      database
        .select({
          personUuid: applicants.personUuid,
          firstName: applicants.firstName,
          lastName: applicants.lastName,
          email: applicants.email,
          phone: applicants.phone,
          farmName: applicants.farmName,
          city: applicants.city,
          state: applicants.state,
          archivedAt: applicants.archivedAt,
        })
        .from(applicants)
        .orderBy(asc(applicants.lastName), asc(applicants.firstName)),
      database
        .select({
          personUuid: financingParticipants.personUuid,
          organizationName: organizations.name,
        })
        .from(financingParticipants)
        .innerJoin(
          financingApplications,
          eq(
            financingParticipants.financingUuid,
            financingApplications.financingUuid
          )
        )
        .innerJoin(
          organizations,
          eq(
            financingApplications.organizationUuid,
            organizations.organizationUuid
          )
        ),
    ])

    const organizationByPerson = new Map<string, string>()
    for (const relationship of relationships) {
      if (!organizationByPerson.has(relationship.personUuid)) {
        organizationByPerson.set(
          relationship.personUuid,
          relationship.organizationName
        )
      }
    }

    return people.map((person) => ({
      ...person,
      farmName: organizationByPerson.get(person.personUuid) ?? null,
      archivedAt: person.archivedAt?.toISOString() ?? null,
    }))
  }
)
