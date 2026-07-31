import { expect } from "@playwright/test"
import { test as baseTest } from "@/fixtures/pages.fixture"
import { dismissDialogAndGetMessage } from "@/utils/dialogUtils"
import { deleteGroupIfPresent, uniqueGroupName } from "@/utils/groupTestUtils"

const test = baseTest.extend<{ testGroupName: string }>({
  // 모든 그룹 할 일 테스트가 서로 다른 그룹에서 실행되도록 test-scoped Fixture로 유지함
  // auto 옵션으로 테스트 인자에 Fixture를 명시하지 않아도 각 테스트마다 자동 실행된다
  testGroupName: [
    async ({ groupPage }, use, testInfo) => {
      const name = uniqueGroupName("e2e-group-task", testInfo)

      // use() 전: 테스트마다 독립적인 그룹을 만들고 상세 화면까지 준비한다.
      await groupPage.goto()
      await groupPage.createGroup({ name })
      await groupPage.openGroup(name)

      try {
        await use(name)
      } finally {
        // use() 후: 테스트 실패 여부와 관계없이 해당 테스트가 만든 그룹만 정리한다.
        await deleteGroupIfPresent(groupPage, name)
      }
    },
    { auto: true },
  ],
})

test.describe("그룹 할 일 추가 설정", () => {
  test("할 일 추가 화면에는 입력 항목과 기본 설정이 표시된다", async ({
    groupPage,
    groupTaskPage,
  }) => {
    await groupPage.addTaskButton.click()

    await expect(groupTaskPage.addHeading).toBeVisible()
    await expect(groupTaskPage.titleInput).toBeEditable()
    await expect(groupTaskPage.memoInput).toBeEditable()
    await expect(groupTaskPage.unassignedOption).toHaveAttribute("aria-selected", "true")
    await expect(groupTaskPage.startDateSwitch).not.toBeChecked()
    await expect(groupTaskPage.endDateSwitch).not.toBeChecked()
    await expect(groupTaskPage.dateInput("시작일")).toBeHidden()
    await expect(groupTaskPage.dateInput("마감일")).toBeHidden()
    await expect(groupTaskPage.recurrenceOption("반복 없음")).toHaveAttribute(
      "aria-selected",
      "true",
    )
  })

  test("날짜 사용 스위치를 켜면 시작일과 마감일 입력이 표시된다", async ({
    groupPage,
    groupTaskPage,
  }) => {
    await groupPage.addTaskButton.click()

    await groupTaskPage.startDateSwitch.click()
    await groupTaskPage.endDateSwitch.click()

    await expect(groupTaskPage.startDateSwitch).toBeChecked()
    await expect(groupTaskPage.endDateSwitch).toBeChecked()
    await expect(groupTaskPage.dateInput("시작일")).toBeVisible()
    await expect(groupTaskPage.dateInput("마감일")).toBeVisible()
  })

  test("할 일 색상을 선택하면 선택 상태가 변경되고 선택 창이 닫힌다", async ({
    groupPage,
    groupTaskPage,
  }) => {
    await groupPage.addTaskButton.click()
    await groupTaskPage.colorPickerButton.click()

    await expect(groupTaskPage.colorDialog()).toBeVisible()
    await expect(groupTaskPage.colorOption(0)).toHaveAttribute("aria-selected", "true")

    await groupTaskPage.colorOption(4).click()

    await expect(groupTaskPage.colorDialog()).toBeHidden()
    await groupTaskPage.colorPickerButton.click()
    await expect(groupTaskPage.colorOption(4)).toHaveAttribute("aria-selected", "true")
  })

  test("카테고리와 반복 옵션을 선택하면 선택 상태가 반영된다", async ({
    groupPage,
    groupTaskPage,
  }) => {
    await groupPage.addTaskButton.click()

    await groupTaskPage.categoryOption("청소").click()
    await groupTaskPage.recurrenceOption("매주").click()
    await groupTaskPage.weekdayOption("월").click()

    await expect(groupTaskPage.categoryOption("청소")).toHaveAttribute("aria-selected", "true")
    await expect(groupTaskPage.recurrenceOption("매주")).toHaveAttribute("aria-selected", "true")
    await expect(groupTaskPage.weekdayOption("월")).toHaveAttribute("aria-selected", "true")
  })

  for (const testCase of [
    {
      name: "매주 반복의 요일을 선택하지 않으면 안내 메시지가 표시된다",
      recurrence: "매주" as const,
      message: "반복할 요일을 선택해주세요.",
    },
    {
      name: "매달 반복의 날짜를 선택하지 않으면 안내 메시지가 표시된다",
      recurrence: "매달" as const,
      message: "반복할 날짜를 선택해주세요.",
    },
  ]) {
    test(testCase.name, async ({ groupPage, groupTaskPage, page }) => {
      await groupPage.addTaskButton.click()
      await groupTaskPage.recurrenceOption(testCase.recurrence).click()

      const message = await dismissDialogAndGetMessage(page, () => groupTaskPage.saveButton.click())

      expect(message).toContain(testCase.message)
      await expect(groupTaskPage.addScreen).toBeVisible()
    })
  }

  test("이모지를 검색해 선택하면 할 일에 선택 결과가 반영된다", async ({
    groupPage,
    groupTaskPage,
    page,
  }) => {
    await groupPage.addTaskButton.click()
    await groupTaskPage.emojiButton.click()

    const emojiPicker = page.getByRole("dialog")
    const searchInput = emojiPicker.getByPlaceholder("Search")
    await searchInput.fill("fire")

    const fireEmoji = emojiPicker.locator('[tabindex="0"]').filter({ hasText: /^🔥$/ })
    await expect(fireEmoji).toBeVisible()
    await fireEmoji.click()

    await expect(groupTaskPage.emojiButton).toContainText("🔥")
    await expect(searchInput).toBeHidden()
  })
})

test.describe("그룹 할 일 생성", () => {
  test("제목 없이 저장하면 기본 제목 '할 일'로 생성된다", async ({ groupPage, groupTaskPage }) => {
    await groupPage.addTaskButton.click()
    await groupTaskPage.createTask()

    await expect(groupPage.detailScreen).toBeVisible()
    await expect(groupTaskPage.taskOpenButton("할 일")).toBeVisible()
    await groupTaskPage.openTask("할 일")
    await expect(groupTaskPage.titleInput).toHaveValue("할 일")
  })

  test("입력한 제목, 메모, 카테고리로 할 일이 생성된다", async ({
    groupPage,
    groupTaskPage,
  }, testInfo) => {
    const title = uniqueGroupName("e2e-task-create", testInfo)
    const memo = "그룹 할 일 생성 테스트 메모"

    await groupPage.addTaskButton.click()
    await groupTaskPage.createTask({ title, memo, category: "청소" })

    await expect(groupTaskPage.taskOpenButton(title)).toBeVisible()
    await expect(groupTaskPage.taskRow(title)).toContainText(memo)
    await expect(groupTaskPage.taskRow(title)).toContainText("청소")

    await groupTaskPage.openTask(title)
    await expect(groupTaskPage.titleInput).toHaveValue(title)
    await expect(groupTaskPage.memoInput).toHaveValue(memo)
    await expect(groupTaskPage.categoryOption("청소")).toHaveAttribute("aria-selected", "true")
  })

  test("매일 반복 할 일을 확인하면 반복 작업으로 생성된다", async ({
    groupPage,
    groupTaskPage,
  }, testInfo) => {
    const title = uniqueGroupName("e2e-task-daily", testInfo)

    await groupPage.addTaskButton.click()
    await groupTaskPage.titleInput.fill(title)
    await groupTaskPage.recurrenceOption("매일").click()

    const message = await groupTaskPage.saveRecurringTask()

    expect(message).toContain("반복 작업 생성 확인")
    expect(message).toContain("반복: 매일")
    await expect(groupPage.detailScreen).toBeVisible()
    await expect(groupTaskPage.taskOpenButton(title)).toBeVisible()

    await groupTaskPage.openTask(title)
    await expect(groupTaskPage.recurrenceOption("매일")).toHaveAttribute("aria-selected", "true")
  })
})

test.describe("그룹 할 일 수정과 삭제", () => {
  test("할 일 제목과 메모를 수정하면 목록에 변경 내용이 반영된다", async ({
    groupPage,
    groupTaskPage,
  }, testInfo) => {
    const originalTitle = uniqueGroupName("e2e-task-edit", testInfo)
    const updatedTitle = `${originalTitle}-updated`
    const updatedMemo = "수정된 할 일 메모"

    await groupPage.addTaskButton.click()
    await groupTaskPage.createTask({ title: originalTitle })
    await groupTaskPage.openTask(originalTitle)

    await groupTaskPage.updateTask({ title: updatedTitle, memo: updatedMemo })

    await expect(groupPage.detailScreen).toBeVisible()
    await expect(groupTaskPage.taskOpenButton(originalTitle)).toHaveCount(0)
    await expect(groupTaskPage.taskOpenButton(updatedTitle)).toBeVisible()
    await expect(groupTaskPage.taskRow(updatedTitle)).toContainText(updatedMemo)
  })

  test("할 일 수정 화면에서 삭제하면 목록에서 제거된다", async ({
    groupPage,
    groupTaskPage,
  }, testInfo) => {
    const title = uniqueGroupName("e2e-task-delete", testInfo)

    await groupPage.addTaskButton.click()
    await groupTaskPage.createTask({ title })
    await groupTaskPage.openTask(title)

    const message = await groupTaskPage.deleteOpenTask()

    expect(message).toContain("이 작업을 삭제하시겠습니까?")
    await expect(groupPage.detailScreen).toBeVisible()
    await expect(groupTaskPage.taskOpenButton(title)).toHaveCount(0)
    await expect(groupPage.taskListEmpty).toBeVisible()
  })
})
