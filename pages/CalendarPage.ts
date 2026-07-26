import type { Locator, Page } from "@playwright/test"

// 캘린더 상세 패널이 가질 수 있는 화면 상태
export type CalendarSheetStage = "collapsed" | "half" | "expanded"

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"] as const

/** 캘린더 화면의 Locator와 사용자 행동을 담당하는 Page */
export class CalendarPage {
  // 여러 테스트에서 반복 사용하는 고정 Locator
  readonly calendarTab: Locator
  readonly loadingIndicator: Locator
  readonly previousMonthButton: Locator
  readonly nextMonthButton: Locator
  readonly collapseScheduleButton: Locator
  readonly todayButton: Locator
  readonly groupSelector: Locator
  readonly progress: Locator
  readonly personalScheduleSection: Locator
  readonly teamScheduleSection: Locator
  readonly managePersonalScheduleButton: Locator

  private readonly page: Page

  constructor(page: Page) {
    this.page = page
    this.calendarTab = page.getByRole("tab", { name: /Calendar$/ })
    this.loadingIndicator = page.getByRole("progressbar", { name: "달력 불러오는 중" })
    this.previousMonthButton = page.getByRole("button", { name: "이전 달" })
    this.nextMonthButton = page.getByRole("button", { name: "다음 달" })
    this.collapseScheduleButton = page.getByRole("button", { name: "일정 접기" })
    this.todayButton = page.getByRole("button", { name: "Today", exact: true })
    this.groupSelector = page.getByRole("button", { name: /^그룹 선택,/ })
    this.progress = page.getByText(/^전체 진행률 \d+%$/)
    this.personalScheduleSection = page.getByText("내 일정", { exact: true })
    this.teamScheduleSection = page.getByText("팀 일정", { exact: true })
    this.managePersonalScheduleButton = page.getByRole("button", {
      name: "내 일정 설정",
    })
  }

  async goto(): Promise<void> {
    await this.page.goto("/")

    // 인증 상태 복원과 Firestore 데이터 로딩이 끝난 뒤 테스트 시작
    await this.calendarTab.waitFor({ state: "visible" })
    await this.loadingIndicator.waitFor({ state: "hidden" })
    await this.detailPanel.waitFor({ state: "visible" })
  }

  get detailPanel(): Locator {
    // 상세 패널 상태에 따라 testID가 바뀌므로 공통 텍스트로 현재 요소를 찾아야 함
    return this.page.locator('[data-testid^="calendar-detail-panel-"]')
  }

  // 상세 패널 상태 확인
  detailPanelAt(stage: CalendarSheetStage): Locator {
    return this.page.getByTestId(`calendar-detail-panel-${stage}`)
  }

  dateButton(date: Date): Locator {
    return this.page.getByRole("button", {
      name: this.fullDateLabel(date), // yyyy년 M월 d일
      exact: true,
    })
  }

  selectedDateButton(date: Date): Locator {
    return this.dateButton(date).and(this.page.locator('[aria-selected="true"]')).first()
  }

  detailDate(date: Date): Locator {
    return this.page.getByText(this.detailDateLabel(date), { exact: true })
  }

  fullStageDateContainer(date: Date): Locator {
    // TODO: opacity로 교체하는 전체 단계 날짜 영역에 testID가 추가되면 부모 탐색 locator 제거
    return this.page.getByText(this.shortDateLabel(date), { exact: true }).locator("..")
  }

  monthTitle(date: Date): Locator {
    return this.page.getByRole("button", {
      name: `${date.getFullYear()}년 ${date.getMonth() + 1}월, 월 선택`,
      exact: true,
    })
  }

  groupDialog(): Locator {
    return this.page.getByRole("dialog", { name: "그룹 선택" })
  }

  groupOption(name: string): Locator {
    // 그룹 선택 dialog 내부로 범위 제한
    return this.groupDialog().getByRole("button", { name, exact: true })
  }

  scheduleCheckbox(title: string): Locator {
    return this.page.getByRole("checkbox", { name: `${title} 완료`, exact: true })
  }

  async selectDate(date: Date): Promise<void> {
    const candidates = this.dateButton(date)
    const viewport = this.page.viewportSize()

    // 이전/현재/다음 달 패널이 DOM에 동시에 존재하므로 실제 viewport 안의 날짜만 클릭
    for (let index = 0; index < (await candidates.count()); index += 1) {
      const candidate = candidates.nth(index)
      const box = await candidate.boundingBox()
      const isInViewport =
        box &&
        viewport &&
        box.x + box.width / 2 >= 0 &&
        box.x + box.width / 2 <= viewport.width &&
        box.y + box.height / 2 >= 0 &&
        box.y + box.height / 2 <= viewport.height

      if (isInViewport) {
        await candidate.click()
        return
      }
    }

    throw new Error(`${this.fullDateLabel(date)} 날짜가 현재 달력 화면에 표시되지 않았습니다.`)
  }

  async navigateToMonth(target: Date): Promise<void> {
    const targetMonthIndex = target.getFullYear() * 12 + target.getMonth()

    for (let attempt = 0; attempt < 24; attempt += 1) {
      const currentMonth = await this.visibleMonth()
      const currentMonthIndex = currentMonth.getFullYear() * 12 + currentMonth.getMonth()

      if (currentMonthIndex === targetMonthIndex) return

      const direction = currentMonthIndex < targetMonthIndex ? 1 : -1
      const nextMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + direction, 1)
      const button = direction === 1 ? this.nextMonthButton : this.previousMonthButton

      await button.click()
      await this.monthTitle(nextMonth).waitFor({ state: "visible" })
    }

    throw new Error(`${target.getFullYear()}년 ${target.getMonth() + 1}월로 이동하지 못했습니다.`)
  }

  async expandDetailPanel(): Promise<void> {
    // 화면 높이와 관계없이 패널을 상단 근처까지 충분히 드래그해 expanded 상태로 전환
    await this.dragDetailPanel({ targetY: 24 })
  }

  async swipeToNextDay(): Promise<void> {
    await this.dragDetailPanel({ deltaX: -120 })
  }

  async swipeToPreviousDay(): Promise<void> {
    await this.dragDetailPanel({ deltaX: 120 })
  }

  async openGroupSelector(): Promise<void> {
    await this.groupSelector.click()
  }

  async openPersonalSchedule(): Promise<void> {
    await this.managePersonalScheduleButton.click()
  }

  fullDateLabel(date: Date): string {
    return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일` // 2026년 1월 1일
  }

  detailDateLabel(date: Date): string {
    return `${this.fullDateLabel(date)} (${WEEKDAYS[date.getDay()]})`
  }

  shortDateLabel(date: Date): string {
    return `${date.getMonth() + 1}월 ${date.getDate()}일 (${WEEKDAYS[date.getDay()]})` // 1월 1일 (수)
  }

  private async dragDetailPanel({
    deltaX = 0,
    deltaY = 0,
    targetY,
  }: {
    deltaX?: number
    deltaY?: number
    targetY?: number
  }): Promise<void> {
    const panel = this.detailPanel

    // 상태 전환 애니메이션이 끝난 뒤 좌표를 계산하도록 actionability의 stable 검사 이용
    await panel.hover({ position: { x: 24, y: 24 } })
    const box = await panel.boundingBox()

    if (!box) {
      throw new Error("캘린더 상세 패널의 위치를 확인할 수 없습니다.")
    }

    const startX = box.x + box.width / 2
    // 패널 상단의 드래그 핸들 영역에서 제스처 시작
    const startY = box.y + Math.min(24, box.height / 2)
    const endY = targetY ?? startY + deltaY

    await this.page.mouse.move(startX, startY)
    await this.page.mouse.down()
    await this.page.mouse.move(startX + deltaX, endY, { steps: 12 })
    await this.page.mouse.up()
  }

  private async visibleMonth(): Promise<Date> {
    const title = this.page
      .getByRole("button", {
        name: /^\d{4}년 \d{1,2}월, 월 선택$/,
      })
      .filter({ visible: true })
      .first()
    const label = await title.evaluate(
      (element) => element.getAttribute("aria-label") ?? element.textContent?.trim() ?? "",
    )
    const match = label.match(/^(\d{4})년 (\d{1,2})월/)

    if (!match) {
      throw new Error(`현재 캘린더 월을 확인할 수 없습니다: ${label}`)
    }

    return new Date(Number(match[1]), Number(match[2]) - 1, 1)
  }
}
