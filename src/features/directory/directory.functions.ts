import { asc, eq } from "drizzle-orm"
import { createServerFn } from "@tanstack/react-start"
import { getDatabase } from "@/db/connection.server"
import {
  applicants,
  financingApplications,
  financingParticipants,
  organizations,
} from "@/db/schema"

export const getPeoplePageData = createServerFn({ method: "GET" }).handler(
  async () => {
    const database = getDatabase()
    const [people, links] = await Promise.all([
      database
        .select()
        .from(applicants)
        .orderBy(asc(applicants.lastName), asc(applicants.firstName)),
      database
        .select({
          personUuid: financingParticipants.personUuid,
          role: financingParticipants.role,
          financingUuid: financingApplications.financingUuid,
          status: financingApplications.status,
          availableMinor: financingApplications.availableCents,
          organizationUuid: organizations.organizationUuid,
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
        .leftJoin(
          organizations,
          eq(
            financingApplications.organizationUuid,
            organizations.organizationUuid
          )
        ),
    ])

    return people.map((person) => {
      const personLinks = links.filter(
        ({ personUuid }) => personUuid === person.personUuid
      )
      const organizationMap = new Map<string, string>()
      for (const link of personLinks) {
        if (link.organizationUuid && link.organizationName) {
          organizationMap.set(link.organizationUuid, link.organizationName)
        }
      }

      return {
        personUuid: person.personUuid,
        firstName: person.firstName,
        lastName: person.lastName,
        email: person.email,
        phone: person.phone,
        city: person.city,
        state: person.state,
        archivedAt: person.archivedAt?.toISOString() ?? null,
        cfiSyncedAt: person.cfiSyncedAt.toISOString(),
        roles: [...new Set(personLinks.map(({ role }) => role))],
        lineCount: personLinks.length,
        fundedLineCount: personLinks.filter(({ status }) => status === "funded")
          .length,
        availableMinor: personLinks
          .reduce(
            (total, link) => total + BigInt(link.availableMinor ?? "0"),
            0n
          )
          .toString(),
        organizations: [...organizationMap].map(([organizationUuid, name]) => ({
          organizationUuid,
          name,
        })),
      }
    })
  }
)

export const getLinesPageData = createServerFn({ method: "GET" }).handler(
  async () => {
    const database = getDatabase()
    const [lines, participantRows] = await Promise.all([
      database
        .select({ line: financingApplications, organization: organizations })
        .from(financingApplications)
        .leftJoin(
          organizations,
          eq(
            financingApplications.organizationUuid,
            organizations.organizationUuid
          )
        )
        .orderBy(
          asc(financingApplications.status),
          asc(financingApplications.cfiCreatedAt)
        ),
      database
        .select({
          financingUuid: financingParticipants.financingUuid,
          role: financingParticipants.role,
          position: financingParticipants.position,
          personUuid: applicants.personUuid,
          firstName: applicants.firstName,
          lastName: applicants.lastName,
          email: applicants.email,
        })
        .from(financingParticipants)
        .innerJoin(
          applicants,
          eq(financingParticipants.personUuid, applicants.personUuid)
        )
        .orderBy(asc(financingParticipants.position)),
    ])

    return lines.map(({ line, organization }) => ({
      financingUuid: line.financingUuid,
      status: line.status,
      rawStatus: line.rawStatus,
      requestedMinor: line.requestedCents,
      currency: line.currency,
      loanUuid: line.loanUuid,
      cropYear: line.cropYear,
      approvedMinor: line.approvedCents,
      availableMinor: line.availableCents,
      drawnMinor: line.drawnCents,
      archivedAt: line.archivedAt?.toISOString() ?? null,
      cfiUpdatedAt: line.cfiUpdatedAt?.toISOString() ?? null,
      cfiSyncedAt: line.cfiSyncedAt.toISOString(),
      organization: organization
        ? {
            organizationUuid: organization.organizationUuid,
            name: organization.name,
          }
        : null,
      participants: participantRows
        .filter(({ financingUuid }) => financingUuid === line.financingUuid)
        .map(({ financingUuid: _, ...participant }) => participant),
    }))
  }
)
