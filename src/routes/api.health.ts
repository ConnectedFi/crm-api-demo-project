import { sql } from "drizzle-orm"
import { createFileRoute } from "@tanstack/react-router"
import { getDatabase } from "@/db/connection.server"

export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: async () => {
        try {
          await getDatabase().execute(sql`select 1`)

          return Response.json({
            status: "ok",
            database: "connected",
          })
        } catch (error) {
          console.error("Database health check failed", error)

          return Response.json(
            {
              status: "error",
              database: "unavailable",
            },
            { status: 503 }
          )
        }
      },
    },
  },
})
