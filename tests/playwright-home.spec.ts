import {test} from "@playwright/test";

test('Playwright 공식 사이트 이동 테스트', async({page})=>{
  await page.goto('https://playwright.dev')
  await page.getByRole('link', {name:"get started"}).click()
})