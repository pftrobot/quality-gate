import { expect } from "@playwright/test"
import { test as base } from "@/fixtures/pages.fixture"
import {
  deletePersonalScheduleByTestIdIfPresent,
  deletePersonalSchedulesIfPresent,
} from "@/utils/personalScheduleTestUtils"

type ScheduleTestIdCleanupHandle = {
  setTestId(testId: string): void
}

type PersonalScheduleCleanup = {
  registerTitle(title: string): void
  registerByTestId(input: {
    title: string
    previousLastTestId: string | null
  }): ScheduleTestIdCleanupHandle
}

type ScheduleTestIdCleanupTarget = {
  title: string
  previousLastTestId: string | null
  testId?: string
}

type ScheduleCompletionCleanup = {
  register(input: { title: string; date: Date; initiallyChecked: boolean }): void
}

type ScheduleCompletionCleanupTarget = {
  title: string
  date: Date
  initiallyChecked: boolean
}

export const test = base.extend<{
  personalScheduleCleanup: PersonalScheduleCleanup
  scheduleCompletionCleanup: ScheduleCompletionCleanup
}>({
  personalScheduleCleanup: [
    async ({ calendarPage, habitSettingsPage }, use) => {
      const titles = new Set<string>()
      const testIdTargets: ScheduleTestIdCleanupTarget[] = []

      const cleanup: PersonalScheduleCleanup = {
        registerTitle(title) {
          titles.add(title)
        },
        registerByTestId({ title, previousLastTestId }) {
          const target: ScheduleTestIdCleanupTarget = { title, previousLastTestId }
          testIdTargets.push(target)

          return {
            setTestId(testId) {
              target.testId = testId
            },
          }
        },
      }

      try {
        await use(cleanup)
      } finally {
        // 테스트 본문이 timeout 나도 Fixture teardown의 별도 시간 안에서 생성 데이터를 정리함
        for (const target of testIdTargets) {
          await deletePersonalScheduleByTestIdIfPresent(calendarPage, habitSettingsPage, target)
        }

        if (titles.size > 0) {
          await deletePersonalSchedulesIfPresent(calendarPage, habitSettingsPage, [...titles])
        }
      }
    },
    { timeout: 60_000 },
  ],
  scheduleCompletionCleanup: [
    async ({ calendarPage }, use) => {
      const targets: ScheduleCompletionCleanupTarget[] = []

      try {
        await use({
          register({ title, date, initiallyChecked }) {
            targets.push({ title, date: new Date(date), initiallyChecked })
          },
        })
      } finally {
        for (const { title, date, initiallyChecked } of targets) {
          await calendarPage.goto()
          await calendarPage.navigateToMonth(date)
          await calendarPage.selectDate(date)

          const checkbox = calendarPage.scheduleCheckbox(title)
          if ((await checkbox.isChecked()) !== initiallyChecked) {
            await checkbox.click()
          }
          await expect(checkbox).toBeChecked({ checked: initiallyChecked })
        }
      }
    },
    { timeout: 60_000 },
  ],
})
