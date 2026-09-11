import { randomUUID } from "node:crypto"
import { expect, type Page } from "@playwright/test"
import { test } from "@/fixtures/account.fixture"

const EXISTING_EMAIL = process.env.TOIT_LOGIN_ID
const VALID_PASSWORD = "Qa1234!"

if (!EXISTING_EMAIL) {
  throw new Error("TOIT_LOGIN_ID 환경변수가 필요합니다.")
}

interface SignUpInputCase {
  title: string
  email: string
  password: string
  confirmPassword: string
}

async function messageFromNextDialog(
  page: Page,
  action: () => Promise<void>,
  expectedType: "alert" | "confirm" = "alert",
): Promise<string> {
  let message = ""
  const dialogPromise = page.waitForEvent("dialog").then(async (dialog) => {
    try {
      expect(dialog.type()).toBe(expectedType)
      message = dialog.message()
    } finally {
      await dialog.accept()
    }
  })

  await Promise.all([action(), dialogPromise])
  return message
}

test.beforeEach(async ({ page, loginPage }) => {
  await page.goto("/")
  await loginPage.goToSignUp()
  await expect(page.getByRole("heading", { name: "회원가입", exact: true })).toBeVisible()
})

test("새 계정으로 회원가입하면 자동 로그인되고 회원 탈퇴할 수 있다", async ({
  accountCleanup,
  page,
  signUpPage,
  morePage,
}, testInfo) => {
  const email = `playwright.signup.${randomUUID()}@example.com`

  testInfo.annotations.push({ type: "test-account", description: email })

  const signUpMessage = await messageFromNextDialog(page, () =>
    signUpPage.signUp(email, VALID_PASSWORD, VALID_PASSWORD),
  )

  expect(signUpMessage).toContain("회원가입 성공")
  expect(signUpMessage).toContain("계정이 생성되었습니다.")

  const calendarTab = page.getByRole("tab", { name: /Calendar$/ })
  await expect(calendarTab).toBeVisible()
  await expect(calendarTab).toHaveAttribute("aria-selected", "true")

  await morePage.goto(email)
  await expect(morePage.emailValue(email)).toBeVisible()

  const deleteMessage = await messageFromNextDialog(
    page,
    () => morePage.deleteAccountButton.click(),
    "confirm",
  )

  expect(deleteMessage).toContain("탈퇴 시 모든 프로젝트에서 제거되며")
  await expect(page.getByRole("heading", { name: "ToIt - Share It", exact: true })).toBeVisible()
  await expect(page.getByRole("button", { name: "로그인", exact: true })).toBeEnabled()
  accountCleanup.markDeletionComplete()
})

const requiredFieldCases: SignUpInputCase[] = [
  {
    title: "이메일 없이 회원가입하면 모든 필드 입력 안내가 표시된다",
    email: "",
    password: VALID_PASSWORD,
    confirmPassword: VALID_PASSWORD,
  },
  {
    title: "비밀번호 없이 회원가입하면 모든 필드 입력 안내가 표시된다",
    email: "signup@example.com",
    password: "",
    confirmPassword: VALID_PASSWORD,
  },
  {
    title: "비밀번호 확인 없이 회원가입하면 모든 필드 입력 안내가 표시된다",
    email: "signup@example.com",
    password: VALID_PASSWORD,
    confirmPassword: "",
  },
  {
    title: "모든 필드가 비어 있으면 모든 필드 입력 안내가 표시된다",
    email: "",
    password: "",
    confirmPassword: "",
  },
]

for (const { title, email, password, confirmPassword } of requiredFieldCases) {
  test(title, async ({ page, signUpPage }) => {
    const message = await messageFromNextDialog(page, () =>
      signUpPage.signUp(email, password, confirmPassword),
    )

    expect(message).toContain("모든 필드를 입력해주세요.")
  })
}

test("비밀번호 확인이 일치하지 않으면 불일치 안내가 표시된다", async ({ page, signUpPage }) => {
  const message = await messageFromNextDialog(page, () =>
    signUpPage.signUp("signup@example.com", VALID_PASSWORD, "Different123!"),
  )

  expect(message).toContain("비밀번호가 일치하지 않습니다.")
})

test("6자 미만 비밀번호로 회원가입하면 최소 길이 안내가 표시된다", async ({ page, signUpPage }) => {
  const shortPassword = "Qa1!"
  const message = await messageFromNextDialog(page, () =>
    signUpPage.signUp("signup@example.com", shortPassword, shortPassword),
  )

  expect(message).toContain("비밀번호는 최소 6자 이상이어야 합니다.")
})

test("이미 사용 중인 이메일로 회원가입하면 중복 안내가 표시된다", async ({ page, signUpPage }) => {
  const message = await messageFromNextDialog(page, () =>
    signUpPage.signUp(EXISTING_EMAIL, VALID_PASSWORD, VALID_PASSWORD),
  )

  expect(message).toContain("이미 사용 중인 이메일입니다.")
})

test("잘못된 이메일 형식으로 회원가입하면 형식 안내가 표시된다", async ({ page, signUpPage }) => {
  const message = await messageFromNextDialog(page, () =>
    signUpPage.signUp("invalid-email", VALID_PASSWORD, VALID_PASSWORD),
  )

  expect(message).toContain("올바른 이메일 형식이 아닙니다.")
})
