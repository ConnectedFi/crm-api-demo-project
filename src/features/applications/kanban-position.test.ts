import { describe, expect, it } from "vitest"
import { computeDrop } from "./kanban-position"

const stages = new Set(["new", "contacted"])
const card = (
  financingUuid: string,
  crmStage: string,
  crmPosition: number
) => ({
  financingUuid,
  crmStage,
  crmPosition,
})

describe("computeDrop", () => {
  it("inserts before a card in another column", () => {
    const result = computeDrop(
      [card("a", "new", 0), card("b", "contacted", 0)],
      "a",
      "b",
      stages
    )

    expect(
      result?.map(({ financingUuid, crmStage, crmPosition }) => [
        financingUuid,
        crmStage,
        crmPosition,
      ])
    ).toEqual([
      ["a", "contacted", 0],
      ["b", "contacted", 1],
    ])
  })

  it("appends when dropping on a column", () => {
    const result = computeDrop(
      [card("a", "new", 0), card("b", "contacted", 0)],
      "a",
      "contacted",
      stages
    )

    expect(
      result?.find(({ financingUuid }) => financingUuid === "a")
    ).toMatchObject({
      crmStage: "contacted",
      crmPosition: 1,
    })
  })
})
