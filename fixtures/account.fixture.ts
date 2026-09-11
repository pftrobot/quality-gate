import { expect } from "@playwright/test"
import { test as base } from "@/fixtures/pages.fixture"

type AccountCleanup = {
  markDeletionComplete(): void
}

export const test = base.extend<{ accountCleanup: AccountCleanup }>({
  accountCleanup: [
    async ({ morePage, page }, use) => {
      let deletionComplete = false

      try {
        await use({
          markDeletionComplete() {
            deletionComplete = true
          },
        })
      } finally {
        if (!deletionComplete) {
          await page.goto("/")

          const loginHeading = page.getByRole("heading", {
            name: "ToIt - Share It",
            exact: true,
          })
          const moreTab = page.getByRole("tab", { name: /더보기$/ })

          await expect(loginHeading.or(moreTab).first()).toBeVisible({ timeout: 10_000 })

          // 회원가입이 완료된 로그인 상태에서만 teardown으로 계정을 삭제한다.
          if (!(await loginHeading.isVisible())) {
            await morePage.goto()

            const dialogPromise = page.waitForEvent("dialog").then(async (dialog) => {
              expect(dialog.type()).toBe("confirm")
              await dialog.accept()
            })

            await Promise.all([morePage.deleteAccountButton.click(), dialogPromise])
            await expect(loginHeading).toBeVisible()
          }
        }
      }
    },
    { timeout: 60_000 },
  ],
})
