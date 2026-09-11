import { expect, type Locator } from "@playwright/test"

export async function scrollVirtualizedListUntilRendered(
  item: Locator,
  rows: Locator,
  maxAttempts = 20,
): Promise<boolean> {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if ((await item.count()) > 0) return true
    if ((await rows.count()) === 0) return false

    const lastRow = rows.last()
    const lastTestIdBefore = await lastRow.getAttribute("data-testid")

    await lastRow.scrollIntoViewIfNeeded()
    await lastRow.hover()

    try {
      await expect
        .poll(
          async () => {
            if ((await item.count()) > 0) return "item-rendered"
            if ((await rows.count()) === 0) return "list-empty"

            const lastTestIdAfter = await rows.last().getAttribute("data-testid")
            return lastTestIdAfter !== lastTestIdBefore ? "window-advanced" : "pending"
          },
          { timeout: 1_500, intervals: [50, 100, 250] },
        )
        .not.toBe("pending")
    } catch {
      // 렌더링 구간이 더 이상 바뀌지 않으면 실제 목록의 끝으로 간주한다.
      return (await item.count()) > 0
    }
  }

  return (await item.count()) > 0
}
