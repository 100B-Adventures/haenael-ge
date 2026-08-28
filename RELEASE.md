# 릴리즈 매니페스트 — 해낼게

릴리스 산출물 묶음과 운영 주소 연결 상태를 여기서 본다. 변경 내역은 `CHANGELOG.md`에 있다.

<!-- STAMP: 수정 2026-08-28 20:53 KST | model gpt-5.6-sol | agent release-manager | skill ship | basis pipeline-state.core.md approved_artifacts 22개, git tag v1.2.0, Vercel 운영 실측 기록 | decision 릴리스 태그와 운영 대표 주소 승격을 별도 상태로 기록 -->

```yaml
release: 1.2.0
date: 2026-08-27
delivery: vercel
canonical_url: https://haenael-ge.vercel.app
canonical_url_version: 1.0.0
verified_main_url: https://haenael-ge-git-main-100-b.vercel.app
verified_main_version: 1.2.0
deployment_status: awaiting-canonical-domain-promotion
commit: 7435619
tag: v1.2.0
ships:
  prd: 0.4.0        # docs/prd-haenael-ge-v0.4.0.md
  design: 2.0.0     # DESIGN.md
  fdd: 1.0.0        # docs/fdd-haenael-ge-cashout-clover-lock-v1.0.0-opus5.md
  fdd-base: 0.1.0   # docs/fdd-haenael-ge-v0.1.0.md
  qa: 1.0.0         # docs/core-cashout-qa-report-v1-gpt-codex.md (2026-08-27 승인)
changelog: CHANGELOG.md#120
```

이 저장소는 Vercel 서버리스 배포형이다. Dockerfile, Compose, 컨테이너 이미지 릴리스
워크플로가 없으므로 Docker 이미지 태그는 적용 대상이 아니다.

## 이 릴리즈에 실린 것

환전 수동 신청. 신청 화면, 이용료 10%와 원천징수 3.3% 계산, 신청분 잠금,
관리자 지급 처리까지. 자세한 것은 `CHANGELOG.md`를 본다.

## 게이트 이력

이 저장소는 2026-08-24 밤부터 8-25까지 **build 와 QA 가 반려 상태로 운영에 나갔다.**
커밋 여덟 개가 릴리즈 묶음 없이 main 에 직행했고, 그래서 "지금 운영 버전이
무엇이냐"에 답할 수 없는 상태가 됐다. 하네스 §2.1 위반이다.

8-27 에 반려 사유였던 시안 정합 세 곳을 고쳐 화면으로 확인했고, build 와 QA 를
승인 대기로 되돌렸고, 그날 build 와 QA 가 정식 승인됐다.

8-28 에 남아 있던 design 과 plan 도 승인해 상류 다섯 단계를 전부 닫았다.
design 의 마지막 잔여였던 안내문구 강조는 코드에 이미 반영돼 있었고,
plan 의 미결 세 건 중 둘은 사실로 해소됐으며 하나는 앱 출시로 미뤘다.
근거는 `pipeline-state.core.md` 승인 로그에 있다.

같은 날 이 문서의 존재 이유를 깨뜨리는 결함을 하나 찾았다. 운영이 스스로
보고하는 버전이 1.0.0 이었다. 이 문서는 1.2.0 이라고 적고 있었으니,
"지금 운영에 뭐가 올라가 있나"에 대한 답이 두 곳에서 달랐다. Vercel 의
`NEXT_PUBLIC_APP_VERSION` 이 40일 전 값에 멈춰 있던 것이 원인이고,
1.2.0 으로 갱신했다. 최신 Production 배포는 1.2.0 을 반환하지만 운영 대표
주소는 아직 1.0.0 배포를 가리킨다. 대표 주소 승격은 회장 결정 대기 상태다.

당시 남아 있던 QA 지적과 그 처리는 이렇다.

| 지적 | 상태 |
|---|---|
| 확인 단계가 시안과 어긋남 | 해소 (1,346px → 371px) |
| 로딩 전환이 시안과 어긋남 | 해소 (1,505px → 403px) |
| 워드맵 미리보기 개수 | 해소 (12개 → 6개) |
| 최소 금액 안내에 영어 기본 문구 | 해소 |
| 전역 디자인 검사 경고 | 미해소 |
| 환전 알림톡 2종 미발송 | 해소 (실제 발송 확인) |
| 관리자가 환전 신청을 인지할 경로 없음 | 해소 (슬랙 통지) |
| 운영 환경변수 누락을 배포 전에 못 잡음 | 해소 (검사 신설) |
| 운영을 실제로 도는 검사 없음 | 부분 해소 (로그인 불요 경로만) |

## 다음 릴리즈에서 지킬 것

1. 운영에 나가는 것은 릴리즈 단위로 묶는다. 커밋 하나씩 흘려보내지 않는다.
2. 릴리즈마다 이 문서와 `CHANGELOG.md`를 갱신하고 git 태그를 붙인다.
3. QA가 `changes-requested`인 상태로 릴리즈를 만들지 않는다.
4. 회장이 CI가 전부 통과한 PR을 직접 머지한다. 세션은 거기까지만 한다.
