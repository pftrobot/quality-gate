import { expect } from "@playwright/test"
import { test } from "@/fixtures/pages.fixture"
import {
  deletePersonalScheduleIfPresent,
  openPersonalSchedule,
  uniqueTitle,
} from "@/utils/personalScheduleTestUtils"

test.beforeEach(async ({ calendarPage, habitSettingsPage }) => {
  await calendarPage.goto()
  await openPersonalSchedule(calendarPage, habitSettingsPage)
})

test.describe("내 일정 추가 설정", () => {
  test("내 일정 추가 화면에는 입력 항목과 기본 설정이 표시된다", async ({ habitSettingsPage }) => {
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

  test("날짜 사용 스위치를 켜면 시작일과 마감일 입력이 표시된다", async ({ habitSettingsPage }) => {
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

  test("반복을 매주로 변경하면 반복 요일을 선택할 수 있다", async ({ habitSettingsPage }) => {
    await habitSettingsPage.startAdding()

    await habitSettingsPage.recurrenceOption("매주").click()
    await habitSettingsPage.weekdayOption("월").click()
    await expect(habitSettingsPage.recurrenceOption("매주")).toHaveAttribute(
      "aria-selected",
      "true",
    )
    await expect(habitSettingsPage.weekdayOption("월")).toHaveAttribute("aria-selected", "true")
  })
})

test("이모지를 검색해 선택하면 선택 결과가 반영되고 선택기가 닫힌다", async ({
  habitSettingsPage,
  page,
}) => {
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

test("제목을 입력하지 않고 저장하면 기본 제목 '할 일'로 일정이 생성된다", async ({
  calendarPage,
  habitSettingsPage,
}) => {
  let createdTaskTestId: string | undefined

  try {
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

test.describe("내 일정 수정/삭제", () => {
  test("내 일정 제목을 수정하면 변경된 제목이 목록에 반영된다", async ({
    calendarPage,
    habitSettingsPage,
  }, testInfo) => {
    const originalTitle = uniqueTitle("e2e-edit", testInfo)
    const updatedTitle = `${originalTitle}-updated`

    try {
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

  test("내 일정을 삭제하면 목록에서 제거된다", async ({
    calendarPage,
    habitSettingsPage,
  }, testInfo) => {
    const title = uniqueTitle("e2e-delete", testInfo)

    try {
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
})
