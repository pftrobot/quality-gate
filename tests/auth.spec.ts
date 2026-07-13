import {expect, test} from "@playwright/test";

const BASE_URL = 'https://toit-nu.vercel.app/'
const LOGIN_ID = process.env.TOIT_LOGIN_ID
const LOGIN_PASSWORD = process.env.TOIT_LOGIN_PASSWORD

if(!LOGIN_ID || !LOGIN_PASSWORD){
  throw new Error('TOIT_LOGIN_ID와 TOIT_LOGIN_PASSWORD 환경변수가 필요합니다.')
}

test('유효한 계정으로 로그인하면 캘린더 화면이 표시된다', async ({page}) => {
  const calendarTab = page.getByRole('tab', {name: /Calendar$/})

  await page.goto(BASE_URL)

  await page.getByRole('textbox', {name: '이메일'}).fill(LOGIN_ID)
  await page.getByLabel('비밀번호').fill(LOGIN_PASSWORD)
  await page.getByRole('button', {name: '로그인', exact: true}).click()

  await expect(calendarTab).toBeVisible()
  await expect(calendarTab).toHaveAttribute('aria-selected', 'true')
})