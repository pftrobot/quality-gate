import { test as base } from "@playwright/test"
import { CalendarPage } from "@/pages/CalendarPage"
import { GroupPage } from "@/pages/GroupPage"
import { GroupTaskPage } from "@/pages/GroupTaskPage"
import { HabitSettingsPage } from "@/pages/HabitSettingsPage"
import { LoginPage } from "@/pages/LoginPage"

type MyFixtures = {
  calendarPage: CalendarPage
  groupPage: GroupPage
  groupTaskPage: GroupTaskPage
  habitSettingsPage: HabitSettingsPage
  loginPage: LoginPage
}

export const test = base.extend<MyFixtures>({
  calendarPage: async ({ page }, use) => {
    await use(new CalendarPage(page))
  },
  groupPage: async ({ page }, use) => {
    await use(new GroupPage(page))
  },
  groupTaskPage: async ({ page }, use) => {
    await use(new GroupTaskPage(page))
  },
  habitSettingsPage: async ({ page }, use) => {
    await use(new HabitSettingsPage(page))
  },
  loginPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page)

    await use(loginPage)
  },
})
