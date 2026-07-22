import type { Locator, Page } from "@playwright/test"

/** 내 일정 목록과 추가/수정 화면의 Locator 및 사용자 행동을 담당하는 Page **/
export class HabitSettingsPage {
  // 동일 화면이 목록·추가·수정 모드로 바뀌므로 각 heading을 별도로 관리한다.
  readonly listHeading: Locator
  readonly addHeading: Locator
  readonly editHeading: Locator
  readonly backButton: Locator
  readonly addButton: Locator
  readonly saveButton: Locator
  readonly titleInput: Locator
  readonly emojiButton: Locator
  readonly startDateSwitch: Locator
  readonly endDateSwitch: Locator

  private readonly page: Page

  constructor(page: Page) {
    this.page = page
    this.listHeading = page.getByRole("heading", { name: "내 일정", exact: true })
    this.addHeading = page.getByRole("heading", { name: "내 일정 추가", exact: true })
    this.editHeading = page.getByRole("heading", { name: "내 일정 수정", exact: true })
    this.backButton = page.getByRole("button", { name: "뒤로" })
    this.addButton = page.getByRole("button", { name: "내 일정 추가" })
    this.saveButton = page.getByRole("button", { name: "내 일정 저장" })
    this.titleInput = page.getByRole("textbox", { name: "내 일정 제목" })
    this.emojiButton = page.getByRole("button", { name: "이모지 선택" })
    this.startDateSwitch = page.getByLabel("시작일 사용", { exact: true })
    this.endDateSwitch = page.getByLabel("마감일 사용", { exact: true })
  }

  scheduleItem(title: string): Locator {
    // 일정 제목을 인자로 받아 테스트가 생성한 일정만 정확히 찾는다.
    return this.page.getByRole("button", { name: `${title} 수정`, exact: true })
  }

  scheduleItems(title: string): Locator {
    return this.page.getByRole("button", { name: `${title} 수정`, exact: true })
  }

  recurrenceOption(name: "반복 없음" | "매일" | "매주" | "매달"): Locator {
    // 반복 유형을 메서드 인자로 받아 하나의 Locator 생성 규칙으로 관리한다.
    return this.page.getByRole("button", { name, exact: true })
  }

  weekdayOption(name: "일" | "월" | "화" | "수" | "목" | "금" | "토"): Locator {
    return this.page.getByRole("button", { name, exact: true })
  }

  dateButton(name: "시작일" | "마감일"): Locator {
    return this.page.getByRole("button", { name, exact: true })
  }

  async startAdding(): Promise<void> {
    await this.addButton.click()
  }

  async createSchedule(title?: string): Promise<void> {
    await this.startAdding()

    // 제목을 전달하지 않으면 앱의 기본값 생성 동작을 그대로 검증할 수 있다.
    if (title !== undefined) {
      await this.titleInput.fill(title)
    }
    await this.saveButton.click()
  }

  async openSchedule(title: string): Promise<void> {
    await this.scheduleItem(title).click()
  }

  async updateTitle(title: string): Promise<void> {
    await this.titleInput.fill(title)
    await this.saveButton.click()
  }

  async deleteOpenSchedule(): Promise<string> {
    // 삭제 dialog의 문구를 반환해 호출한 테스트에서도 내용을 검증할 수 있게 한다.
    const dialogPromise = this.page.waitForEvent("dialog")
    await this.page.getByRole("button", { name: "삭제", exact: true }).click()
    const dialog = await dialogPromise
    const message = dialog.message()
    await dialog.accept()
    return message
  }
}
