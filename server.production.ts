import application from "./dist/server/server.js"

const server = Bun.serve({
  hostname: "0.0.0.0",
  port: Number(process.env.PORT ?? 3000),
  fetch: application.fetch,
})

console.log(`Seed World listening on ${server.url}`)
