import type { Locator, Page } from "@playwright/test"

export type TaskRecurrence =
  | { type: "반복 없음" }
  | { type: "매일" }
  | { type: "매주"; weekdays: readonly Weekday[] }
  | { type: "매달"; monthDays: readonly number[] }

export type Weekday = "일" | "월" | "화" | "수" | "목" | "금" | "토"

export type GroupTaskInput = {
  title?: string
  memo?: string
  category?: string
  recurrence?: TaskRecurrence
}

/** 그룹 상세의 할 일 목록과 추가/수정 화면을 담당하는 Page */
export class GroupTaskPage {
  readonly addScreen: Locator
  readonly addHeading: Locator
  readonly editScreen: Locator
  readonly editHeading: Locator
  readonly titleInput: Locator
  readonly memoInput: Locator
  readonly saveButton: Locator
  readonly addCancelButton: Locator
  readonly editCancelButton: Locator
  readonly colorPickerButton: Locator
  readonly categoryManagerButton: Locator
  readonly unassignedOption: Locator
  readonly emojiButton: Locator
  readonly startDateSwitch: Locator
  readonly endDateSwitch: Locator
  readonly deleteTaskButton: Locator

  private readonly page: Page

  constructor(page: Page) {
    this.page = page
    this.addScreen = page.getByTestId("add-task-screen")
    this.addHeading = page.getByRole("heading", { name: "할 일 추가", exact: true })
    this.editScreen = page.getByTestId("edit-task-screen")
    this.editHeading = page.getByRole("heading", { name: "할 일 수정", exact: true })
    this.titleInput = page.getByRole("textbox", { name: "할 일 제목", exact: true })
    this.memoInput = page.getByRole("textbox", { name: "메모", exact: true })
    this.saveButton = page.getByRole("button", { name: "할 일 저장", exact: true })
    this.addCancelButton = page.getByRole("button", { name: "할 일 추가 취소", exact: true })
    this.editCancelButton = page.getByRole("button", { name: "할 일 수정 취소", exact: true })
    this.colorPickerButton = page.getByRole("button", {
      name: "할 일 색상 선택",
      exact: true,
    })
    this.categoryManagerButton = page.getByRole("button", {
      name: "카테고리 관리",
      exact: true,
    })
    this.unassignedOption = page.getByRole("button", {
      name: "담당자 미지정",
      exact: true,
    })
    this.emojiButton = page.getByRole("button", { name: "이모지 선택", exact: true })
    this.startDateSwitch = page.getByRole("switch", { name: "시작일 사용", exact: true })
    this.endDateSwitch = page.getByRole("switch", { name: "마감일 사용", exact: true })
    this.deleteTaskButton = page.getByRole("button", { name: "할 일 삭제", exact: true })
  }

  taskOpenButton(title: string): Locator {
    return this.page.getByRole("button", {
      name: `${title} 상세 보기`,
      exact: true,
    })
  }

  taskDeleteAction(title: string): Locator {
    return this.page.getByRole("button", { name: `${title} 삭제`, exact: true })
  }

  taskRow(title: string): Locator {
    return this.page
      .getByTestId(/^task-item-/)
      .filter({ has: this.taskOpenButton(title) })
      .filter({ visible: true })
  }

  colorDialog(): Locator {
    return this.page.getByRole("dialog", { name: "할 일 색상 선택", exact: true })
  }

  colorOption(index: number): Locator {
    return this.colorDialog().getByRole("button", {
      name: `색상 ${index + 1}`,
      exact: true,
    })
  }

  categoryOption(name: NonNullable<GroupTaskInput["category"]>): Locator {
    return this.page.getByRole("button", { name, exact: true })
  }

  recurrenceOption(name: TaskRecurrence["type"]): Locator {
    return this.page.getByRole("button", { name, exact: true })
  }

  weekdayOption(name: Weekday): Locator {
    return this.page.getByRole("button", { name, exact: true })
  }

  monthDayOption(day: number): Locator {
    return this.page.getByRole("button", { name: `${day}일`, exact: true })
  }

  dateInput(name: "시작일" | "마감일"): Locator {
    return this.page.getByRole("textbox", { name, exact: true })
  }

  async waitForAddFormReady(): Promise<void> {
    await this.addScreen.waitFor({ state: "visible" })
    // 프로젝트와 생성자 정보 로딩 후에만 표시되므로 비동기 폼 초기화 완료 신호로 사용한다.
    await this.unassignedOption.waitFor({ state: "visible" })
  }

  async createTask(input: GroupTaskInput = {}): Promise<void> {
    await this.fillTaskForm(input)
    await this.saveButton.click()
  }

  async updateTask(input: GroupTaskInput): Promise<void> {
    await this.fillTaskForm(input)
    await this.saveButton.click()
  }

  async openTask(title: string): Promise<void> {
    await this.taskOpenButton(title).click()
    await this.editScreen.waitFor({ state: "visible" })
  }

  async deleteOpenTask(): Promise<string> {
    let message = ""
    const dialogPromise = this.page.waitForEvent("dialog").then(async (dialog) => {
      message = dialog.message()
      await dialog.accept()
    })

    await Promise.all([this.deleteTaskButton.click(), dialogPromise])
    return message
  }

  async saveRecurringTask(): Promise<string> {
    let message = ""
    const dialogPromise = this.page.waitForEvent("dialog").then(async (dialog) => {
      message = dialog.message()
      await dialog.accept()
    })

    await Promise.all([this.saveButton.click(), dialogPromise])
    return message
  }

  private async fillTaskForm(input: GroupTaskInput): Promise<void> {
    if (input.title !== undefined) {
      await this.titleInput.fill(input.title)
    }
    if (input.memo !== undefined) {
      await this.memoInput.fill(input.memo)
    }
    if (input.category !== undefined) {
      await this.categoryOption(input.category).click()
    }
    if (input.recurrence !== undefined) {
      await this.recurrenceOption(input.recurrence.type).click()

      if (input.recurrence.type === "매주") {
        for (const weekday of input.recurrence.weekdays) {
          await this.weekdayOption(weekday).click()
        }
      }
      if (input.recurrence.type === "매달") {
        for (const day of input.recurrence.monthDays) {
          await this.monthDayOption(day).click()
        }
      }
    }
  }
}
