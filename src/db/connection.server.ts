import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"

let database: ReturnType<typeof drizzle> | undefined

export function getDatabase() {
  if (database) return database

  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured")
  }

  const client = postgres(databaseUrl, {
    max: process.env.NODE_ENV === "production" ? 10 : 1,
  })

  database = drizzle({ client })
  return database
}
