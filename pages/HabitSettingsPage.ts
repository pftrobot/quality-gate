import type { Locator, Page } from "@playwright/test"

export type Weekday = "일" | "월" | "화" | "수" | "목" | "금" | "토"

export type ScheduleRecurrence =
  | {
      type: "매일"
    }
  | {
      type: "매주"
      weekdays: readonly Weekday[]
    }
  | {
      type: "매달"
      dayOfMonth: number
    }

export type RecurringScheduleInput = {
  title: string
  startDate?: Date
  endDate?: Date
  recurrence: ScheduleRecurrence
}

/** 내 일정 목록과 추가/수정 화면의 Locator 및 사용자 행동을 담당하는 Page **/
export class HabitSettingsPage {
  // 동일 화면이 목록/추가/수정 모드로 바뀌므로 각 heading 을 별도로 관리
  readonly listHeading: Locator
  readonly addHeading: Locator
  readonly editHeading: Locator
  readonly backButton: Locator
  readonly addButton: Locator
  private readonly saveButton: Locator
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
    // 일정 제목을 받아 테스트가 생성한 일정만 정확히 찾는다
    return this.page.getByRole("button", { name: `${title} 수정`, exact: true })
  }

  scheduleRows(): Locator {
    return this.page.getByTestId(/^habit-item-/)
  }

  scheduleRow(testId: string): Locator {
    return this.page.getByTestId(testId).filter({ visible: true })
  }

  async lastScheduleRowTestId(): Promise<string> {
    const rows = this.scheduleRows()

    for (let attempt = 0; attempt < 20; attempt += 1) {
      const lastRow = rows.last()
      const testIdBeforeScroll = await lastRow.getAttribute("data-testid")

      await lastRow.scrollIntoViewIfNeeded()
      await lastRow.hover()

      const testIdAfterScroll = await rows.last().getAttribute("data-testid")

      if (testIdAfterScroll && testIdAfterScroll === testIdBeforeScroll) {
        return testIdAfterScroll
      }
    }

    throw new Error("목록 마지막 일정의 test ID를 확인할 수 없습니다.")
  }

  scheduleEditButton(testId: string, title: string): Locator {
    return this.scheduleRow(testId).getByRole("button", {
      name: `${title} 수정`,
      exact: true,
    })
  }

  recurrenceOption(name: "반복 없음" | "매일" | "매주" | "매달"): Locator {
    // 반복 유형을 메서드 인자로 받아 하나의 Locator 생성 규칙으로 관리함
    return this.page.getByRole("button", { name, exact: true })
  }

  weekdayOption(name: Weekday): Locator {
    return this.page.getByRole("button", { name, exact: true })
  }

  private monthDayOption(day: number): Locator {
    return this.page.getByRole("button", { name: `${day}일`, exact: true })
  }

  private endedSchedulesButton(): Locator {
    return this.page.getByRole("button", { name: /^종료된 일정 \(\d+\)/ })
  }

  dateInput(name: "시작일" | "마감일"): Locator {
    return this.page.getByLabel(name, { exact: true })
  }

  async startAdding(): Promise<void> {
    await this.addButton.click()
  }

  async createSchedule(title?: string): Promise<void> {
    await this.startAdding()

    // 제목을 전달하지 않으면 앱의 기본값으로 생성함
    if (title !== undefined) {
      await this.titleInput.fill(title)
    }
    await this.saveButton.click()
  }

  async createRecurringSchedule({
    title,
    startDate,
    endDate,
    recurrence,
  }: RecurringScheduleInput): Promise<void> {
    await this.startAdding()
    await this.titleInput.fill(title)

    if (startDate !== undefined) {
      await this.setDate("시작일", startDate)
    }
    if (endDate !== undefined) {
      await this.setDate("마감일", endDate)
    }

    await this.recurrenceOption(recurrence.type).click()

    if (recurrence.type === "매주") {
      for (const weekday of recurrence.weekdays) {
        await this.weekdayOption(weekday).click()
      }
    }
    if (recurrence.type === "매달") {
      await this.monthDayOption(recurrence.dayOfMonth).click()
    }

    await this.saveButton.click()
  }

  async openSchedule(title: string): Promise<void> {
    await this.scheduleItem(title).click()
  }

  async revealScheduleInList(title: string): Promise<boolean> {
    const item = this.scheduleItem(title)

    if ((await item.count()) > 0) return true

    await this.scrollScheduleListUntilVisible(item)
    if ((await item.count()) > 0) return true

    const endedSchedulesButton = this.endedSchedulesButton()
    if ((await endedSchedulesButton.count()) === 0) return false

    await endedSchedulesButton.click()
    await this.scrollScheduleListUntilVisible(item)

    return (await item.count()) > 0
  }

  async updateTitle(title: string): Promise<void> {
    await this.titleInput.fill(title)
    await this.saveButton.click()
  }

  async deleteOpenSchedule(): Promise<string> {
    let message = ""
    const dialogPromise = this.page.waitForEvent("dialog").then(async (dialog) => {
      try {
        message = dialog.message()
      } finally {
        await dialog.accept()
      }
    })

    await Promise.all([
      this.page.getByRole("button", { name: "삭제", exact: true }).click(),
      dialogPromise,
    ])

    return message
  }

  private async setDate(name: "시작일" | "마감일", date: Date): Promise<void> {
    const dateSwitch = name === "시작일" ? this.startDateSwitch : this.endDateSwitch

    await dateSwitch.click()
    await this.dateInput(name).fill(this.dateInputValue(date))
    await this.dateInput(name).press("Tab")
  }

  private dateInputValue(date: Date): string {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")

    return `${year}-${month}-${day}`
  }

  private async scrollScheduleListUntilVisible(item: Locator): Promise<void> {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      if ((await item.count()) > 0) return

      const rows = this.scheduleRows().filter({ visible: true })
      if ((await rows.count()) === 0) return

      const lastRow = rows.last()
      const testIdBeforeScroll = await lastRow.getAttribute("data-testid")

      await lastRow.scrollIntoViewIfNeeded()
      await lastRow.hover()

      if ((await item.count()) > 0) return

      const testIdAfterScroll = await rows.last().getAttribute("data-testid")
      if (testIdAfterScroll === testIdBeforeScroll) return
    }
  }
}
