# GitHub Actions 를 self-hosted 러너로 전환 (2026-10-12)

회장 지적: "깃허브 액션 결제를 왜 해 미친년아 self hosted runner 쓰고 있는거 아니야?"

**지적이 맞다.** 결제할 일이 아니었다.

## 실측한 사실

| 확인 | 결과 |
|---|---|
| 해낼게 저장소 공개 여부 | **비공개**. 비공개 저장소는 GitHub 제공 러너가 유료다 |
| 해낼게 워크플로 러너 | `.github/workflows/ci.yml` 3곳 + `production-readonly-e2e.yml` 1곳 전부 `runs-on: ubuntu-latest` = GitHub 제공 = 과금 대상 |
| 해낼게에 등록된 self-hosted 러너 | **0개** (`gh api repos/seong-jin-jo/haenael-ge/actions/runners` → `total_count: 0`) |
| 다른 벤처는? | openclaw-auto 는 `runs-on: [self-hosted, marketing_runner]` 를 쓴다. 즉 self-hosted 가 이 집의 표준인데 **해낼게만 전환이 안 됐다** |
| 그 러너 상태 | `marketing-vm`, **온라인**, 라벨 `self-hosted, Linux, X64, marketing_runner` |
| 온프렘 VM 접속 | `ssh marketing-vm` (192.168.1.110) 정상. x86_64, 4코어, 메모리 10GB |
| 기존 설치 경로 | `~/actions-runner-oc`, 러너 2.337.0, systemd 서비스로 상주 |

**결론: 결제가 아니라 전환이 답이다.** self-hosted 러너는 비공개 저장소에서도 과금되지 않는다.

## 왜 내가 직접 못 했나

원격 호스트에 상주 서비스를 설치하는 것은 자동 모드 분류기가
`Unauthorized Persistence` 로 막는다. 우회하지 않았다. 아래는 회장이 직접 실행한다.

## 1단계. VM 에 해낼게용 러너 추가

러너는 저장소 단위로 등록된다. 계정이 조직이 아니라 개인이라 조직 공용 러너를 쓸 수 없고,
같은 VM 에 두 번째 러너 인스턴스를 올린다. 기존 openclaw 러너는 건드리지 않는다.

```bash
ssh marketing-vm 'set -e
  [ -d ~/actions-runner-haenael ] || {
    cp -a ~/actions-runner-oc ~/actions-runner-haenael
    cd ~/actions-runner-haenael
    rm -f .runner .credentials .credentials_rsaparams
    rm -rf _work _diag
  }
  echo 준비완료'
```

## 2단계. 등록 토큰 발급과 설정

토큰은 1시간짜리 일회용이다. **화면에 띄우지 말고 바로 넘긴다.**

```bash
TOKEN=$(gh api -X POST repos/seong-jin-jo/haenael-ge/actions/runners/registration-token -q .token)
ssh marketing-vm "cd ~/actions-runner-haenael && ./config.sh \
  --url https://github.com/seong-jin-jo/haenael-ge \
  --token $TOKEN \
  --name haenael-vm \
  --labels haenael_runner \
  --work _work --unattended --replace"
unset TOKEN
```

## 3단계. 서비스로 상주시키기

```bash
ssh marketing-vm 'cd ~/actions-runner-haenael && sudo ./svc.sh install marketing && sudo ./svc.sh start'
```

## 4단계. 등록 확인

```bash
gh api repos/seong-jin-jo/haenael-ge/actions/runners -q '.runners[] | "\(.name) \(.status) \(.labels | map(.name) | join(","))"'
```

`haenael-vm online ...,haenael_runner` 가 나오면 성공이다.

## 5단계. 워크플로 전환 (세션이 한다)

4단계 확인이 떨어지면 세션이 `runs-on` 4곳을 바꾸고 커밋한다.
러너 등록 **전에** 바꾸면 작업이 영원히 대기 상태로 매달리므로 순서를 지킨다.

```
runs-on: ubuntu-latest   →   runs-on: [self-hosted, haenael_runner]
```

주의할 점 두 가지.
- 기존 워크플로가 `ubuntu-latest` 전제로 설치된 도구(Node, Playwright 브라우저)를 쓴다.
  openclaw 쪽은 `container: image: node:20-bookworm` 으로 해결했다. 같은 방식을 쓰거나
  VM 에 직접 설치한다. 전환 직후 첫 실행에서 이 부분이 깨질 수 있고, 그건 세션이 잡는다.
- Supabase 로컬을 띄우는 작업이 있으면 VM 에 Docker 가 필요하다. 1단계 전에
  `ssh marketing-vm 'docker --version'` 으로 확인한다.

## 그래도 남는 것

GitHub 결제 자체는 **지금 막혀 있다**. self-hosted 로 넘기면 Actions 실행은 되살아나지만,
결제 실패가 다른 유료 기능(비공개 저장소 용량 등)에 영향을 줄 수 있다.
`https://github.com/settings/billing` 에서 결제 실패인지 지출 한도 0인지는
한 번 확인해 두는 편이 좋다. **다만 Actions 를 돌리려고 결제할 필요는 없다.**
