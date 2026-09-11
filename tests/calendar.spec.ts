import { expect } from "@playwright/test"
import { test } from "@/fixtures/personalSchedule.fixture"
import type { ScheduleRecurrence } from "@/pages/HabitSettingsPage"
import {
  dateInCurrentMonth,
  openPersonalSchedule,
  uniqueTitle,
} from "@/utils/personalScheduleTestUtils"

const TEAM_TASK_TITLE = process.env.TOIT_TEAM_TASK_TITLE
const TEAM_TASK_DATE = process.env.TOIT_TEAM_TASK_DATE
const todayAtTestStart = new Date()
todayAtTestStart.setHours(0, 0, 0, 0)

type RecurrenceCalendarCase = {
  testName: string
  titlePrefix: string
  recurrence: ScheduleRecurrence
  startDate?: Date
  endDate?: Date
  expectedDates: readonly Date[]
  excludedDates: readonly Date[]
}

const recurrenceCalendarCases: readonly RecurrenceCalendarCase[] = [
  {
    testName: "매일 반복 일정은 설정한 기간과 반복 규칙에 맞는 날짜에만 표시된다",
    titlePrefix: "e2e-daily",
    recurrence: { type: "매일" },
    startDate: new Date(2026, 6, 1),
    endDate: new Date(2026, 6, 5),
    expectedDates: [new Date(2026, 6, 1), new Date(2026, 6, 3), new Date(2026, 6, 5)],
    excludedDates: [new Date(2026, 5, 30), new Date(2026, 6, 6)],
  },
  {
    testName: "매주 반복 일정은 설정한 기간과 반복 규칙에 맞는 날짜에만 표시된다",
    titlePrefix: "e2e-weekly",
    recurrence: { type: "매주", weekdays: ["수", "토"] },
    startDate: new Date(2026, 6, 1),
    endDate: new Date(2026, 6, 20),
    expectedDates: [new Date(2026, 6, 1), new Date(2026, 6, 4), new Date(2026, 6, 18)],
    excludedDates: [new Date(2026, 5, 27), new Date(2026, 6, 2), new Date(2026, 6, 22)],
  },
  {
    testName: "매달 반복 일정은 설정한 기간과 반복 규칙에 맞는 날짜에만 표시된다",
    titlePrefix: "e2e-monthly",
    recurrence: { type: "매달", dayOfMonth: 14 },
    startDate: new Date(2026, 6, 1),
    endDate: new Date(2026, 8, 30),
    expectedDates: [new Date(2026, 6, 14), new Date(2026, 7, 14), new Date(2026, 8, 14)],
    excludedDates: [new Date(2026, 5, 14), new Date(2026, 6, 15), new Date(2026, 9, 14)],
  },
  {
    testName: "마감일이 없는 매일 반복 일정은 시작일로부터 1개월 동안 표시된다",
    titlePrefix: "e2e-daily-default-end",
    recurrence: { type: "매일" },
    startDate: new Date(2026, 6, 1),
    expectedDates: [new Date(2026, 6, 1), new Date(2026, 6, 15), new Date(2026, 7, 1)],
    excludedDates: [new Date(2026, 5, 30), new Date(2026, 7, 2)],
  },
  {
    testName: "마감일이 없는 매주 반복 일정은 시작일로부터 3개월 동안 표시된다",
    titlePrefix: "e2e-weekly-default-end",
    recurrence: { type: "매주", weekdays: ["수", "토"] },
    startDate: new Date(2026, 6, 1),
    expectedDates: [new Date(2026, 6, 1), new Date(2026, 6, 4), new Date(2026, 8, 30)],
    excludedDates: [new Date(2026, 5, 27), new Date(2026, 6, 2), new Date(2026, 9, 3)],
  },
  {
    testName: "마감일이 없는 매달 반복 일정은 시작일로부터 12개월 동안 표시된다",
    titlePrefix: "e2e-monthly-default-end",
    recurrence: { type: "매달", dayOfMonth: 14 },
    startDate: new Date(2026, 6, 1),
    expectedDates: [new Date(2026, 6, 14), new Date(2027, 0, 14), new Date(2027, 5, 14)],
    excludedDates: [new Date(2026, 5, 14), new Date(2026, 6, 15), new Date(2027, 6, 14)],
  },
  {
    testName: "시작일이 없는 매일 반복 일정은 오늘부터 표시된다",
    titlePrefix: "e2e-daily-default-start",
    recurrence: { type: "매일" },
    endDate: addDays(todayAtTestStart, 4),
    expectedDates: [todayAtTestStart, addDays(todayAtTestStart, 2), addDays(todayAtTestStart, 4)],
    excludedDates: [addDays(todayAtTestStart, -1), addDays(todayAtTestStart, 5)],
  },
]

function addDays(date: Date, amount: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + amount)
  return result
}

const addMonths = (date: Date, amount: number): Date =>
  new Date(date.getFullYear(), date.getMonth() + amount, 1)

test.beforeEach(async ({ calendarPage }) => {
  await calendarPage.goto()
})

test.describe("캘린더 날짜 이동", () => {
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

  test("이전 달과 다음 달 버튼을 누르면 해당 월로 이동한다", async ({ calendarPage }) => {
    const currentMonth = dateInCurrentMonth(1)
    const previousMonth = addMonths(currentMonth, -1)

    await calendarPage.previousMonthButton.click()
    await expect(calendarPage.monthTitle(previousMonth)).toBeVisible()

    await calendarPage.nextMonthButton.click()
    await expect(calendarPage.monthTitle(currentMonth)).toBeVisible()
  })

  test("Today 버튼을 누르면 오늘 날짜가 선택된다", async ({ calendarPage }) => {
    const today = new Date()
    const otherDay = today.getDate() === 15 ? 16 : 15

    await calendarPage.selectDate(dateInCurrentMonth(otherDay))
    await calendarPage.selectToday()

    await expect(calendarPage.selectedDateButton(today)).toBeVisible()
  })
})

test.describe("상세 일정 패널", () => {
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

  test("전체 패널에서 일정 접기를 누르면 절반 상태로 돌아간다", async ({ calendarPage }) => {
    await calendarPage.selectDate(dateInCurrentMonth())
    await expect(calendarPage.detailPanelAt("half")).toBeVisible()
    await calendarPage.expandDetailPanel()
    await expect(calendarPage.detailPanelAt("expanded")).toBeVisible()
    await expect(calendarPage.nextMonthButton).toBeDisabled()

    await calendarPage.collapseDetailPanel()

    await expect(calendarPage.detailPanelAt("half")).toBeVisible()
  })

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
})

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

test.describe("일정 완료 상태", () => {
  test("내 일정은 완료와 완료 취소를 할 수 있다", async ({
    calendarPage,
    habitSettingsPage,
    personalScheduleCleanup,
  }, testInfo) => {
    const title = uniqueTitle("e2e-completion", testInfo)
    personalScheduleCleanup.registerTitle(title)

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
  })

  test("팀 일정은 완료와 완료 취소를 할 수 있다", async ({
    calendarPage,
    scheduleCompletionCleanup,
  }) => {
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
    scheduleCompletionCleanup.register({
      title: TEAM_TASK_TITLE!,
      date: targetDate,
      initiallyChecked,
    })

    await checkbox.click()
    await expect(checkbox).toBeChecked({ checked: !initiallyChecked })
  })
})

test("상세 패널의 톱니 버튼을 누르면 내 일정 목록으로 이동한다", async ({
  calendarPage,
  habitSettingsPage,
}) => {
  await calendarPage.selectDate(dateInCurrentMonth())
  await calendarPage.openPersonalSchedule()

  await expect(habitSettingsPage.listHeading).toBeVisible()
  await expect(habitSettingsPage.addButton).toBeVisible()
})

test.describe("반복 설정의 캘린더 반영", () => {
  for (const recurrenceCase of recurrenceCalendarCases) {
    test(
      recurrenceCase.testName,
      async ({ calendarPage, habitSettingsPage, personalScheduleCleanup }, testInfo) => {
        const title = uniqueTitle(recurrenceCase.titlePrefix, testInfo)
        personalScheduleCleanup.registerTitle(title)

        await openPersonalSchedule(calendarPage, habitSettingsPage)
        await habitSettingsPage.createRecurringSchedule({
          title,
          startDate: recurrenceCase.startDate,
          endDate: recurrenceCase.endDate,
          recurrence: recurrenceCase.recurrence,
        })
        await expect(habitSettingsPage.listHeading).toBeVisible()

        await habitSettingsPage.backButton.click()

        for (const date of recurrenceCase.expectedDates) {
          await calendarPage.navigateToMonth(date)
          await calendarPage.selectDate(date)
          await expect(calendarPage.scheduleCheckbox(title)).toBeVisible()
        }

        for (const date of recurrenceCase.excludedDates) {
          await calendarPage.navigateToMonth(date)
          await calendarPage.selectDate(date)
          await expect(calendarPage.scheduleCheckbox(title)).toHaveCount(0)
        }
      },
    )
  }
})
