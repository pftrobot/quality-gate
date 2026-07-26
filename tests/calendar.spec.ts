import { expect, type TestInfo } from "@playwright/test"
import { test } from "../fixtures/pages.fixture"
import type { CalendarPage } from "../pages/CalendarPage"
import type { HabitSettingsPage, ScheduleRecurrence } from "../pages/HabitSettingsPage"

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

// 상세 패널을 열 때 선택할 날짜 (이전/다음달 경계값이 아닌 15일로 기본 지정)
const dateInCurrentMonth = (day = 15): Date => {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), day)
}

function addDays(date: Date, amount: number): Date {
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
  if (!(await habitSettingsPage.revealScheduleInList(title))) return

  await item.click()
  await habitSettingsPage.deleteOpenSchedule()
  await expect(item).toHaveCount(0)
}

test.beforeEach(async ({ calendarPage }) => {
  await calendarPage.goto()
})

// 1-1. 날짜 선택과 상세 일정 표시
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

// 1-2. 이전 달과 다음 달 이동
test("이전 달과 다음 달 버튼을 누르면 해당 월로 이동한다", async ({ calendarPage }) => {
  const currentMonth = dateInCurrentMonth(1)
  const previousMonth = addMonths(currentMonth, -1)

  await calendarPage.previousMonthButton.click()
  await expect(calendarPage.monthTitle(previousMonth)).toBeVisible()

  await calendarPage.nextMonthButton.click()
  await expect(calendarPage.monthTitle(currentMonth)).toBeVisible()
})

// 1-3. 오늘 날짜로 이동
test("Today 버튼을 누르면 오늘 날짜가 선택된다", async ({ calendarPage }) => {
  const today = new Date()
  const otherDay = today.getDate() === 15 ? 16 : 15

  await calendarPage.selectDate(dateInCurrentMonth(otherDay))
  await calendarPage.todayButton.click()

  await expect(calendarPage.selectedDateButton(today)).toBeVisible()
})

// 2-1. 상세 패널의 세 단계 및 표시된 상태의 패널 내용
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

// 2-2. expanded 상태에서의 패널 접기
test("전체 패널에서 일정 접기를 누르면 절반 상태로 돌아간다", async ({ calendarPage }) => {
  await calendarPage.selectDate(dateInCurrentMonth())
  await expect(calendarPage.detailPanelAt("half")).toBeVisible()
  await calendarPage.expandDetailPanel()
  await expect(calendarPage.detailPanelAt("expanded")).toBeVisible()
  await expect(calendarPage.nextMonthButton).toBeDisabled()

  await calendarPage.collapseScheduleButton.click()

  await expect(calendarPage.detailPanelAt("half")).toBeVisible()
})

// 2-3. 상세 패널의 날짜 이동 제스처
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

// 3. 그룹 필터 변경
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

// 4-1. 테스트가 생성한 내 일정의 완료 상태 변경
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

// 4-2. 사전에 준비된 팀 일정의 완료 상태 변경
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

// 5. 캘린더에서 내 일정 관리 화면으로 이동
test("상세 패널의 톱니 버튼을 누르면 내 일정 목록으로 이동한다", async ({
  calendarPage,
  habitSettingsPage,
}) => {
  await calendarPage.selectDate(dateInCurrentMonth())
  await calendarPage.openPersonalSchedule()

  await expect(habitSettingsPage.listHeading).toBeVisible()
  await expect(habitSettingsPage.addButton).toBeVisible()
})

// 6-1. 내 일정 추가 화면의 기본 상태
test("내 일정 추가 화면에는 입력 항목과 기본 설정이 표시된다", async ({
  calendarPage,
  habitSettingsPage,
}) => {
  await openPersonalSchedule(calendarPage, habitSettingsPage)
  await habitSettingsPage.startAdding()

  await expect(habitSettingsPage.addHeading).toBeVisible()
  await expect(habitSettingsPage.titleInput).toBeEditable()
  await expect(habitSettingsPage.emojiButton).toBeEnabled()
  await expect(habitSettingsPage.startDateSwitch).not.toBeChecked()
  await expect(habitSettingsPage.endDateSwitch).not.toBeChecked()
  await expect(habitSettingsPage.dateInput("시작일")).toBeHidden()
  await expect(habitSettingsPage.dateInput("마감일")).toBeHidden()
  await expect(habitSettingsPage.recurrenceOption("반복 없음")).toHaveAttribute(
    "aria-selected",
    "true",
  )
})

// 6-2. 시작일과 마감일 입력 활성화
test("날짜 사용 스위치를 켜면 시작일과 마감일 입력이 표시된다", async ({
  calendarPage,
  habitSettingsPage,
}) => {
  await openPersonalSchedule(calendarPage, habitSettingsPage)
  await habitSettingsPage.startAdding()

  await expect(habitSettingsPage.dateInput("시작일")).toBeHidden()
  await expect(habitSettingsPage.dateInput("마감일")).toBeHidden()

  await habitSettingsPage.startDateSwitch.click()
  await habitSettingsPage.endDateSwitch.click()
  await expect(habitSettingsPage.startDateSwitch).toBeChecked()
  await expect(habitSettingsPage.endDateSwitch).toBeChecked()
  await expect(habitSettingsPage.dateInput("시작일")).toBeVisible()
  await expect(habitSettingsPage.dateInput("마감일")).toBeVisible()
})

// 6-3. 주간 반복 요일 설정
test("반복을 매주로 변경하면 반복 요일을 선택할 수 있다", async ({
  calendarPage,
  habitSettingsPage,
}) => {
  await openPersonalSchedule(calendarPage, habitSettingsPage)
  await habitSettingsPage.startAdding()

  await habitSettingsPage.recurrenceOption("매주").click()
  await habitSettingsPage.weekdayOption("월").click()
  await expect(habitSettingsPage.recurrenceOption("매주")).toHaveAttribute("aria-selected", "true")
  await expect(habitSettingsPage.weekdayOption("월")).toHaveAttribute("aria-selected", "true")
})

test.describe("반복 설정의 캘린더 반영", () => {
  for (const recurrenceCase of recurrenceCalendarCases) {
    test(recurrenceCase.testName, async ({ calendarPage, habitSettingsPage }, testInfo) => {
      const title = uniqueTitle(recurrenceCase.titlePrefix, testInfo)

      try {
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
      } finally {
        await deletePersonalScheduleIfPresent(calendarPage, habitSettingsPage, title)
      }
    })
  }
})

// 6-4. 이모지 검색 및 선택
test("이모지를 검색해 선택하면 선택 결과가 반영되고 선택기가 닫힌다", async ({
  calendarPage,
  habitSettingsPage,
  page,
}) => {
  await openPersonalSchedule(calendarPage, habitSettingsPage)
  await habitSettingsPage.startAdding()

  await habitSettingsPage.emojiButton.click()

  const emojiPicker = page.getByRole("dialog")
  const searchInput = emojiPicker.getByPlaceholder("Search")

  await expect(searchInput).toBeVisible()
  await searchInput.fill("fire")

  // 이모지 항목에 role과 접근 가능한 이름이 없어 포커스 가능한 요소와 표시 텍스트를 임시 locator로 사용함
  const fireEmoji = emojiPicker.locator('[tabindex="0"]').filter({ hasText: /^🔥$/ })
  await expect(fireEmoji).toBeVisible()
  await fireEmoji.click()

  await expect(habitSettingsPage.emojiButton).toContainText("🔥")
  await expect(searchInput).toBeHidden()
})

// 6-5. 제목 입력 없이 저장했을 때 앱 기본값 적용
test("제목을 입력하지 않고 저장하면 기본 제목 '할 일'로 일정이 생성된다", async ({
  calendarPage,
  habitSettingsPage,
}) => {
  let createdTaskTestId: string | undefined

  try {
    await openPersonalSchedule(calendarPage, habitSettingsPage)

    const hasSchedulesBefore = (await habitSettingsPage.scheduleRows().count()) > 0
    const lastTaskTestIdBefore = hasSchedulesBefore
      ? await habitSettingsPage.lastScheduleRowTestId()
      : null

    // 일정 생성
    await habitSettingsPage.createSchedule()
    await expect(habitSettingsPage.listHeading).toBeVisible()

    let candidateTestId: string | null = null
    await expect
      .poll(async () => {
        try {
          candidateTestId = await habitSettingsPage.lastScheduleRowTestId()
        } catch {
          candidateTestId = null
        }
        return candidateTestId
      })
      .not.toBe(lastTaskTestIdBefore)

    if (candidateTestId === null) {
      throw new Error("새로 생성된 일정의 test ID를 확인할 수 없습니다.")
    }
    createdTaskTestId = candidateTestId

    // 생성된 일정 내용 확인
    await habitSettingsPage.scheduleEditButton(createdTaskTestId, "할 일").click()
    await expect(habitSettingsPage.editHeading).toBeVisible()
    await expect(habitSettingsPage.titleInput).toHaveValue("할 일")
  } finally {
    // 기본값 검증과 무관한 삭제는 cleanup으로만 수행
    if (createdTaskTestId !== undefined) {
      await calendarPage.goto()
      await openPersonalSchedule(calendarPage, habitSettingsPage)

      const createdTaskRow = habitSettingsPage.scheduleRow(createdTaskTestId)
      if ((await createdTaskRow.count()) > 0) {
        await habitSettingsPage.scheduleEditButton(createdTaskTestId, "할 일").click()
        await habitSettingsPage.deleteOpenSchedule()
      }
    }
  }
})

// 7-1. 내 일정 수정
test("내 일정 제목을 수정하면 변경된 제목이 목록에 반영된다", async ({
  calendarPage,
  habitSettingsPage,
}, testInfo) => {
  const originalTitle = uniqueTitle("e2e-edit", testInfo)
  const updatedTitle = `${originalTitle}-updated`

  try {
    await openPersonalSchedule(calendarPage, habitSettingsPage)
    await habitSettingsPage.createSchedule(originalTitle)
    await habitSettingsPage.openSchedule(originalTitle)
    await expect(habitSettingsPage.editHeading).toBeVisible()

    await habitSettingsPage.updateTitle(updatedTitle)

    await expect(habitSettingsPage.scheduleItem(originalTitle)).toHaveCount(0)
    await expect(habitSettingsPage.scheduleItem(updatedTitle)).toBeVisible()
  } finally {
    // 수정 도중 실패해도 원본과 수정된 제목을 모두 확인해 잔여 데이터를 삭제
    await deletePersonalScheduleIfPresent(calendarPage, habitSettingsPage, originalTitle)
    await deletePersonalScheduleIfPresent(calendarPage, habitSettingsPage, updatedTitle)
  }
})

// 7-2. 내 일정 삭제
test("내 일정을 삭제하면 목록에서 제거된다", async ({
  calendarPage,
  habitSettingsPage,
}, testInfo) => {
  const title = uniqueTitle("e2e-delete", testInfo)

  try {
    await openPersonalSchedule(calendarPage, habitSettingsPage)
    await habitSettingsPage.createSchedule(title)
    await habitSettingsPage.openSchedule(title)
    await expect(habitSettingsPage.editHeading).toBeVisible()

    const dialogMessage = await habitSettingsPage.deleteOpenSchedule()

    expect(dialogMessage).toContain(title)
    await expect(habitSettingsPage.scheduleItem(title)).toHaveCount(0)
  } finally {
    await deletePersonalScheduleIfPresent(calendarPage, habitSettingsPage, title)
  }
})
