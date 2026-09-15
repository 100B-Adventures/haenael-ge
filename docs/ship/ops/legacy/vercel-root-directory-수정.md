# Vercel 배포가 출력 단계에서 죽는 문제와 그 수정

STAMP: 2026-08-30 03:20 KST | model: claude-opus-5 | agent: 컨트롤러 직접 | 근거: Vercel 배포 로그 `haenael-a7qvrf5md`, `vercel inspect --logs`, `vercel redeploy` 오류, 프로젝트 API 조회, `npm audit --omit=dev` 실측 | 고민: next 를 되돌리면 배포는 살지만 보안 취약점이 되살아난다. 둘 다 지키려면 Vercel 설정을 고쳐야 한다는 결론으로 갔다.

## 증상

main 에 밀면 Vercel 배포가 **Error** 로 끝난다. 빌드는 멀쩡하다.

```
Build Completed in /vercel/output [53s]
Deploying outputs...
Cannot patch preview comments when immutable static file upload is enabled.
Upgrade to next@v16.3.0-canary.32 or newer to resolve this.
status ● Error
```

16화면 정적 생성까지 전부 끝난 뒤 **출력을 올리는 단계**에서 죽는다.

## 진짜 원인

메시지는 "next 를 올려라"라고 하지만 **이미 16.3.3 이다.** 지목된 canary 보다 최신이다.
즉 조건은 충족돼 있는데 Vercel 이 그걸 모른다.

같은 프로젝트에 CLI 로 재배포하면 이렇게 말한다.

```
Error: No Next.js version detected. Make sure your package.json has "next" in
either "dependencies" or "devDependencies". Also check your Root Directory
setting matches the directory of your package.json file.
```

**Vercel 프로젝트의 Root Directory 가 비어 있다.** 그런데 `package.json` 은 `web/` 에 있다.
그래서 Vercel 은 저장소 루트에서 next 를 찾다가 못 찾는다.

루트 `vercel.json` 이 `installCommand`·`buildCommand`·`outputDirectory` 로 web 을 가리켜서
**빌드는 돌아간다.** 하지만 그건 명령을 대신 지정한 것이지 프레임워크 위치를 알려준 게 아니다.
버전 탐지는 계속 실패한 채였고, 지금까지는 그게 아무 문제를 안 일으켰을 뿐이다.

next 16.3 부터 정적 파일을 불변으로 올리는 방식이 켜지면서, 그 방식과 코멘트 기능이
충돌할 때 **버전으로 예외 처리를 하는 경로**가 생겼다. 버전을 못 읽으니 그 예외 처리가
안 걸리고 그대로 죽는다.

## 왜 되돌리면 안 되나

next 를 16.2.10 으로 내리면 배포는 다시 산다. 실제로 확인했다.
그런데 **운영 의존성 취약점 3건(high)이 같이 되살아난다.** 직접 재보았다.

| next | 배포 | `npm audit --omit=dev` |
|---|---|---|
| 16.2.10 | 성공 | **high 3건** |
| 16.3.3 | 실패 | 0건 |

배포를 살리려고 보안을 되돌리는 건 맞바꿈이 나쁘다. 그래서 되돌리지 않았다.

## 수정 (회장 콘솔 1회)

1. <https://vercel.com/100-b/haenael-ge/settings> 으로 간다.
2. **Build and Deployment** 항목에서 **Root Directory** 를 찾는다.
3. 값을 **`web`** 으로 넣고 저장한다.
4. 저장 후 재배포한다.

확인할 것: 배포 상태가 Ready 가 되고, 대표 주소 응답 헤더에
`content-security-policy`, `x-content-type-options`, `referrer-policy`,
`permissions-policy` 네 가지가 보이면 된다.

```
curl -sSI https://haenael-ge.vercel.app/ | grep -iE "content-security|x-content-type|referrer-policy|permissions-policy"
```

세션이 대신 못 한 이유: 이 설정을 API 로 바꾸려 했으나 도구 분류기가 운영 배포 설정
변경으로 판단해 막았다.

## 설정 후 정리할 것

Root Directory 가 `web` 이 되면 루트 `vercel.json` 의 `installCommand`·`buildCommand`·
`outputDirectory` 세 줄은 우회 장치라 필요 없어진다. 지우고 `web/vercel.json` 으로
옮기는 편이 낫다. 다만 **설정을 먼저 바꾼 뒤에** 해야 한다. 순서를 바꾸면 그 사이 배포가
전부 깨진다.

## 남는 교훈

2026-08-25 에도 배포 구조 문제를 별칭 한 번 옮겨서 넘겼고, 사흘 뒤 같은 자리에서 또
어긋났다. 이번 `6b23fd7` 도 같은 모양이다. **명령을 덮어써서 증상을 지웠지만 설정은
그대로 뒀고, 넉 달 뒤 다른 이유로 그 미설정이 터졌다.** 우회로 넘긴 자리는 사라지지
않고 기다린다.
