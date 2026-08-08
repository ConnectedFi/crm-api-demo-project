import * as Sentry from "@sentry/tanstackstart-react"

const spotlightEnabled = import.meta.env.DEV
const dsn = import.meta.env.VITE_SENTRY_DSN || undefined

Sentry.init({
  dsn,
  enabled: spotlightEnabled || Boolean(dsn),
  environment: import.meta.env.MODE,
  spotlight: spotlightEnabled,
  sampleRate: 1,
  tracesSampleRate: spotlightEnabled ? 1 : 0.1,
  // TanStack Devtools forwards browser console output to its local server.
  // Capturing that forwarded output as Sentry logs creates a feedback loop:
  // console -> Devtools -> server console -> Spotlight -> console.
  // Exceptions and traces still flow to Spotlight without console log capture.
  enableLogs: false,
})
