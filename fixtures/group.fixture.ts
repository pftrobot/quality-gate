import { test as base } from "@/fixtures/pages.fixture"
import { deleteGroupsIfPresent } from "@/utils/groupTestUtils"

type GroupCleanup = {
  registerName(name: string): void
}

export const test = base.extend<{ groupCleanup: GroupCleanup }>({
  groupCleanup: [
    async ({ groupPage }, use) => {
      const names = new Set<string>()

      try {
        await use({
          registerName(name) {
            names.add(name)
          },
        })
      } finally {
        if (names.size > 0) {
          await deleteGroupsIfPresent(groupPage, [...names])
        }
      }
    },
    { timeout: 90_000 },
  ],
})
