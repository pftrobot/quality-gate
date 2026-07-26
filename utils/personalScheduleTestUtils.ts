import { expect, type TestInfo } from "@playwright/test"
import type { CalendarPage } from "@/pages/CalendarPage"
import type { HabitSettingsPage } from "@/pages/HabitSettingsPage"

// 상세 패널을 열 때 선택할 날짜 (이전/다음 달 경계값이 아닌 15일로 기본 지정)
export function dateInCurrentMonth(day = 15): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), day)
}

// 동시 테스트 중에도 테스트 데이터 제목이 충돌하지 않도록 고유한 제목 생성
export function uniqueTitle(prefix: string, testInfo: TestInfo): string {
  return `${prefix}-${Date.now()}-${testInfo.parallelIndex}`
}

export async function openPersonalSchedule(
  calendarPage: CalendarPage,
  habitSettingsPage: HabitSettingsPage,
): Promise<void> {
  // 톱니 버튼은 상세 패널이 열린 상태에서만 조작할 수 있으므로 먼저 날짜 선택
  await calendarPage.selectDate(dateInCurrentMonth())
  await calendarPage.openPersonalSchedule()
  await expect(habitSettingsPage.listHeading).toBeVisible()
}

// 테스트 실패 여부와 관계없이 테스트가 생성한 내 일정만 찾아 정리
export async function deletePersonalScheduleIfPresent(
  calendarPage: CalendarPage,
  habitSettingsPage: HabitSettingsPage,
  title: string,
): Promise<void> {
  await deletePersonalSchedulesIfPresent(calendarPage, habitSettingsPage, [title])
}

export async function deletePersonalSchedulesIfPresent(
  calendarPage: CalendarPage,
  habitSettingsPage: HabitSettingsPage,
  titles: readonly string[],
): Promise<void> {
  await calendarPage.goto()
  await openPersonalSchedule(calendarPage, habitSettingsPage)

  for (const title of new Set(titles)) {
    const item = habitSettingsPage.scheduleItem(title)
    if (!(await habitSettingsPage.revealScheduleInList(title))) continue

    await item.click()
    await habitSettingsPage.deleteOpenSchedule()
    await expect(item).toHaveCount(0)
  }
}

// 제목이 중복될 수 있는 일정을 test ID로 찾아 삭제
// 본 검증에서 ID를 얻지 못한 경우에는 저장 전 마지막 ID와 현재 마지막 ID를 비교해 생성 항목을 다시 식별함
export async function deletePersonalScheduleByTestIdIfPresent(
  calendarPage: CalendarPage,
  habitSettingsPage: HabitSettingsPage,
  {
    testId,
    previousLastTestId,
    title,
  }: {
    testId?: string
    previousLastTestId: string | null
    title: string
  },
): Promise<void> {
  await calendarPage.goto()
  await openPersonalSchedule(calendarPage, habitSettingsPage)

  let cleanupTestId = testId

  if (cleanupTestId === undefined) {
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
      .not.toBe(previousLastTestId)

    cleanupTestId = candidateTestId ?? undefined
  }

  if (cleanupTestId === undefined) return
  if (!(await habitSettingsPage.revealScheduleRowInList(cleanupTestId))) return

  const row = habitSettingsPage.scheduleRow(cleanupTestId)
  const editButton = habitSettingsPage.scheduleEditButton(cleanupTestId, title)

  if ((await editButton.count()) === 0) {
    throw new Error(`cleanup 대상 일정의 제목을 확인할 수 없습니다: ${cleanupTestId}`)
  }

  await editButton.click()
  await habitSettingsPage.deleteOpenSchedule()
  await expect(row).toHaveCount(0)
}
