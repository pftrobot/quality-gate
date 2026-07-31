import { expect, type Locator, type Page } from "@playwright/test"

export type GroupInput = {
  name: string
  memo?: string
  colorIndex?: number
  showDeadline?: boolean
  deadline?: Date
  showProgress?: boolean
  showIncompleteCount?: boolean
}

/** 그룹 목록, 추가, 상세, 설정 화면의 Locator와 사용자 행동을 담당하는 Page */
export class GroupPage {
  readonly groupsTab: Locator
  readonly listScreen: Locator
  readonly listHeading: Locator
  readonly addButton: Locator
  readonly inviteToggle: Locator
  readonly inviteCodeInput: Locator
  readonly joinByInviteButton: Locator

  readonly addScreen: Locator
  readonly addHeading: Locator
  readonly addCancelButton: Locator
  readonly groupNameInput: Locator
  readonly memoInput: Locator
  readonly deadlineSwitch: Locator
  readonly progressSwitch: Locator
  readonly incompleteCountSwitch: Locator
  readonly colorPickerButton: Locator
  readonly saveGroupButton: Locator

  readonly detailScreen: Locator
  readonly settingsButton: Locator
  readonly statsMonthPicker: Locator
  readonly taskListEmpty: Locator
  readonly addTaskButton: Locator
  readonly backToListButton: Locator

  readonly settingsScreen: Locator
  readonly settingsHeading: Locator
  readonly settingsSaveButton: Locator
  readonly settingsScroll: Locator
  readonly membersList: Locator
  readonly createInviteCodeButton: Locator
  readonly deleteProjectButton: Locator
  readonly backToDetailButton: Locator

  private readonly page: Page

  constructor(page: Page) {
    this.page = page
    this.groupsTab = page.getByRole("tab", { name: /Groups$/ })
    this.listScreen = page.getByTestId("project-list-screen").filter({ visible: true })
    this.listHeading = this.listScreen.getByRole("heading", { name: "Groups", exact: true })
    this.addButton = this.listScreen.getByRole("button", { name: "새 그룹", exact: true })
    this.inviteToggle = this.listScreen.getByRole("button", {
      name: "초대 코드 입력",
      exact: true,
    })
    this.inviteCodeInput = this.listScreen.getByRole("textbox", {
      name: "초대 코드",
      exact: true,
    })
    this.joinByInviteButton = this.listScreen.getByRole("button", {
      name: "초대 코드로 참여",
      exact: true,
    })

    this.addScreen = page.getByTestId("add-project-screen").filter({ visible: true })
    this.addHeading = this.addScreen.getByRole("heading", { name: "새 그룹", exact: true })
    this.addCancelButton = this.addScreen.getByRole("button", {
      name: "그룹 추가 취소",
      exact: true,
    })
    this.groupNameInput = page.getByRole("textbox", {
      name: "그룹 이름",
      exact: true,
    })
    this.memoInput = page.getByRole("textbox", { name: "메모", exact: true })
    this.deadlineSwitch = page.getByRole("switch", { name: "마감일", exact: true })
    this.progressSwitch = page.getByRole("switch", { name: "진행률 표시", exact: true })
    this.incompleteCountSwitch = page.getByRole("switch", {
      name: "미완료 개수 표시",
      exact: true,
    })
    this.colorPickerButton = page.getByRole("button", {
      name: "그룹 색상 선택",
      exact: true,
    })
    this.saveGroupButton = page.getByRole("button", { name: "그룹 저장", exact: true })

    this.detailScreen = page.getByTestId("project-detail-screen").filter({ visible: true })
    this.settingsButton = this.detailScreen.getByRole("button", {
      name: "그룹 설정",
      exact: true,
    })
    this.statsMonthPicker = this.detailScreen.getByRole("button", {
      name: "통계 월 선택",
      exact: true,
    })
    this.taskListEmpty = this.detailScreen.getByTestId("task-list-empty")
    this.addTaskButton = this.detailScreen.getByRole("button", {
      name: "할 일 추가",
      exact: true,
    })
    this.backToListButton = this.detailScreen.getByRole("button", {
      name: "그룹 목록으로 돌아가기",
      exact: true,
    })

    this.settingsScreen = page.getByTestId("project-settings-screen").filter({ visible: true })
    this.settingsHeading = this.settingsScreen.getByRole("heading", {
      name: "그룹 설정",
      exact: true,
    })
    this.settingsSaveButton = this.settingsScreen.getByRole("button", {
      name: "그룹 설정 저장",
      exact: true,
    })
    this.settingsScroll = this.settingsScreen.getByTestId("project-settings-scroll")
    this.membersList = this.settingsScreen.getByRole("list", {
      name: "그룹 구성원 목록",
      exact: true,
    })
    this.createInviteCodeButton = this.settingsScreen.getByRole("button", {
      name: "초대 코드 생성",
      exact: true,
    })
    this.deleteProjectButton = this.settingsScreen.getByRole("button", {
      name: "프로젝트 삭제",
      exact: true,
    })
    this.backToDetailButton = this.settingsScreen.getByRole("button", {
      name: "그룹 상세로 돌아가기",
      exact: true,
    })
  }

  async goto(): Promise<void> {
    await this.page.goto("/")
    await this.groupsTab.waitFor({ state: "visible" })
    await this.groupsTab.click()
    await this.listScreen.waitFor({ state: "visible" })
  }

  groupOpenButton(name: string): Locator {
    return this.page.getByRole("button", {
      name: `${name} 그룹 열기`,
      exact: true,
    })
  }

  groupRow(name: string): Locator {
    return this.page
      .getByTestId(/^project-item-/)
      .filter({ has: this.groupOpenButton(name) })
      .filter({ visible: true })
  }

  detailHeading(name: string): Locator {
    return this.page.getByRole("heading", { name, exact: true })
  }

  deadlineInput(): Locator {
    return this.page.getByRole("textbox", { name: "마감일 날짜", exact: true })
  }

  colorDialog(): Locator {
    return this.page.getByRole("dialog", { name: "그룹 색상 선택", exact: true })
  }

  colorOption(index: number): Locator {
    return this.colorDialog().getByRole("button", {
      name: `색상 ${index + 1}`,
      exact: true,
    })
  }

  statsMonthDialog(): Locator {
    return this.page.getByRole("dialog", { name: "통계 월 선택", exact: true })
  }

  statsMonthOption(month: number): Locator {
    return this.statsMonthDialog().getByRole("button", {
      name: `${month}월`,
      exact: true,
    })
  }

  async toggleInviteInput(): Promise<void> {
    await this.inviteToggle.click()
  }

  async startAdding(): Promise<void> {
    await this.addButton.click()
    await this.addScreen.waitFor({ state: "visible" })
  }

  async createGroup(input: GroupInput): Promise<void> {
    await this.startAdding()
    await this.fillGroupForm(input)
    await this.saveGroupButton.click()
    await this.listScreen.waitFor({ state: "visible" })
    await expect.poll(() => this.revealGroupInList(input.name)).toBe(true)
  }

  async openGroup(name: string): Promise<void> {
    if (!(await this.revealGroupInList(name))) {
      throw new Error(`그룹 목록에서 "${name}"을 찾을 수 없습니다.`)
    }

    await this.groupOpenButton(name).click()
    await this.detailScreen.waitFor({ state: "visible" })
  }

  async openSettings(): Promise<void> {
    await this.settingsButton.click()
    await this.settingsScreen.waitFor({ state: "visible" })
  }

  async updateGroup(input: GroupInput): Promise<string> {
    await this.fillGroupForm(input)

    let message = ""
    const dialogPromise = this.page.waitForEvent("dialog").then(async (dialog) => {
      message = dialog.message()
      await dialog.accept()
    })

    await Promise.all([this.settingsSaveButton.click(), dialogPromise])
    return message
  }

  async createInviteCode(): Promise<string> {
    let message = ""
    const dialogPromise = this.page.waitForEvent("dialog").then(async (dialog) => {
      message = dialog.message()
      await dialog.accept()
    })

    await Promise.all([this.createInviteCodeButton.click(), dialogPromise])
    return message
  }

  async deleteOpenGroup(): Promise<string> {
    let message = ""
    const dialogPromise = this.page.waitForEvent("dialog").then(async (dialog) => {
      message = dialog.message()
      await dialog.accept()
    })

    await Promise.all([this.deleteProjectButton.click(), dialogPromise])
    await this.listScreen.waitFor({ state: "visible" })
    return message
  }

  async revealGroupInList(name: string): Promise<boolean> {
    const item = this.groupOpenButton(name)
    if ((await item.count()) > 0) return true

    // 가상화 목록을 무한히 찾지 않게 하기 위해 스크롤 횟수를 20번으로 제한
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const visibleRows = this.page.getByTestId(/^project-item-/).filter({ visible: true })
      if ((await visibleRows.count()) === 0) return false

      const lastRow = visibleRows.last()
      const lastTestIdBefore = await lastRow.getAttribute("data-testid")
      await lastRow.scrollIntoViewIfNeeded()
      await lastRow.hover()

      if ((await item.count()) > 0) return true

      const lastTestIdAfter = await visibleRows.last().getAttribute("data-testid")

      // 마지막 항목의 ID가 변하지 않으면 목록의 끝으로 간주
      if (lastTestIdAfter === lastTestIdBefore) return false
    }

    return false
  }

  private async fillGroupForm(input: GroupInput): Promise<void> {
    await this.groupNameInput.fill(input.name)

    if (input.memo !== undefined) {
      await this.memoInput.fill(input.memo)
    }
    if (input.colorIndex !== undefined) {
      await this.colorPickerButton.click()
      await this.colorOption(input.colorIndex).click()
    }

    await this.setSwitch(this.deadlineSwitch, input.showDeadline)
    if (input.showDeadline && input.deadline) {
      await this.deadlineInput().fill(this.dateInputValue(input.deadline))
      await this.deadlineInput().press("Tab")
    }
    await this.setSwitch(this.progressSwitch, input.showProgress)
    await this.setSwitch(this.incompleteCountSwitch, input.showIncompleteCount)
  }

  private async setSwitch(control: Locator, checked?: boolean): Promise<void> {
    if (checked === undefined) return
    if ((await control.isChecked()) !== checked) {
      await control.click()
    }
  }

  private dateInputValue(date: Date): string {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  }
}
