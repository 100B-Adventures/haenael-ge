---
stage: design
line: v2
version: 1.0.0
updated: "2026-10-16 02:07 KST"
model: gpt-6.1-sol
agent: code-builder
status: revision-proposed
---

# 친구 관계 방향 표시 계약

## 한 줄 원칙

`friend_connection`은 친구 여부만 말한다. 관계 방향 라벨은 로그인한 회원과 친구 사이의 실제 응원 귀속 기록을 양방향으로 조회해 계산한다.

## 판정 입력

- 로그인한 회원: `viewer_member_id`
- 친구: `friend_member_id`
- 응원자 귀속: `social_cheer_member_attribution.supporter_member_id`
- 목표 소유자: `goal.member_id`
- 유효 응원: `cheer.is_welcome = false`이고 다음 중 하나가 참인 기록
  - `cheer.status = 'CONFIRMED'`
  - 연결된 `payment`에 `payment_log.to_status = 'DONE'` 이력이 존재

환불이나 soft-delete 뒤에도 과거 확정 이력은 관계가 생긴 사실을 지우지 않는다. 이 규칙은 D-024의 친구 자동 연결 및 소급 backfill 계약과 같다.

## 방향 계산

| forward | reverse | API 값 | 화면 라벨 |
|---:|---:|---|---|
| 참 | 거짓 | `I_CHEERED` | 내가 응원함 |
| 거짓 | 참 | `CHEERED_ME` | 응원받음 |
| 참 | 참 | `MUTUAL` | 서로 응원 |
| 거짓 | 거짓 | `INVITED` | 초대로 연결 |

`forward`는 `supporter_member_id = viewer_member_id`이고 `goal.member_id = friend_member_id`인 유효 응원이 한 건 이상인 경우다. `reverse`는 두 회원을 바꾼 같은 조건이다.

`INVITED`는 `friend_invite` 수락으로 ACTIVE 관계가 만들어졌지만 응원 기록은 아직 없는 정직한 경계 상태다. 이 상태를 `서로 응원`으로 표시하면 실제 기록과 어긋나므로 별도 라벨을 쓴다.

## 노출 위치

- 친구 목록: 친구 이름과 대표 목표를 읽는 한 행의 우측에 라벨을 한 번 표시한다.
- 친구 상세: 제목 바로 아래에 같은 라벨을 표시한다.
- 목표별로 반복하지 않는다. 방향은 친구 두 회원 사이의 관계 속성이다.
- 금액, 응원 횟수, 순위는 방향 라벨에 포함하지 않는다.

## 조사 결과: “응원자에게만 보이는 근황”

`friend_goal_detail()`은 목표 `reason`, 커버, 확정 응원 수, 워드맵만 반환한다. 근황 게시물 테이블, 작성 RPC, 작성 화면, 공개 범위 정책은 없다. 엔지니어링 설계도 timeline/boost 테이블을 이번 슬라이스에서 만들지 않는다고 명시한다.

기존 화면은 목표를 만든 이유인 `goal.reason`을 근황처럼 재사용해 데이터 의미를 바꿨다. 실제 데이터 출처와 작성 경로가 없으므로 D-026-E에 따라 프로토타입과 제품 화면에서 근황 블록을 제거한다. 향후 근황을 도입하려면 별도 plan 승격으로 작성 주체, 데이터 모델, 가시성, 수정·삭제, 신고·차단 계약을 먼저 확정해야 한다.

## 반례 점검

- `friend_connection`의 low/high 컬럼 순서로 방향을 판단하면 UUID 정렬을 관계 의미로 오해한다. 방향은 반드시 응원자와 목표 소유자로 계산한다.
- 현재 확정 상태만 보면 환불·삭제 뒤 라벨이 사라져 D-024 backfill과 불일치한다. `payment_log DONE` 이력을 함께 본다.
- 초대 전용 관계를 `MUTUAL`로 보정하면 DB에서 반증되는 거짓 UI가 된다. `INVITED`로 남긴다.

🏷 STAMP | line: v2 | 생성: 2026-10-16 02:07 KST | model: gpt-6.1-sol | agent: code-builder | skill: haenael-supabase-build | 근거: `docs/design/chairman-directives-v2-20261015.md` D-026-D·E, `supabase/migrations/20261015010000_cheer_friendship_backfill.sql`, `supabase/migrations/20261013050000_social_viral_loop_web_first.sql`, `docs/eng-design/erd-social-viral-loop-web-first-v1.1.0.md` | 고민: 초대만 수락한 친구를 상호 응원으로 오표시하지 않도록 반증 가능한 네 번째 경계 상태를 명시했다.

SOURCES/MODEL: gpt-6.1-sol | 위 레포 파일
