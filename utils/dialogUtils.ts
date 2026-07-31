import type { Page } from "@playwright/test"

export async function dismissDialogAndGetMessage(
  page: Page,
  action: () => Promise<void>,
): Promise<string> {
  let message = ""
  const dialogPromise = page.waitForEvent("dialog").then(async (dialog) => {
    message = dialog.message()
    await dialog.dismiss()
  })

  await Promise.all([action(), dialogPromise])
  return message
}
