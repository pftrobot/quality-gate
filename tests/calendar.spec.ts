import { expect, type TestInfo } from "@playwright/test"
import { test } from "../fixtures/pages.fixture"
import type { CalendarPage } from "../pages/CalendarPage"
import type { HabitSettingsPage } from "../pages/HabitSettingsPage"

const TEAM_TASK_TITLE = process.env.TOIT_TEAM_TASK_TITLE
const TEAM_TASK_DATE = process.env.TOIT_TEAM_TASK_DATE

// 상세 패널을 열 때 선택할 날짜 (이전/다음달 경계값이 아닌 15일로 기본 지정)
const dateInCurrentMonth = (day = 15): Date => {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), day)
}

const addDays = (date: Date, amount: number): Date => {
  const result = new Date(date)
  result.setDate(result.getDate() + amount)
  return result
}

const addMonths = (date: Date, amount: number): Date =>
  new Date(date.getFullYear(), date.getMonth() + amount, 1)

// 고유 일정 제목 생성 (동시 테스트 중에도 테스트 데이터 제목이 충돌하지 않기 위함)
const uniqueTitle = (prefix: string, testInfo: TestInfo): string =>
  `${prefix}-${Date.now()}-${testInfo.parallelIndex}`

async function openPersonalSchedule(
  calendarPage: CalendarPage,
  habitSettingsPage: HabitSettingsPage,
): Promise<void> {
  await calendarPage.selectDate(dateInCurrentMonth()) // 톱니 버튼은 상세 패널이 열린 상태에서만 조작할 수 있기 때문에 우선 날짜를 선택하여 상세 패널을 엶
  await calendarPage.openPersonalSchedule()
  await expect(habitSettingsPage.listHeading).toBeVisible()
}

// 테스트 실패 여부와 관계없이 테스트 실행으로 만들어진 내 일정만 찾아 정리하는 helper
async function deletePersonalScheduleIfPresent(
  calendarPage: CalendarPage,
  habitSettingsPage: HabitSettingsPage,
  title: string,
): Promise<void> {
  await calendarPage.goto()
  await openPersonalSchedule(calendarPage, habitSettingsPage)

  const item = habitSettingsPage.scheduleItem(title)
  if ((await item.count()) === 0) return

  await item.click()
  await habitSettingsPage.deleteOpenSchedule()
  await expect(item).toHaveCount(0)
}

test.beforeEach(async ({ calendarPage }) => {
  await calendarPage.goto()
})

// 1. 날짜 선택과 상세 일정 표시
test("날짜를 선택하면 해당 날짜의 상세 일정 패널이 절반 상태로 열린다", async ({
  calendarPage,
}) => {
  const targetDate = dateInCurrentMonth()

  await expect(calendarPage.detailPanelAt("collapsed")).toBeVisible()

  await calendarPage.selectDate(targetDate)

  await expect(calendarPage.selectedDateButton(targetDate)).toBeVisible()
  await expect(calendarPage.detailPanelAt("half")).toBeVisible()
  await expect(calendarPage.detailDate(targetDate)).toBeVisible()
  await expect(calendarPage.progress).toBeVisible()
  await expect(calendarPage.personalScheduleSection).toBeVisible()
  await expect(calendarPage.teamScheduleSection).toBeVisible()
})

// 2. 상세 패널의 세 단계 및 표시된 상태의 패널 내용
test("상세 일정 패널은 접힘, 절반, 전체 상태로 전환되고 전체 상태에서는 월일이 표시된다", async ({
  calendarPage,
}) => {
  const targetDate = dateInCurrentMonth()

  await expect(calendarPage.detailPanelAt("collapsed")).toBeVisible()
  await calendarPage.selectDate(targetDate)
  await expect(calendarPage.detailPanelAt("half")).toBeVisible()
  await expect(calendarPage.fullStageDateContainer(targetDate)).toHaveCSS("opacity", "0")

  await calendarPage.expandDetailPanel()

  await expect(calendarPage.detailPanelAt("expanded")).toBeVisible()
  await expect(calendarPage.fullStageDateContainer(targetDate)).toHaveCSS("opacity", "1")
})

// 3. 월 이동과 expanded 상태에서의 패널 접기
test("이전 달과 다음 달로 이동하고 전체 패널에서 일정 접기를 누르면 절반 상태로 돌아간다", async ({
  calendarPage,
}) => {
  const currentMonth = dateInCurrentMonth(1)
  const previousMonth = addMonths(currentMonth, -1)

  await calendarPage.previousMonthButton.click()
  await expect(calendarPage.monthTitle(previousMonth)).toBeVisible()

  await calendarPage.nextMonthButton.click()
  await expect(calendarPage.monthTitle(currentMonth)).toBeVisible()

  await calendarPage.selectDate(dateInCurrentMonth())
  await calendarPage.expandDetailPanel()
  await expect(calendarPage.detailPanelAt("expanded")).toBeVisible()
  await expect(calendarPage.nextMonthButton).toBeDisabled()

  await calendarPage.collapseScheduleButton.click()

  await expect(calendarPage.detailPanelAt("half")).toBeVisible()
})

// 4. 상세 패널의 날짜 이동 제스처
test("상세 일정 패널을 좌우로 스와이프하면 다음 날과 이전 날로 이동한다", async ({
  calendarPage,
}) => {
  const targetDate = dateInCurrentMonth()
  const nextDate = addDays(targetDate, 1)

  await calendarPage.selectDate(targetDate)
  await expect(calendarPage.detailPanelAt("half")).toBeVisible()

  await calendarPage.swipeToNextDay()
  await expect(calendarPage.detailDate(nextDate)).toBeVisible()

  await calendarPage.swipeToPreviousDay()
  await expect(calendarPage.detailDate(targetDate)).toBeVisible()
})

// 5. 그룹 필터 변경
test("그룹 선택 목록에서 다른 그룹과 전체를 선택할 수 있다", async ({ calendarPage }) => {
  await calendarPage.openGroupSelector()
  const dialog = calendarPage.groupDialog()
  const options = dialog.getByRole("button")

  await expect(dialog).toBeVisible()
  // 테스트 계정에 그룹이 없으면 데이터 부족으로 이 테스트만 건너뛰기
  test.skip((await options.count()) < 2, "테스트 계정에 선택 가능한 그룹이 필요합니다.")

  const otherGroupName = (await options.nth(1).innerText()).trim()
  await options.nth(1).click()
  await expect(calendarPage.groupSelector).toHaveAccessibleName(`그룹 선택, ${otherGroupName}`)

  await calendarPage.openGroupSelector()
  await calendarPage.groupOption("전체").click()
  await expect(calendarPage.groupSelector).toHaveAccessibleName("그룹 선택, 전체")
})

// 6. 오늘 날짜로 바로 이동
test("Today 버튼을 누르면 오늘 날짜가 선택된다", async ({ calendarPage }) => {
  const today = new Date()
  const otherDay = today.getDate() === 15 ? 16 : 15

  await calendarPage.selectDate(dateInCurrentMonth(otherDay))
  await calendarPage.todayButton.click()

  await expect(calendarPage.selectedDateButton(today)).toBeVisible()
})

// 7-1. 테스트가 생성한 내 일정의 완료 상태 변경
test("내 일정은 완료와 완료 취소를 할 수 있다", async ({
  calendarPage,
  habitSettingsPage,
}, testInfo) => {
  const title = uniqueTitle("e2e-completion", testInfo)

  // Assertion이 실패해도 생성한 테스트 데이터가 남지 않도록 finally에서 삭제
  try {
    await openPersonalSchedule(calendarPage, habitSettingsPage)
    await habitSettingsPage.createSchedule(title)
    await expect(habitSettingsPage.scheduleItem(title)).toBeVisible()

    await habitSettingsPage.backButton.click()
    await calendarPage.selectDate(new Date())
    const checkbox = calendarPage.scheduleCheckbox(title)

    await expect(checkbox).not.toBeChecked()
    await checkbox.click()
    await expect(checkbox).toBeChecked()
    await checkbox.click()
    await expect(checkbox).not.toBeChecked()
  } finally {
    await deletePersonalScheduleIfPresent(calendarPage, habitSettingsPage, title)
  }
})

// 7-2. 사전에 준비된 팀 일정의 완료 상태 변경
test("팀 일정은 완료와 완료 취소를 할 수 있다", async ({ calendarPage }) => {
  test.skip(
    !TEAM_TASK_TITLE || !TEAM_TASK_DATE,
    "TOIT_TEAM_TASK_TITLE과 TOIT_TEAM_TASK_DATE 테스트 데이터가 필요합니다.",
  )

  const targetDate = new Date(`${TEAM_TASK_DATE}T00:00:00`)
  await calendarPage.navigateToMonth(targetDate)
  await calendarPage.selectDate(targetDate)

  const checkbox = calendarPage.scheduleCheckbox(TEAM_TASK_TITLE!)
  // 기존 상태 기억 (테스트가 끝날 때 테스트 전과 같은 상태인지 확인하기 위함)
  const initiallyChecked = await checkbox.isChecked()

  await checkbox.click()
  await expect(checkbox).toBeChecked({ checked: !initiallyChecked })
  await checkbox.click()
  await expect(checkbox).toBeChecked({ checked: initiallyChecked })
})

// 8. 캘린더에서 내 일정 관리 화면으로 이동
test("상세 패널의 톱니 버튼을 누르면 내 일정 목록으로 이동한다", async ({
  calendarPage,
  habitSettingsPage,
}) => {
  await calendarPage.selectDate(dateInCurrentMonth())
  await calendarPage.openPersonalSchedule()

  await expect(habitSettingsPage.listHeading).toBeVisible()
  await expect(habitSettingsPage.addButton).toBeVisible()
})
