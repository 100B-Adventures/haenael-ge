# 해낼게 V2 모바일

Expo 57, React Native 0.86 기반 iOS·Android 앱이다. 서버의 Supabase JWT와 앱 채널 결제 계약을 그대로 사용한다.

```bash
cp .env.example .env.local
npm install
npm run typecheck
npm test
npx expo-doctor
npm run export:web
```

`app.config.ts`의 `APP_IDENTIFIER`는 콘솔 등록 전 임시값이다. EAS 제출 프로필은 준비만 했으며 이 저장소 작업에서 제출·실결제·콘솔 앱 생성은 실행하지 않는다. Supabase 값이 없거나 `EXPO_PUBLIC_DEMO_MODE=true`이면 읽기 전용 데모 자료로 렌더하되 결제·로그인·삭제 쓰기는 차단한다.
