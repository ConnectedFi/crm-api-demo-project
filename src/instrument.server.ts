import * as Sentry from "@sentry/tanstackstart-react"

const spotlightEnabled = Boolean(process.env.SENTRY_SPOTLIGHT)
const dsn = process.env.SENTRY_DSN || undefined

Sentry.init({
  dsn,
  enabled: spotlightEnabled || Boolean(dsn),
  environment: process.env.NODE_ENV ?? "development",
  spotlight: spotlightEnabled,
  sampleRate: 1,
  tracesSampleRate: spotlightEnabled ? 1 : 0.1,
  // Avoid feeding TanStack Devtools' forwarded console messages back through
  // Spotlight. Captured exceptions and performance traces remain enabled.
  enableLogs: false,
})
