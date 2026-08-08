import { describe, expect, it } from "vitest"

import { cn } from "./utils"

describe("cn", () => {
  it("merges Tailwind classes predictably", () => {
    expect(cn("px-2", undefined, "px-4")).toBe("px-4")
  })
})
