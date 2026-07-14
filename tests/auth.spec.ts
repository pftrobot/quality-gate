import { expect, test } from "@playwright/test"

const BASE_URL = "https://toit-nu.vercel.app/"
const LOGIN_EMAIL = process.env.TOIT_LOGIN_ID
const LOGIN_PASSWORD = process.env.TOIT_LOGIN_PASSWORD
const LOGIN_DUMMY_EMAIL = "email@email.com"
const LOGIN_DUMMY_PASSWORD = "Abcde123!"

test("유효한 계정으로 로그인하면 캘린더 화면이 표시된다", async ({ page }) => {
  // 환경변수 검증
  if (!LOGIN_EMAIL || !LOGIN_PASSWORD) {
    throw new Error("TOIT_LOGIN_ID와 TOIT_LOGIN_PASSWORD 환경변수가 필요합니다.")
  }

  const calendarTab = page.getByRole("tab", { name: /Calendar$/ })

  await page.goto(BASE_URL)

  await page.getByRole("textbox", { name: "이메일" }).fill(LOGIN_EMAIL)
  await page.getByLabel("비밀번호").fill(LOGIN_PASSWORD)
  await page.getByRole("button", { name: "로그인", exact: true }).click()

  await expect(calendarTab).toBeVisible()
  await expect(calendarTab).toHaveAttribute("aria-selected", "true")
})

interface LoginInputCase {
  title: string
  email: string
  password: string
}
const requiredFieldCases: LoginInputCase[] = [
  {
    title: "빈 이메일로 로그인하면 이메일과 비밀번호를 입력하라는 문구가 표시된다",
    email: "",
    password: LOGIN_DUMMY_PASSWORD,
  },
  {
    title: "빈 비밀번호로 로그인하면 이메일과 비밀번호를 입력하라는 문구가 표시된다",
    email: LOGIN_DUMMY_EMAIL,
    password: "",
  },
  {
    title:
      "이메일과 비밀번호 모두 빈 채로 로그인하면 이메일과 비밀번호를 입력하라는 문구가 표시된다",
    email: "",
    password: "",
  },
]

for (const { title, email, password } of requiredFieldCases) {
  test(title, async ({ page }) => {
    await page.goto(BASE_URL)

    await page.getByRole("textbox", { name: "이메일" }).fill(email)
    await page.getByLabel("비밀번호").fill(password)

    // dialog 이벤트 등록
    page.once("dialog", async (dialog) => {
      try {
        expect(dialog.type()).toBe("alert")
        expect(dialog.message()).toContain("이메일과 비밀번호를 입력해주세요")
      } finally {
        await dialog.accept()
      }
    })

    await page.getByRole("button", { name: "로그인", exact: true }).click()
  })
}

const invalidCredentialCases: LoginInputCase[] = [
  {
    title:
      "올바르지 않은 비밀번호로 로그인하면 이메일 또는 비밀번호가 올바르지 않다는 문구가 표시된다",
    email: LOGIN_EMAIL,
    password: LOGIN_DUMMY_PASSWORD,
  },
  {
    title:
      "올바르지 않은 이메일과 비밀번호로 로그인하면 이메일 또는 비밀번호가 올바르지 않다는 문구가 표시된다",
    email: LOGIN_DUMMY_EMAIL,
    password: LOGIN_DUMMY_PASSWORD,
  },
]

for (const { title, email, password } of invalidCredentialCases) {
  test(title, async ({ page }) => {
    await page.goto(BASE_URL)

    await page.getByRole("textbox", { name: "이메일" }).fill(email)
    await page.getByLabel("비밀번호").fill(password)

    page.once("dialog", async (dialog) => {
      try {
        expect(dialog.type()).toBe("alert")
        expect(dialog.message()).toContain("이메일 또는 비밀번호가 올바르지 않습니다")
      } finally {
        await dialog.accept()
      }
    })

    await page.getByRole("button", { name: "로그인", exact: true }).click()
  })
}
