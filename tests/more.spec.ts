import { expect, type Page } from "@playwright/test"
import { test } from "@/fixtures/pages.fixture"

const LOGIN_EMAIL = process.env.TOIT_LOGIN_ID

if (!LOGIN_EMAIL) {
  throw new Error("TOIT_LOGIN_ID 환경변수가 필요합니다.")
}

async function messageFromNextDialog(
  page: Page,
  action: () => Promise<void>,
  accept = false,
): Promise<string> {
  let message = ""
  const dialogPromise = page.waitForEvent("dialog").then(async (dialog) => {
    message = dialog.message()
    if (accept) {
      await dialog.accept()
    } else {
      await dialog.dismiss()
    }
  })

  await Promise.all([action(), dialogPromise])
  return message
}

test.beforeEach(async ({ morePage }) => {
  await morePage.goto()
})

test("더보기 화면에 로그인한 사용자의 이메일이 표시된다", async ({ morePage }) => {
  await expect(morePage.emailValue(LOGIN_EMAIL)).toBeVisible()
})

test("더보기 탭을 선택하면 주요 설정과 사용자 동작이 표시된다", async ({ morePage }) => {
  await expect(morePage.moreTab).toHaveAttribute("aria-selected", "true")
  await expect(morePage.heading).toBeVisible()
  await expect(morePage.darkModeSwitch).toBeEnabled()
  await expect(morePage.reminderSwitch).toBeEnabled()
  await expect(morePage.reminderTimeButton).toBeEnabled()
  await expect(morePage.emailLabel).toBeVisible()
  await expect(morePage.displayNameInput).toBeEditable()
  await expect(morePage.saveDisplayNameButton).toBeEnabled()
  await expect(morePage.feedbackButton).toBeEnabled()
  await expect(morePage.deleteAccountButton).toBeEnabled()
  await expect(morePage.logoutButton).toBeEnabled()
  await expect(morePage.version).toBeVisible()
})

test("다크 모드 스위치를 누르면 선택 상태가 변경된다", async ({ morePage }) => {
  const wasDark = await morePage.darkModeSwitch.isChecked()

  await morePage.darkModeSwitch.click()

  if (wasDark) {
    await expect(morePage.darkModeSwitch).not.toBeChecked()
  } else {
    await expect(morePage.darkModeSwitch).toBeChecked()
  }
})

test("오늘 일정 알림을 변경하려고 하면 미지원 안내 후 기존 상태가 유지된다", async ({
  morePage,
  page,
}) => {
  const wasEnabled = await morePage.reminderSwitch.isChecked()

  const message = await messageFromNextDialog(page, () => morePage.reminderSwitch.click())

  expect(message).toContain("웹에서는 알림을 지원하지 않습니다.")
  if (wasEnabled) {
    await expect(morePage.reminderSwitch).toBeChecked()
  } else {
    await expect(morePage.reminderSwitch).not.toBeChecked()
  }
})

test("알림 시간 설정을 누르면 미지원 안내 후 기존 상태가 유지된다", async ({ morePage, page }) => {
  const initialReminderTimeText = await morePage.reminderTimeButton.innerText()
  const message = await messageFromNextDialog(page, () => morePage.reminderTimeButton.click())

  expect(message).toContain("웹에서는 알림을 지원하지 않습니다.")
  await expect(morePage.reminderTimeButton).toHaveText(initialReminderTimeText, {
    useInnerText: true,
  })
})

test("표시 이름을 입력하지 않고 저장하면 안내 메시지가 표시된다", async ({ morePage, page }) => {
  await morePage.displayNameInput.clear()

  const message = await messageFromNextDialog(page, () => morePage.saveDisplayNameButton.click())

  expect(message).toContain("표시 이름을 입력해주세요.")
})

test("피드백 입력 모달에서 빈 내용을 전송하면 안내 메시지가 표시된다", async ({
  morePage,
  page,
}) => {
  await morePage.openFeedback()
  const dialog = morePage.feedbackDialog()

  await expect(morePage.feedbackInput()).toBeEditable()
  const message = await messageFromNextDialog(page, () => morePage.feedbackSendButton().click())

  expect(message).toContain("피드백 내용을 입력해주세요.")
  await expect(dialog).toBeVisible()
  await morePage.dialogCancelButton(dialog).click()
  await expect(dialog).toBeHidden()
})

test("회원 탈퇴를 취소하면 더보기 화면이 유지된다", async ({ morePage, page }) => {
  const message = await messageFromNextDialog(page, () => morePage.deleteAccountButton.click())

  expect(message).toContain("탈퇴 시 모든 프로젝트에서 제거되며")
  await expect(morePage.heading).toBeVisible()
  await expect(morePage.moreTab).toHaveAttribute("aria-selected", "true")
})

test("로그아웃을 취소하면 더보기 화면이 유지된다", async ({ morePage, page }) => {
  const message = await messageFromNextDialog(page, () => morePage.logoutButton.click())

  expect(message).toContain("로그아웃 하시겠습니까?")
  await expect(morePage.heading).toBeVisible()
})

test("로그아웃을 확인하면 로그인 화면으로 이동한다", async ({ morePage, page }) => {
  const message = await messageFromNextDialog(page, () => morePage.logoutButton.click(), true)

  expect(message).toContain("로그아웃 하시겠습니까?")
  await expect(page.getByRole("heading", { name: "ToIt - Share It", exact: true })).toBeVisible()
  await expect(page.getByRole("button", { name: "로그인", exact: true })).toBeEnabled()
})
