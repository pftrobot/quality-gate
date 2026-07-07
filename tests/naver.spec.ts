import {expect, test} from "@playwright/test";

test('네이버 접속 테스트', async({page})=>{
  await page.goto('https://naver.com')

  await expect(page).toHaveTitle(/NAVER/)
})