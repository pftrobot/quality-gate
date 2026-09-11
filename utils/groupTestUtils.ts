import { expect, type TestInfo } from "@playwright/test"
import type { GroupPage } from "@/pages/GroupPage"

export function uniqueGroupName(prefix: string, testInfo: TestInfo): string {
  return `${prefix}-${Date.now()}-${testInfo.parallelIndex}`
}

// 테스트 실패 여부와 관계없이 테스트가 만든 그룹만 이름으로 찾아 정리
export async function deleteGroupsIfPresent(
  groupPage: GroupPage,
  names: readonly string[],
): Promise<void> {
  for (const name of new Set(names)) {
    // 이전 항목 삭제 후 유지된 가상 목록 스크롤 위치에 영향을 받지 않도록 매번 목록을 초기화한다.
    await groupPage.goto()

    if (!(await groupPage.revealGroupInList(name))) continue

    await groupPage.openGroup(name)
    await groupPage.openSettings()
    await groupPage.deleteOpenGroup()
    await expect(groupPage.groupOpenButton(name)).toHaveCount(0)
  }
}

export async function deleteGroupIfPresent(groupPage: GroupPage, name: string): Promise<void> {
  await deleteGroupsIfPresent(groupPage, [name])
}
