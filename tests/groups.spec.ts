import { expect } from "@playwright/test"
import { test } from "@/fixtures/group.fixture"
import { dismissDialogAndGetMessage } from "@/utils/dialogUtils"
import { uniqueGroupName } from "@/utils/groupTestUtils"

test.beforeEach(async ({ groupPage }) => {
  await groupPage.goto()
})

test.describe("그룹 목록", () => {
  test("Groups 탭을 선택하면 그룹 목록과 주요 동작이 표시된다", async ({ groupPage }) => {
    await expect(groupPage.groupsTab).toHaveAttribute("aria-selected", "true")
    await expect(groupPage.listHeading).toBeVisible()
    await expect(groupPage.addButton).toBeEnabled()
    await expect(groupPage.inviteToggle).toHaveAttribute("aria-expanded", "false")
  })

  test("초대 코드 입력 버튼으로 참여 입력 영역을 열고 닫을 수 있다", async ({ groupPage }) => {
    await expect(groupPage.inviteCodeInput).toBeHidden()

    await groupPage.toggleInviteInput()

    await expect(groupPage.inviteToggle).toHaveAttribute("aria-expanded", "true")
    await expect(groupPage.inviteCodeInput).toBeEditable()
    await expect(groupPage.joinByInviteButton).toBeEnabled()

    await groupPage.toggleInviteInput()

    await expect(groupPage.inviteToggle).toHaveAttribute("aria-expanded", "false")
    await expect(groupPage.inviteCodeInput).toBeHidden()
  })

  test("초대 코드를 입력하지 않고 참여하면 안내 메시지가 표시된다", async ({ groupPage, page }) => {
    await groupPage.toggleInviteInput()

    const message = await dismissDialogAndGetMessage(page, () =>
      groupPage.joinByInviteButton.click(),
    )

    expect(message).toContain("초대 코드를 입력해주세요.")
    await expect(groupPage.listScreen).toBeVisible()
  })
})

test.describe("그룹 추가 설정", () => {
  test("새 그룹 화면에는 입력 항목과 기본 설정이 표시된다", async ({ groupPage }) => {
    await groupPage.startAdding()

    await expect(groupPage.addHeading).toBeVisible()
    await expect(groupPage.groupNameInput).toBeEditable()
    await expect(groupPage.memoInput).toBeEditable()
    await expect(groupPage.deadlineSwitch).not.toBeChecked()
    await expect(groupPage.progressSwitch).not.toBeChecked()
    await expect(groupPage.incompleteCountSwitch).not.toBeChecked()
    await expect(groupPage.deadlineInput()).toBeHidden()
    await expect(groupPage.saveGroupButton).toBeEnabled()
  })

  test("마감일 스위치를 켜면 날짜 입력이 표시되고 끄면 숨겨진다", async ({ groupPage }) => {
    await groupPage.startAdding()

    await groupPage.deadlineSwitch.click()
    await expect(groupPage.deadlineSwitch).toBeChecked()
    await expect(groupPage.deadlineInput()).toBeVisible()

    await groupPage.deadlineSwitch.click()
    await expect(groupPage.deadlineSwitch).not.toBeChecked()
    await expect(groupPage.deadlineInput()).toBeHidden()
  })

  test("그룹 색상을 선택하면 선택 상태가 변경되고 선택 창이 닫힌다", async ({ groupPage }) => {
    await groupPage.startAdding()
    await groupPage.colorPickerButton.click()

    await expect(groupPage.colorDialog()).toBeVisible()
    await expect(groupPage.colorOption(0)).toHaveAttribute("aria-selected", "true")

    await groupPage.colorOption(3).click()

    await expect(groupPage.colorDialog()).toBeHidden()
    await groupPage.colorPickerButton.click()
    await expect(groupPage.colorOption(3)).toHaveAttribute("aria-selected", "true")
  })

  test("그룹 이름을 입력하지 않고 저장하면 안내 메시지가 표시된다", async ({ groupPage, page }) => {
    await groupPage.startAdding()

    const message = await dismissDialogAndGetMessage(page, () => groupPage.saveGroupButton.click())

    expect(message).toContain("그룹 이름을 입력해주세요.")
    await expect(groupPage.addScreen).toBeVisible()
  })

  test("그룹 추가를 취소하면 저장하지 않고 목록으로 돌아간다", async ({ groupPage }, testInfo) => {
    const name = uniqueGroupName("e2e-cancel-group", testInfo)

    await groupPage.startAdding()
    await groupPage.groupNameInput.fill(name)
    await groupPage.addCancelButton.click()

    await expect(groupPage.listScreen).toBeVisible()
    await expect(groupPage.groupOpenButton(name)).toHaveCount(0)
  })
})

test.describe("그룹 생성과 상세", () => {
  test("그룹을 생성하면 목록과 상세 화면에 저장한 정보가 표시된다", async ({
    groupCleanup,
    groupPage,
  }, testInfo) => {
    const name = uniqueGroupName("e2e-create-group", testInfo)
    const memo = "그룹 생성 테스트 메모"
    groupCleanup.registerName(name)

    await groupPage.createGroup({
      name,
      memo,
      colorIndex: 2,
      showDeadline: true,
      deadline: new Date(2026, 11, 31),
      showProgress: true,
      showIncompleteCount: true,
    })

    await expect(groupPage.groupOpenButton(name)).toBeVisible()
    await expect(groupPage.groupRow(name)).toContainText(memo)
    await expect(groupPage.groupRow(name)).toContainText(/마감일 2026\. 12\. 31\./)
    await expect(groupPage.groupRow(name)).toContainText("진행률 0% (0/0)")
    await expect(groupPage.groupRow(name)).toContainText("미완료 0개")
    await expect(groupPage.groupRow(name)).toContainText("구성원 1명")

    await groupPage.openGroup(name)

    await expect(groupPage.detailHeading(name)).toBeVisible()
    await expect(groupPage.statsMonthPicker).toHaveAttribute("aria-expanded", "false")
    await expect(groupPage.taskListEmpty).toContainText("아직 작업이 없습니다")
    await expect(groupPage.addTaskButton).toBeEnabled()
  })

  test("통계 월 선택 창에서 다른 월을 선택하면 상세 화면에 반영된다", async ({
    groupCleanup,
    groupPage,
  }, testInfo) => {
    const name = uniqueGroupName("e2e-stats-month", testInfo)
    const now = new Date()
    const targetMonth = now.getMonth() === 0 ? 2 : 1
    groupCleanup.registerName(name)

    await groupPage.createGroup({ name })
    await groupPage.openGroup(name)
    await groupPage.statsMonthPicker.click()

    await expect(groupPage.statsMonthDialog()).toBeVisible()
    await expect(groupPage.statsMonthOption(now.getMonth() + 1)).toHaveAttribute(
      "aria-selected",
      "true",
    )

    await groupPage.statsMonthOption(targetMonth).click()

    await expect(groupPage.statsMonthDialog()).toBeHidden()
    await expect(groupPage.statsMonthPicker).toContainText(`${targetMonth}월`)
  })
})

test.describe("그룹 설정", () => {
  test("그룹 설정을 수정하면 상세와 목록에 변경 내용이 반영된다", async ({
    groupCleanup,
    groupPage,
  }, testInfo) => {
    const originalName = uniqueGroupName("e2e-edit-group", testInfo)
    const updatedName = `${originalName}-updated`
    const updatedMemo = "수정된 그룹 메모"
    groupCleanup.registerName(originalName)
    groupCleanup.registerName(updatedName)

    await groupPage.createGroup({ name: originalName })
    await groupPage.openGroup(originalName)
    await groupPage.openSettings()

    await expect(groupPage.settingsHeading).toBeVisible()
    await expect(groupPage.groupNameInput).toHaveValue(originalName)
    await expect(groupPage.membersList.getByRole("listitem")).toHaveCount(1)
    await expect(groupPage.membersList).toContainText("생성자")

    const message = await groupPage.updateGroup({
      name: updatedName,
      memo: updatedMemo,
      colorIndex: 4,
      showProgress: true,
      showIncompleteCount: true,
    })

    expect(message).toContain("그룹 설정이 저장되었습니다.")
    await groupPage.backToDetailButton.click()
    await expect(groupPage.detailHeading(updatedName)).toBeVisible()
    await groupPage.backToListButton.click()
    await expect(groupPage.groupOpenButton(updatedName)).toBeVisible()
    await expect(groupPage.groupRow(updatedName)).toContainText(updatedMemo)
    await expect(groupPage.groupOpenButton(originalName)).toHaveCount(0)
  })

  test("초대 코드를 생성하면 코드가 표시된다", async ({ groupCleanup, groupPage }, testInfo) => {
    test.fixme(true, "서비스의 초대 코드 생성 오류가 해결된 후 다시 활성화합니다.")

    const name = uniqueGroupName("e2e-invite-code", testInfo)
    groupCleanup.registerName(name)

    await groupPage.createGroup({ name })
    await groupPage.openGroup(name)
    await groupPage.openSettings()

    // 설정 화면 진입 시 활성 초대 코드를 먼저 조회하거나 생성함
    await expect(groupPage.settingsScreen).toContainText(/코드: [A-Z0-9]+/)
    const message = await groupPage.createInviteCode()

    expect(message).toMatch(/현재 초대 코드: [A-Z0-9]+/)
    await expect(groupPage.settingsScreen).toContainText(/코드: [A-Z0-9]+/)
  })

  test("프로젝트 삭제를 확인하면 그룹과 그룹 데이터가 목록에서 제거된다", async ({
    groupCleanup,
    groupPage,
  }, testInfo) => {
    const name = uniqueGroupName("e2e-delete-group", testInfo)
    groupCleanup.registerName(name)

    await groupPage.createGroup({ name })
    await groupPage.openGroup(name)
    await groupPage.openSettings()

    const message = await groupPage.deleteOpenGroup()

    expect(message).toContain("모든 작업이 함께 삭제됩니다.")
    await expect(groupPage.groupOpenButton(name)).toHaveCount(0)
  })
})
