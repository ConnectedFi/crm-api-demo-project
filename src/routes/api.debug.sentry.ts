import * as Sentry from "@sentry/tanstackstart-react"
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/api/debug/sentry")({
  server: {
    handlers: {
      POST: async () => {
        if (process.env.NODE_ENV === "production") {
          return new Response(null, { status: 404 })
        }

        const error = new Error("Sentry Spotlight test error")
        Sentry.captureException(error)
        await Sentry.flush(2_000)

        return Response.json({ captured: true })
      },
    },
  },
})
