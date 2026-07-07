import {expect, test} from "@playwright/test";

test('Playwright 검색 테스트', async({page})=>{
  await page.goto('https://playwright.dev')

  await page.getByRole('button', {name:'Search'}).click()
  await page.getByPlaceholder('Search').fill('locators')
  await page.keyboard.press('Enter')

  // await expect(page).toHaveURL(/.*search/)
  // await expect(page.getByText('Locators')).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Resilient locators' })
  ).toBeVisible();

  // getByText('Locators') → 너무 넓음
  // getByRole('heading', { name: 'Resilient locators' }) → 더 정확함
  // getByRole('link', { name: 'Locators' }).first() → 여러 개 중 첫 번째 선택
})