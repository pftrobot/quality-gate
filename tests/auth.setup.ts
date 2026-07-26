import * as path from "node:path"
import { expect } from "@playwright/test"
import { test } from "@/fixtures/pages.fixture"

const authFile = path.resolve(__dirname, "../playwright/.auth/user.json")

const LOGIN_EMAIL = process.env.TOIT_LOGIN_ID
const LOGIN_PASSWORD = process.env.TOIT_LOGIN_PASSWORD

// 환경변수 검증
if (!LOGIN_EMAIL || !LOGIN_PASSWORD) {
  throw new Error("TOIT_LOGIN_ID와 TOIT_LOGIN_PASSWORD 환경변수가 필요합니다.")
}

test("유효한 계정으로 로그인하여 인증정보를 user.json에 저장한다", async ({ page, loginPage }) => {
  const calendarTab = page.getByRole("tab", { name: /Calendar$/ })

  await page.goto("/")

  await loginPage.login(LOGIN_EMAIL, LOGIN_PASSWORD)

  await expect(calendarTab).toBeVisible()
  await expect(calendarTab).toHaveAttribute("aria-selected", "true")

  await page.context().storageState({
    path: authFile,
    indexedDB: true,
  })
})
