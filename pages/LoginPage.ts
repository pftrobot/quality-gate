import { Locator, Page } from "@playwright/test"

export class LoginPage {
  private readonly emailInput: Locator
  private readonly passwordInput: Locator
  private readonly loginButton: Locator
  private readonly signUpLink: Locator

  constructor(page: Page) {
    this.emailInput = page.getByRole("textbox", { name: "이메일" })
    this.passwordInput = page.getByLabel("비밀번호")
    this.loginButton = page.getByRole("button", { name: "로그인", exact: true })
    this.signUpLink = page.getByRole("button", { name: "회원가입", exact: true })
  }

  async login(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email)
    await this.passwordInput.fill(password)
    await this.loginButton.click()
  }

  async goToSignUp(): Promise<void> {
    await this.signUpLink.click()
  }
}
