// privacy/page.tsx — 개인정보처리방침 (법정 고지)
export default function PrivacyPage() {
  return (
    <main className="max-w-2xl mx-auto px-6 py-16" data-testid="privacy-page">
      <h1 className="text-2xl font-bold mb-6">개인정보처리방침</h1>

      <p className="text-sm text-muted-foreground mb-10">
        본 방침은 표준 개인정보처리방침 템플릿을 기반으로 &ldquo;해낼게&rdquo;
        서비스의 실제 수집 항목에 맞춰 작성되었으며, 정식 법률 검토를
        대체하지 않는 잠정 문서입니다. 서비스 확장 및 기능 활성화(결제,
        환전, 분석 도구 등)에 따라 개정될 수 있습니다.
      </p>

      <p className="mb-8 leading-relaxed">
        &ldquo;해낼게&rdquo;(이하 &ldquo;회사&rdquo;)는 이용자의 개인정보를
        중요시하며, 「개인정보 보호법」 등 관계 법령을 준수하기 위해
        노력합니다. 회사는 본 개인정보처리방침을 통해 이용자가 제공하는
        개인정보가 어떠한 목적과 방식으로 이용되고 있으며, 개인정보 보호를
        위해 어떠한 조치가 취해지고 있는지 알려드립니다.
      </p>

      <h2 className="text-lg font-semibold mt-10 mb-3">
        1. 수집하는 개인정보의 항목 및 수집방법
      </h2>
      <p className="mb-2 leading-relaxed">회사는 다음과 같은 개인정보를 수집합니다.</p>
      <ul className="list-disc pl-5 space-y-2 leading-relaxed mb-4">
        <li>
          <strong>카카오 소셜 로그인(회원가입) 시</strong>: 이용자가 카카오
          로그인 동의 화면에서 동의한 항목에 한해, 카카오로부터 제공받아
          수집합니다.
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>
              <strong>[필수]</strong> 닉네임(profile_nickname), 카카오 고유
              식별자(provider id) — 회원 식별 및 로그인
            </li>
            <li>
              <strong>[선택]</strong> 프로필 이미지(profile_image) — 프로필
              표시
            </li>
            <li>
              <strong>[선택]</strong> 카카오계정(이메일)(account_email) —
              회원 식별 보조 및 서비스 관련 안내
            </li>
            <li>
              <strong>[선택]</strong> 카카오계정(전화번호)(phone_number) —
              응원 도착·환전 지급 완료 등 서비스 이용에 관한 정보성
              알림톡(카카오톡 메시지) 발송
            </li>
            <li>
              <strong>[선택]</strong> 연령대(age_range) — 미성년 이용자 구분에
              따른 환전(정산) 정책 적용 및 통계 분석. 구간 값만 수집하며
              생년월일 전체는 수집하지 않습니다.
            </li>
            <li>
              <strong>[선택]</strong> 생일(birthday) — 생일 축하 혜택 등
              이벤트 제공 및 통계 분석
            </li>
          </ul>
          선택 항목에 동의하지 않아도 회원가입 및 서비스의 기본 이용에는
          제한이 없습니다.
        </li>
        <li>
          <strong>출시 알림 리드 신청 시</strong>: 이메일 또는 인스타그램
          아이디(둘 중 최소 1개), 신청 동의 시각, 유입 경로 정보(UTM
          source/medium/campaign/content, referrer, 방문 페이지 경로)
        </li>
        <li>
          <strong>목표 작성 및 응원 이용 시</strong>: 목표 제목, 목표 사유,
          목표 기한, 응원 시 표시 이름, 익명 응원 여부, 응원 메시지(최대
          140자), 응원 클로버 수량
        </li>
        <li>
          <strong>신고 접수 시</strong>: 신고 사유, 신고 대상 정보, 신고자
          식별자(로그인 이용자는 인증 식별값, 비로그인 게스트는 별도
          식별정보를 수집하지 않습니다)
        </li>
        <li>
          <strong>부정이용 방지를 위해</strong>: 접속 IP를 솔트(salt) 처리한
          일방향 해시값(원본 IP 주소 자체는 저장하지 않습니다) — 리드 신청
          속도 제한(rate limit) 목적으로만 사용합니다.
        </li>
        <li>
          <strong>서비스 이용 과정에서 자동 생성되는 정보</strong>: 접속
          로그, 쿠키, 서비스 이용 기록
        </li>
        <li>
          <strong>(결제 기능 활성화 시)</strong> 현재 해낼게의 응원 결제
          기능은 준비 중이며 비활성화(<code>PAYMENTS_ENABLED=false</code>)
          되어 있어 실제 결제 정보를 수집하지 않습니다. 결제 기능이
          활성화되면 토스페이먼츠(주식회사 비바리퍼블리카)를 통해 결제가
          처리되며, 카드번호 등 결제수단 정보는 토스페이먼츠가 직접
          처리·보관하고 회사는 이를 저장하지 않습니다. 회사 서버에는 주문
          번호, 결제 금액, 결제 상태, 승인 시각, 영수증 URL 등 결제 처리
          결과만 저장됩니다.
        </li>
        <li>
          <strong>클로버 환전 신청 시</strong> 수동 계좌 지급과 세무 처리를
          위해 다음 정보를 수집합니다.
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>
              환전 요청 클로버 수, 요청액, 3.3% 원천징수액, 실지급액,
              신청·처리 시각, 처리 상태와 처리 메모
            </li>
            <li>
              지급을 위한 은행, 계좌번호, 예금주명 — 계좌번호는
              <strong>암호화하여 저장</strong>하고, 관리자가 수동 송금할 때만
              권한 확인 후 복호화합니다.
            </li>
          </ul>
        </li>
      </ul>
      <p className="mb-4 leading-relaxed">
        개인정보는 카카오 소셜 로그인, 회원가입, 리드 신청 폼, 목표/응원
        작성, 신고 접수 등 이용자가 서비스를 이용하는 과정에서 직접
        입력하거나, 카카오 등 제휴 서비스로부터 이용자의 동의 하에 제공받는
        방식으로 수집됩니다.
      </p>

      <h2 className="text-lg font-semibold mt-10 mb-3">
        2. 개인정보의 수집 및 이용목적
      </h2>
      <ul className="list-disc pl-5 space-y-1 leading-relaxed mb-4">
        <li>회원 식별 및 카카오 소셜 로그인을 통한 서비스 이용</li>
        <li>목표 작성, 응원(후원), 워드맵 등 핵심 서비스 제공</li>
        <li>출시 소식 및 서비스 관련 알림 발송(리드 신청자 대상)</li>
        <li>신고 접수 처리 및 부적절한 콘텐츠에 대한 모더레이션</li>
        <li>부정이용 방지 및 서비스 남용(어뷰징) 차단</li>
        <li>서비스 품질 개선 및 이용 통계 분석</li>
        <li>
          (활성화 시) 응원 도착·환전 지급 완료 등 서비스 이용에 관한 정보성
          알림톡 발송 — 광고성 정보는 발송하지 않습니다
        </li>
        <li>
          (활성화 시) 미성년 이용자 구분에 따른 환전(정산) 정책 적용
        </li>
        <li>(활성화 시) 생일 축하 혜택 등 이벤트 제공</li>
        <li>
          (활성화 시) 결제 처리, 결제 관련 분쟁 대응, 클로버 환전 신청 접수, 관리자 수동
          계좌 지급, 3.3% 원천징수 및 관계법령에 따른 정산·세무 처리
        </li>
      </ul>

      <h2 className="text-lg font-semibold mt-10 mb-3">
        3. 개인정보의 보유 및 이용기간
      </h2>
      <p className="mb-2 leading-relaxed">
        회사는 원칙적으로 개인정보 수집 및 이용목적이 달성된 후 또는
        회원이 탈퇴를 요청한 경우 해당 정보를 지체 없이 파기합니다. 다만
        관계 법령에 따라 보존할 필요가 있는 경우 회사는 아래와 같이 관계
        법령에서 정한 일정한 기간 동안 회원정보를 보관합니다.
      </p>
      <ul className="list-disc pl-5 space-y-1 leading-relaxed mb-4">
        <li>계약 또는 청약철회 등에 관한 기록: 5년(전자상거래법)</li>
        <li>대금결제 및 재화 등의 공급에 관한 기록: 5년(전자상거래법)</li>
        <li>소비자의 불만 또는 분쟁처리에 관한 기록: 3년(전자상거래법)</li>
        <li>접속에 관한 기록(로그기록): 3개월(통신비밀보호법)</li>
      </ul>
      <p className="mb-4 leading-relaxed">
        리드(출시 알림) 신청 정보는 서비스 정식 출시 안내 발송 완료 후 또는
        이용자가 수신 거부·삭제를 요청하는 즉시 파기하는 것을 원칙으로
        합니다.
      </p>
      <p className="mb-4 leading-relaxed">
        환전 계좌정보는 지급 완료 또는 반려 후 이용목적이 달성되면 파기하는
        것을 원칙으로 합니다. 다만 원천징수, 지급명세 및 거래 증빙 등
        관계 세법에 따라 보존 의무가 있는 정보는 <strong>법정 보존기간 동안
        분리하여 보관</strong>한 뒤 파기합니다.
      </p>
      <p className="mb-4 leading-relaxed">
        전자적 파일 형태로 저장된 개인정보는 기술적 방법을 사용하여
        복구·재생이 불가능한 방법으로 영구 삭제하며, 종이 문서에 출력·기록된
        개인정보는 분쇄기로 분쇄하거나 소각하여 파기합니다.
      </p>

      <h2 className="text-lg font-semibold mt-10 mb-3">
        4. 개인정보의 제3자 제공 및 처리위탁
      </h2>
      <p className="mb-2 leading-relaxed">
        회사는 원칙적으로 이용자의 개인정보를 외부에 제공하지 않으며,
        서비스 제공을 위해 아래와 같이 개인정보 처리를 위탁하고 있습니다.
      </p>
      <p className="mb-2 leading-relaxed">
        한편 카카오 소셜 로그인은 처리위탁이 아니라, 이용자가 카카오 로그인
        동의 화면에서 직접 동의한 항목을 회사가 (주)카카오로부터{" "}
        <strong>제공받는</strong> 것입니다. 제공받는 항목과 목적은 위 1항에
        기재되어 있습니다.
      </p>
      <ul className="list-disc pl-5 space-y-2 leading-relaxed mb-4">
        <li>
          <strong>Supabase</strong>(데이터베이스, 인증, 서버 호스팅 — 서울
          리전): 회원 정보, 목표/응원 데이터 등 서비스 운영에 필요한
          데이터베이스 및 인증 인프라 — 현재 활성 이용 중
        </li>
        <li>
          <strong>Vercel</strong>(웹 애플리케이션 호스팅 및 배포): 웹
          서비스 구동 — 현재 활성 이용 중
        </li>
        <li>
          <strong>(주)카카오</strong>(카카오톡 알림톡 발송): 응원 도착·환전
          지급 완료 등 정보성 알림 발송을 위한 수신자 전화번호 처리 — 현재{" "}
          <strong>비활성</strong>, 알림 기능 활성화 시 이용 예정
        </li>
        <li>
          <strong>(주)넥스모어시스템즈(솔라피)</strong>(메시지 발송 대행):
          알림톡 발송 요청 중계 — 현재 <strong>비활성</strong>, 알림 기능
          활성화 시 이용 예정
        </li>
        <li>
          <strong>토스페이먼츠(Toss Payments)</strong>(결제 처리): 응원
          결제 대행 — 현재 <strong>비활성</strong>, 결제 기능 활성화 시
          이용 예정
        </li>
        <li>
          <strong>Google Analytics(GA4)</strong>(서비스 이용행태 분석):
          연동 코드는 포함되어 있으나 측정 ID(Measurement ID)가 설정되지
          않아 현재 <strong>비활성</strong> 상태이며 실제 이용자 데이터를
          수집하지 않습니다. 활성화 시 별도 고지 후 이용합니다.
        </li>
      </ul>
      <p className="mb-4 leading-relaxed">
        회사는 법령에 특별한 규정이 있거나 수사기관이 적법한 절차에 따라
        요구하는 경우를 제외하고는 이용자의 개인정보를 위 목적 범위를
        초과하여 제3자에게 제공하지 않습니다.
      </p>

      <h2 className="text-lg font-semibold mt-10 mb-3">
        5. 이용자의 권리와 행사방법
      </h2>
      <p className="mb-2 leading-relaxed">
        이용자는 언제든지 자신의 개인정보에 대해 열람, 정정, 삭제, 처리정지
        요구 등의 권리를 행사할 수 있습니다. 권리 행사는 서비스 내
        설정(제공되는 경우) 또는 아래 &ldquo;8. 개인정보 보호책임자 및
        문의처&rdquo;를 통해 요청할 수 있으며, 회사는 관계 법령이 정한
        절차와 기간 내에 지체 없이 조치합니다.
      </p>
      <p className="mb-4 leading-relaxed">
        회원 탈퇴 시 개인정보는 &ldquo;3. 개인정보의 보유 및 이용기간&rdquo;에
        따라 처리되며, 목표·응원 등 다른 이용자와 연관된 콘텐츠는 서비스
        운영 및 데이터 정합성을 위해 즉시 삭제되지 않을 수 있습니다.
      </p>

      <h2 className="text-lg font-semibold mt-10 mb-3">
        6. 개인정보의 안전성 확보조치
      </h2>
      <p className="mb-4 leading-relaxed">
        회사는 개인정보 보호를 위해 다음과 같은 조치를 취하고 있습니다.
      </p>
      <ul className="list-disc pl-5 space-y-1 leading-relaxed mb-4">
        <li>
          본인인증 정보(CI 등) 및 계좌번호 등 민감한 정보는 암호화하여
          저장하며, 환전 계좌번호의 복호화와 처리 상태 변경은 관리자
          허용목록과 서버 전용 권한을 모두 통과한 경우에만 허용합니다.
        </li>
        <li>
          데이터베이스 접근은 서비스 역할(service role) 및 행 단위 접근
          제어(Row Level Security)를 통해 인가된 요청으로 제한하기 위해
          노력합니다.
        </li>
        <li>
          부정이용 방지를 위한 요청은 원본 IP가 아닌 해시 처리된 값으로
          식별합니다.
        </li>
        <li>
          다만 위 조치에도 불구하고 인터넷 환경에서는 개인정보의 완전한
          보안을 보장할 수 없으며, 회사는 관계 법령이 정한 수준에서 안전성
          확보를 위해 지속적으로 노력합니다.
        </li>
      </ul>

      <h2 className="text-lg font-semibold mt-10 mb-3">
        7. 쿠키(Cookie)의 설치·운영 및 거부
      </h2>
      <p className="mb-2 leading-relaxed">
        회사는 이용자에게 개인화되고 편리한 서비스를 제공하기 위해
        쿠키(cookie)를 사용할 수 있습니다. 쿠키는 웹사이트를 운영하는 데
        이용되는 서버가 이용자의 브라우저에 전송하는 소량의 정보이며,
        이용자의 컴퓨터 하드디스크에 저장되기도 합니다.
      </p>
      <ul className="list-disc pl-5 space-y-2 leading-relaxed mb-4">
        <li>
          <strong>쿠키의 사용 목적</strong>: 로그인 상태 유지, 서비스 이용
          통계 분석 등 이용자 편의 제공을 위해 사용됩니다.
        </li>
        <li>
          <strong>쿠키의 설치·운영 및 거부</strong>: 이용자는 웹브라우저
          설정에서 옵션을 조정하여 모든 쿠키를 허용하거나, 쿠키가 저장될
          때마다 확인을 거치거나, 모든 쿠키의 저장을 거부할 수 있습니다.
          (예: 크롬 — 설정 &gt; 개인정보 및 보안 &gt; 쿠키 및 기타 사이트
          데이터, 사파리 — 환경설정 &gt; 개인정보 보호)
        </li>
        <li>
          다만 쿠키 저장을 거부할 경우 로그인이 필요한 일부 서비스 이용에
          어려움이 발생할 수 있습니다.
        </li>
      </ul>

      <h2 className="text-lg font-semibold mt-10 mb-3">
        8. 개인정보 보호책임자 및 문의처
      </h2>
      <p className="mb-4 leading-relaxed">
        개인정보 관련 문의, 불만 처리, 피해 구제 등을 위한 담당자 및
        연락처는 아래와 같습니다.
      </p>
      <ul className="list-disc pl-5 space-y-1 leading-relaxed mb-4">
        <li>개인정보 보호책임자: (추후 입력)</li>
        <li>이메일: (추후 입력)</li>
        <li>연락처: (추후 입력)</li>
      </ul>

      <h2 className="text-lg font-semibold mt-10 mb-3">9. 시행일자</h2>
      <p className="mb-4 leading-relaxed">
        이 개인정보처리방침은 2026년 7월 28일부터 적용됩니다.
      </p>
    </main>
  );
}
