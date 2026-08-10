# Quality Gate

[![Playwright Tests](https://github.com/pftrobot/quality-gate/actions/workflows/playwright.yml/badge.svg)](https://github.com/pftrobot/quality-gate/actions/workflows/playwright.yml)

TOIT 의 주요 사용자 흐름을 Playwright 로 검증하는 E2E 자동화 프로젝트입니다.
로그인부터 캘린더, 개인 일정, 그룹, 사용자 설정까지 실제 배포 환경에서 테스트합니다.

- 테스트 대상: [TOIT 그룹 일정 웹 서비스](https://toit-nu.vercel.app/)
- 테스트 환경: Vercel 에 배포된 실제 서비스

## 자동화 범위

- 로그인 및 인증: 정상 로그인, 필수 입력값, 잘못된 인증정보
- 캘린더: 날짜와 월 이동, 상세 일정 패널, 개인 일정과 팀 일정의 완료 상태
- 개인 일정: 일정 생성, 수정, 삭제, 반복 설정과 캘린더 반영
- 그룹: 그룹 생성, 수정, 삭제, 기본 설정과 초대 코드
- 그룹 할 일: 할 일 생성, 수정, 삭제, 카테고리와 반복 조건
- 사용자 설정: 화면과 알림 설정, 표시 이름, 피드백, 로그아웃, 회원 탈퇴

## 대표 시나리오

### 반복 일정 규칙 검증

- 입력 조건: 반복 유형, 유형별 반복 조건, 시작일, 마감일
- 사용자 행동: 반복 유형과 필요한 조건을 설정한 뒤 일정을 저장합니다.
- 기대 결과: 반복 규칙과 기간에 해당하는 날짜에만 일정이 표시됩니다. 규칙에 맞지 않거나 기간을 벗어난 날짜에는 표시되지 않으며, 시작일이나 마감일을 지정하지 않으면 서비스의 기본 기간이 적용됩니다.

반복 일정은 매일, 매주, 매달 규칙과 날짜 범위가 함께 동작합니다.
한 번 잘못 계산되면 여러 날짜에 영향을 주기 때문에 주요 회귀 시나리오로 선택했습니다.

테스트에서는 일정이 보여야 하는 날짜와 보이지 않아야 하는 날짜를 함께 확인합니다.
이를 통해 일정 누락뿐만 아니라 필요 이상의 날짜에 일정이 표시되는 문제도 찾을 수 있습니다.

## 기술 스택

| 구분        | 기술            | 사용 목적                                             |
| ----------- | --------------- | ----------------------------------------------------- |
| E2E 테스트  | Playwright Test | 브라우저 조작, assertion, fixture, trace, HTML report |
| 언어        | TypeScript      | Page 객체와 테스트 입력값의 타입 정의                 |
| 패키지 관리 | pnpm            | 의존성 설치와 Playwright 명령 실행                    |
| CI          | GitHub Actions  | push 와 pull request 에서 테스트 실행, 리포트 보관    |
| 실행 환경   | Node.js LTS     | 로컬과 CI 의 테스트 런타임                            |

## 테스트 설계

### Page Object Model

Locator 와 화면 조작은 `pages/` 에서 관리하고 assertion 은 spec 에 작성했습니다.
화면이 바뀌면 Page 객체를 먼저 수정하고, 테스트에서 무엇을 확인하는지는 spec 에서 바로 볼 수 있도록 나눴습니다.

### Custom Fixture

Page 객체는 `fixtures/pages.fixture.ts` 에서 생성합니다.
각 spec 에서 Page 객체를 반복해서 생성하지 않고, 테스트에 필요한 객체만 fixture 로 전달받습니다.

### storageState

인증 setup 에서 로그인한 뒤 상태를 `playwright/.auth/user.json` 에 저장합니다.
로그인 기능을 검증하는 테스트는 인증 상태 없이 실행하고, 로그인 이후 기능은 저장된 상태를 사용합니다.
모든 테스트에서 로그인을 반복하지 않기 때문에 실행 시간을 줄이고 인증 과정에서 생길 수 있는 불안정도 줄일 수 있습니다.

### Data Driven Test

로그인 입력 조합과 반복 일정 규칙은 케이스 배열로 관리합니다.
테스트 흐름은 한 번만 작성하고 입력값과 기대 날짜를 바꿔 여러 조건을 확인합니다.

현재 데이터는 각각 하나의 spec 에서만 사용하므로 테스트 가까이에 두었습니다.
여러 spec 에서 공유해야 하는 상황이 오면 별도 파일로 분리할 예정입니다.

### 테스트 데이터 정리

테스트에서 생성하는 일정과 그룹에는 실행 시점과 `parallelIndex` 를 조합한 이름을 사용합니다.
테스트가 중간에 실패하더라도 `finally` 에서 생성한 데이터를 삭제합니다.
기존 데이터의 상태를 바꾸는 테스트는 종료 전에 원래 상태로 되돌립니다.

### Locator

role, accessible name, label 처럼 사용자가 화면에서 인식할 수 있는 정보를 우선 사용했습니다.
가상화 목록에서 특정 항목을 구분해야 하는 경우에만 `data-testid` 를 사용했습니다.

### 브라우저 범위

서비스 진입점인 로그인은 Chromium, Firefox, WebKit 에서 확인합니다.
로그인 이후의 전체 기능은 실행 시간과 현재 회귀 범위를 고려해 Chromium 에서 실행합니다.

## 프로젝트 구조

```text
.
├── .github/workflows/     # GitHub Actions 워크플로
├── fixtures/              # Page 객체를 제공하는 fixture
├── pages/                 # 화면별 Locator 와 사용자 동작
├── tests/                 # 기능별 spec 과 인증 setup
├── utils/                 # 테스트 데이터 생성, 정리, 공통 동작
├── playwright.config.ts   # 브라우저, 인증, 리포터 설정
└── tsconfig.json          # TypeScript 와 경로 별칭 설정
```

같은 코드가 반복되거나 여러 테스트에서 공유해야 하는 책임이 생겼을 때 fixture 와 utils 로 분리했습니다.

## 테스트 실행 구성

| Playwright project       | 대상             | 브라우저 | 목적                                |
| ------------------------ | ---------------- | -------- | ----------------------------------- |
| `setup`                  | `auth.setup.ts`  | Chromium | 로그인 상태 저장                    |
| `chromium`               | `auth.spec.ts`   | Chromium | 로그인 시나리오 검증                |
| `firefox`                | `auth.spec.ts`   | Firefox  | 로그인 교차 브라우저 검증           |
| `webkit`                 | `auth.spec.ts`   | WebKit   | 로그인 교차 브라우저 검증           |
| `authenticated-chromium` | 로그인 이후 기능 | Chromium | 저장된 로그인 상태로 주요 기능 검증 |

로컬에서는 테스트 파일을 병렬로 실행합니다.
CI 에서는 실제 서비스의 테스트 데이터가 동시에 변경되는 일을 줄이기 위해 worker 를 1개로 제한했습니다.
CI 에서 실패한 테스트는 최대 2회 재시도하고 첫 재시도에 trace 를 저장합니다.

## 로컬 실행

### 1. 의존성 설치

NodeJS, pnpm 설치가 필요합니다.

```bash
pnpm install
pnpm exec playwright install
```

### 2. 환경변수 설정

프로젝트 루트에 `.env` 파일을 만듭니다.

```dotenv
TOIT_LOGIN_ID="테스트 계정 이메일"
TOIT_LOGIN_PASSWORD="테스트 계정 비밀번호"
```

팀 일정 완료 테스트에 사용할 데이터가 있다면 다음 값을 추가합니다.

```dotenv
TOIT_TEAM_TASK_TITLE="팀 일정 제목"
TOIT_TEAM_TASK_DATE="YYYY-MM-DD"
```

두 값을 설정하지 않으면 팀 일정 완료 테스트만 skip 됩니다.
캘린더의 그룹 선택 테스트를 실행하려면 테스트 계정에 선택할 수 있는 그룹이 2개 이상 있어야 합니다.

### 3. 정적 검사

```bash
# 포맷, ESLint, TypeScript 검사
pnpm check

# 개별 검사
pnpm format:check
pnpm lint
pnpm typecheck
```

### 4. 테스트 실행

```bash
# 전체 테스트
pnpm test:e2e

# 특정 파일
pnpm test:e2e tests/calendar.spec.ts

# UI 모드
pnpm test:e2e --ui

# HTML 리포트
pnpm exec playwright show-report
```

## CI

GitHub Actions 는 `main` 또는 `master` 브랜치의 push 와 pull request 에서 실행됩니다.

1. Node.js LTS 와 pnpm 설치
2. 프로젝트 의존성 설치
3. 포맷, ESLint, TypeScript 검사
4. Playwright 브라우저 설치
5. Playwright 테스트 실행
6. HTML 리포트를 artifact 로 업로드하고 30일 동안 보관

Repository Secrets 에는 다음 값을 등록해야 합니다.

```text
TOIT_LOGIN_ID
TOIT_LOGIN_PASSWORD
```

두 Secret 은 Playwright 테스트를 실행하는 step 에만 전달합니다.

## 현재 제약

- 배포된 서비스를 직접 테스트하므로 네트워크와 백엔드 상태의 영향을 받을 수
  있습니다.
- 팀 일정 완료 테스트는 미리 준비한 데이터가 없으면 skip 됩니다.
