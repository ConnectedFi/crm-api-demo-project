import "./instrument.server"

import { wrapFetchWithSentry } from "@sentry/tanstackstart-react"
import handler, { createServerEntry } from "@tanstack/react-start/server-entry"
import type { ServerEntry } from "@tanstack/react-start/server-entry"

const requestHandler: ServerEntry = wrapFetchWithSentry({
  fetch(request) {
    return handler.fetch(request)
  },
})

export default createServerEntry(requestHandler)
