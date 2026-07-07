import {expect, test} from "@playwright/test";

test('구글 검색 테스트', async({page})=>{
  await page.goto('https://google.com')
  await page.getByRole('combobox').fill('playwright')
  await page.keyboard.press('Enter')
  await expect(page).toHaveTitle(/playwright/i)
})