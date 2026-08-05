import type { Locator, Page } from "@playwright/test"

/** 더보기 화면의 Locator와 사용자 행동을 담당하는 Page */
export class MorePage {
  readonly moreTab: Locator
  readonly heading: Locator
  readonly darkModeSwitch: Locator
  readonly reminderSwitch: Locator
  readonly reminderTimeButton: Locator
  readonly emailLabel: Locator
  readonly displayNameInput: Locator
  readonly saveDisplayNameButton: Locator
  readonly feedbackButton: Locator
  readonly deleteAccountButton: Locator
  readonly logoutButton: Locator
  readonly version: Locator

  private readonly page: Page

  constructor(page: Page) {
    this.page = page
    this.moreTab = page.getByRole("tab", { name: /더보기$/ })
    this.heading = page.getByRole("heading", { name: "더보기", exact: true })
    this.darkModeSwitch = page.getByRole("switch", { name: "다크 모드", exact: true })
    this.reminderSwitch = page.getByRole("switch", {
      name: "오늘 일정 알림",
      exact: true,
    })
    this.reminderTimeButton = page.getByRole("button", { name: /^알림 시간/ })
    this.emailLabel = page.getByText("이메일", { exact: true })
    this.displayNameInput = page.getByRole("textbox", { name: "표시 이름", exact: true })
    this.saveDisplayNameButton = page.getByRole("button", {
      name: "표시 이름 저장",
      exact: true,
    })
    this.feedbackButton = page.getByRole("button", {
      name: /^피드백 보내기/,
    })
    this.deleteAccountButton = page.getByRole("button", { name: /회원 탈퇴/ })
    this.logoutButton = page.getByRole("button", { name: /로그아웃/ })
    this.version = page.getByText(/^v.+$/)
  }

  emailValue(expectedEmail: string): Locator {
    return this.page.getByText(expectedEmail, { exact: true })
  }

  feedbackDialog(): Locator {
    return this.page.getByRole("dialog", { name: "피드백 보내기", exact: true })
  }

  feedbackInput(): Locator {
    return this.feedbackDialog().getByRole("textbox", { name: "피드백 내용", exact: true })
  }

  feedbackSendButton(): Locator {
    return this.feedbackDialog().getByRole("button", {
      name: "피드백 보내기",
      exact: true,
    })
  }

  dialogCancelButton(dialog: Locator): Locator {
    return dialog.getByRole("button", { name: "취소", exact: true })
  }

  async goto(): Promise<void> {
    await this.page.goto("/")
    await this.moreTab.waitFor({ state: "visible" })
    await this.moreTab.click()
    await this.heading.waitFor({ state: "visible" })
  }

  async openFeedback(): Promise<void> {
    await this.feedbackButton.click()
    await this.feedbackDialog().waitFor({ state: "visible" })
  }
}
