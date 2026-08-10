import type { Locator, Page } from "@playwright/test"

/** 회원가입 화면의 Locator와 사용자 행동을 담당하는 Page */
export class SignUpPage {
  private readonly emailInput: Locator
  private readonly passwordInput: Locator
  private readonly confirmPasswordInput: Locator
  private readonly signUpButton: Locator

  constructor(page: Page) {
    this.emailInput = page.getByRole("textbox", { name: "이메일", exact: true })
    this.passwordInput = page.getByRole("textbox", { name: "비밀번호", exact: true })
    this.confirmPasswordInput = page.getByRole("textbox", {
      name: "비밀번호 확인",
      exact: true,
    })
    this.signUpButton = page.getByRole("button", { name: "회원가입", exact: true })
  }

  async signUp(email: string, password: string, confirmPassword: string): Promise<void> {
    await this.emailInput.fill(email)
    await this.passwordInput.fill(password)
    await this.confirmPasswordInput.fill(confirmPassword)
    await this.signUpButton.click()
  }
}
