# 해낼게 Web 컴포넌트 인벤토리 v1.0.0

> STAMP: 2026-10-25 13:07 KST | model gpt-5.6-sol | agent code-builder | skill haenael-supabase-build | 기준 `web/src/components/**/*.tsx`, Storybook 정적 index, Git HEAD | 운영 미반영

## 계산 계약

- 분모는 `web/src/components` 아래의 실제 `.tsx` 파일에서 테스트와 Storybook 파일을 제외한 뒤, 화면을 렌더하지 않는 계측·브라우저 등록 컴포넌트만 명시적으로 제외한 수다.
- 직접 커버는 Storybook `meta.component`가 해당 컴포넌트를 직접 가리키는 경우다.
- 간접 커버는 직접 커버된 컴포넌트의 실제 렌더 트리 안에서 새 공용 렌더러가 실행되는 경우다. 간접 커버를 직접 커버처럼 숨기지 않고 별도 표기한다.
- TokenGallery는 Storybook 필수 산출물이지만 `web/src/components` 밖의 디자인 토큰 갤러리이므로 컴포넌트 분모에는 넣지 않는다.

## 커버리지

| 기준 | 원본 파일 | 제외 | 적격 분모 | 직접 커버 | 간접 포함 커버 | 판정 |
|---|---:|---:|---:|---:|---:|---|
| Git HEAD `c5ecc8a` 기준선 | 47 | 5 | 42 | 7/42 (16.7%) | 7/42 (16.7%) | 기준선 |
| 현재 작업트리 | 51 | 5 | 46 | 8/46 (17.4%) | 8/46 (17.4%) | 직접 커버 기준 +0.7%p, 비감소 |

현재 새 공용 렌더러 `WordmapCloudLayout`은 `Goal/Layout/WordmapCloudLayout`에서 직접 커버하고, 기존 `Goal/UI/Wordmap` 렌더 트리에서도 간접 검증한다. 직접 커버끼리 비교해 HEAD 7/42에서 현재 8/46으로 비감소다. `GoalManagementActions`, `GoalSupporterList`, `AccountWithdrawalButton`은 도메인 전용 컴포넌트이며 신규 공용 컴포넌트가 아니다. 이 세 파일은 커버리지 분모에는 포함하지만 현재 직접 Storybook 커버는 없다.

## 적격 컴포넌트 46개

| 영역 | 컴포넌트 | Storybook 커버 |
|---|---|---|
| admin | CashoutQueue | 없음 |
| admin | GoalCoverReviewQueue | 없음 |
| auth | LoginSheet | 없음 |
| auth | LogoutButton | 없음 |
| auth | PhoneConsentNotice | 없음 |
| cashout | CashoutPageView | 없음 |
| cashout | CashoutRequestForm | 직접, `Cashout/Form/CashoutRequestForm` |
| common | ClampText | 없음 |
| common | Collapsible | 없음 |
| common | ConditionalFooter | 없음 |
| common | Footer | 없음 |
| common | LegalFooter | 없음 |
| common | NotificationBadge | 없음 |
| common | ReportButton | 없음 |
| goal | CheerCount | 없음 |
| goal | CheerPaymentButton | 없음 |
| goal | DdayChip | 없음 |
| goal | GoalCard | 없음 |
| goal | GoalEditSheet | 없음 |
| goal | GoalManagementActions | 없음, 현재 작업트리 신설 도메인 컴포넌트 |
| goal | GoalSupporterList | 없음, 현재 작업트리 신설 도메인 컴포넌트 |
| goal | MyGoalListCard | 없음 |
| goal | MyLinkCard | 없음 |
| goal | OwnerBar | 없음 |
| goal | ShareLinkCard | 없음 |
| goal | SplitBalanceCard | 없음 |
| goal | Wordmap | 직접, `Goal/UI/Wordmap` |
| goal | WordmapCloudLayout | 직접, `Goal/Layout/WordmapCloudLayout`. 간접으로 `Wordmap` 렌더 트리에서도 사용 |
| goal | WordmapShareIcons | 없음 |
| receiver | CheerList | 직접, `Receiver/UI/CheerList` |
| receiver | OnboardingGoalForm | 없음 |
| receiver | ReceiverPageShell | 직접, `Common/Layout/ReceiverShell` |
| social | AccountWithdrawalButton | 없음, 현재 작업트리 신설 도메인 컴포넌트 |
| social | CheerSummaryBar | 직접, `Social/UI/CheerSummaryBar` |
| social | FriendGoalDetail | 없음 |
| social | FriendGoalList | 직접, `Social/UI/FriendGoalList` |
| social | FriendInviteCard | 없음 |
| social | FriendRelationshipBadge | 없음 |
| social | GoalCover | 없음 |
| social | GoalCoverPicker | 없음 |
| social | GoalVisibilityControl | 없음 |
| social | GuestTeaserSheet | 없음 |
| social | InviteAcceptCard | 없음 |
| social | MyPageOverview | 직접, `Social/Layout/MyPageOverview` |
| social | ReceiverBottomNav | 없음 |
| ui | Button | 없음 |

## 분모 제외 5개

| 컴포넌트 | 제외 이유 |
|---|---|
| AnalyticsEvent | UI를 렌더하지 않는 이벤트 계측기 |
| GoogleAnalytics | UI를 렌더하지 않는 분석 스크립트 주입기 |
| HomeSeenTracker | UI를 렌더하지 않는 열람 이벤트 계측기 |
| WordmapViewTracker | UI를 렌더하지 않는 워드맵 열람 계측기 |
| RegisterServiceWorker | UI를 렌더하지 않는 브라우저 등록기 |

## Storybook 상태 인벤토리

| 스토리 컴포넌트 | 노출 상태 |
|---|---|
| CashoutRequestForm | Form, Confirm, Submitting |
| Wordmap | FrequencyWeighted, Empty |
| WordmapCloudLayout | Default, Empty, LongWords |
| CheerList | Empty, Default, Overflow |
| ReceiverPageShell | Subpage, BottomSafe |
| MyPageOverview | Normal, Empty, Overflow |
| FriendGoalList | Normal, Empty |
| CheerSummaryBar | Normal, Empty |
| TokenGallery | AllTokens, 실제 CSS custom property를 `getComputedStyle`로 읽음 |

## 미커버 회수

- 현재 커버리지는 비감소지만 38개 적격 컴포넌트가 직접 Storybook 스토리 없이 남아 있다.
- 이번 build에서 새로 추가된 공용 컴포넌트 누락은 0건이다. `WordmapCloudLayout`은 병설 직접 스토리와 `Wordmap`을 통한 간접 렌더를 모두 갖는다.
- 다음 Storybook 확장은 사용 빈도와 위험을 기준으로 `GoalCoverPicker`, `GoalEditSheet`, `CashoutQueue`, `FriendGoalDetail` 순서가 적절하다. 이번 작업에서는 제품 소스 동결을 유지하기 위해 범위를 늘리지 않았다.

SOURCES/MODEL: gpt-5.6-sol | `~/.claude/standards/storybook.md` | `~/.claude/pipeline/product-lane.yaml` build.frontend_artifacts.storybook | `web/storybook-static/index.json` | Git HEAD 및 현재 `web/src/components`
