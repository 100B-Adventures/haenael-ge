# 틱톡 — 배너 없음, 프로필 원형 크롭 주의사항

틱톡은 X·페이스북·유튜브와 달리 **프로필 배너(커버 이미지) 기능이 없다.** 프로필 화면에 뜨는 시각 자산은 프로필 사진(원형)과 소개문뿐이다. (근거: [socialsizes.io/tiktok-profile-picture-size](https://socialsizes.io/tiktok-profile-picture-size/), [krumzi.com/tiktok-profile-picture-size](https://www.krumzi.com/size-guide/tiktok-profile-picture-size))

## 업로드 규격

- 업로드 권장: **720×720px** (틱톡이 표시 시 200×200으로 다운스케일)
- 표시: 200×200px, **항상 원형 크롭**
- 형식: JPG·PNG, 10MB 이하

## 이 배치가 제공하는 파일

`tiktok-profile-200x200.png` — D-006 정본 클로버 마크(`profile-icon.png`)를 그대로 상속해, 200×200 캔버스 안에 72% 스케일로 축소 배치했다. 원 크롭 시 클로버 잎 끝단이 잘리지 않도록 안전 여백을 28% 확보했다(계산 근거는 동봉 `.stamp.md` 참조).

## 업로드 시 확인할 것

1. 틱톡 앱이 업로드 이미지를 **중앙 기준 정사각형 크롭 후 원형 마스킹**한다 — 원본이 정사각형(200x200)이면 추가 크롭 왜곡은 없다.
2. 업로드 후 프로필 화면에서 클로버 전체가 보이는지, 잎 끝이 원 밖으로 밀려 잘리지 않는지 **실제 업로드해서 육안 확인**한다(콘솔 UI라 추측 금지, postagi-app-deploy 원칙과 동일 — 틱톡 앱 화면도 수시로 바뀐다).
3. 다크모드 프로필 배경에서도 웜페이퍼(#FBFAF7) 캔버스가 흰 사각형처럼 튀지 않는지 확인 — 튀면 캔버스를 투명 배경으로 재추출하는 옵션을 검토(현재는 인스타·유튜브와 통일성을 위해 웜페이퍼 유지).

## 소개문(bio) — 문자수 제한과 초안

틱톡 프로필 소개(bio)는 **최대 80자**(한글 기준 글자 수 카운트, 근거: 틱톡 앱 실측 공통 관례). 아래 초안은 66자:

```
응원은 돈으로 하는 겁니다 🍀
친구가 선언한 목표에, 조용히 돈으로 응원하고 갑니다
```

톤 근거: `channel-identity-kit.md` §2-2 스레드 바이오와 같은 논리다. 틱톡은 숏폼·개인 서사 노출이 강해 슬로건 정면 배치가 스크롤 정지 효과를 낸다(스레드와 동일 판정, 인스타처럼 자제할 필요 없음). 링크는 틱톡 프로필의 "웹사이트" 필드(비즈니스 계정 전환 시 노출)에 서비스 도메인을 등록한다.

SOURCES/MODEL: claude-sonnet-5 (store-visual-producer) · socialsizes.io/tiktok-profile-picture-size · krumzi.com/size-guide/tiktok-profile-picture-size · wiki/1-team-brand/channel-identity-kit.md §2
