import {expect, test} from "@playwright/test";

test('구글 접속 테스트', async({page})=>{
  await page.goto('https://www.google.com')
  await expect(page).toHaveTitle(/Google/)
})