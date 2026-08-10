// @ts-expect-error -- Vite generates this server bundle during the production build.
import application from "./dist/server/server.js"
import { resolve, sep } from "node:path"

interface ProductionBunFile extends Blob {
  exists: () => Promise<boolean>
}

interface ProductionBunServer {
  readonly url: URL
}

declare const Bun: {
  file: (path: string) => ProductionBunFile
  serve: (options: {
    fetch: (request: Request) => Promise<Response> | Response
    hostname: string
    port: number
  }) => ProductionBunServer
}

const clientDirectory = resolve(process.cwd(), "dist/client")

async function serve(request: Request) {
  const url = new URL(request.url)

  if (request.method === "GET" || request.method === "HEAD") {
    const pathname = decodeURIComponent(url.pathname)
    const assetPath = resolve(clientDirectory, `.${pathname}`)
    const isInsideClientDirectory = assetPath.startsWith(
      `${clientDirectory}${sep}`
    )

    if (isInsideClientDirectory) {
      const asset = Bun.file(assetPath)

      if (await asset.exists()) {
        const headers = new Headers({
          "Cache-Control": pathname.startsWith("/assets/")
            ? "public, max-age=31536000, immutable"
            : "public, max-age=3600",
          "Content-Type": asset.type || "application/octet-stream",
        })

        return new Response(request.method === "HEAD" ? null : asset, {
          headers,
        })
      }
    }
  }

  return application.fetch(request)
}

const server = Bun.serve({
  hostname: "0.0.0.0",
  port: Number(process.env.PORT ?? 3000),
  fetch: serve,
})

console.log(`Seed World listening on ${server.url}`)
