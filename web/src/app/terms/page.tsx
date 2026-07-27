// terms/page.tsx — 이용약관 (법정 고지)
export default function TermsPage() {
  return (
    <main className="max-w-2xl mx-auto px-6 py-16" data-testid="terms-page">
      <h1 className="text-2xl font-bold mb-6">이용약관</h1>

      <p className="text-sm text-muted-foreground mb-10">
        본 약관은 표준 이용약관 템플릿을 기반으로 &ldquo;해낼게&rdquo;
        서비스의 실제 기능에 맞춰 작성되었으며, 정식 법률 검토를 대체하지
        않는 잠정 문서입니다. 서비스 확장 및 기능 활성화(결제 등)에 따라
        개정될 수 있습니다.
      </p>

      <h2 className="text-lg font-semibold mt-10 mb-3">제1조 (목적)</h2>
      <p className="mb-4 leading-relaxed">
        이 약관은 &ldquo;해낼게&rdquo;(이하 &ldquo;회사&rdquo;)가 제공하는
        목표 선언 및 응원 서비스(이하 &ldquo;서비스&rdquo;)의 이용과
        관련하여 회사와 회원 간의 권리, 의무 및 책임사항, 기타 필요한
        사항을 규정함을 목적으로 합니다.
      </p>

      <h2 className="text-lg font-semibold mt-10 mb-3">제2조 (정의)</h2>
      <ul className="list-disc pl-5 space-y-2 leading-relaxed mb-4">
        <li>
          <strong>회원</strong>: 카카오 소셜 로그인을 통해 회원가입을 완료하고
          서비스를 이용하는 자를 말합니다.
        </li>
        <li>
          <strong>목표</strong>: 회원이 &ldquo;○○ 해낼게&rdquo;와 같이
          서비스 내에 선언하는 개인 목표(제목, 사유, 기한 등으로 구성된
          &ldquo;목표 액자&rdquo;)를 말합니다.
        </li>
        <li>
          <strong>응원</strong>: 회원 또는 이용자가 다른 회원의 목표에
          대해 클로버를 결제하여 지지의 뜻을 표시하는 행위를 말합니다.
        </li>
        <li>
          <strong>클로버</strong>: 응원 시 사용되는 서비스 내 가상의 단위를
          말합니다. 목표를 선언한 회원은 자신에게 모인 클로버를 서비스
          정책에 따라 환전(현금화) 신청할 수 있으며, 환전 기능은 제7조에서
          정한 바에 따릅니다.
        </li>
        <li>
          <strong>워드맵</strong>: 회원이 받은 응원 메시지를 시각화하여
          공유할 수 있도록 제공되는 이미지 형태의 결과물을 말합니다.
        </li>
      </ul>

      <h2 className="text-lg font-semibold mt-10 mb-3">
        제3조 (서비스의 제공 및 변경)
      </h2>
      <ul className="list-disc pl-5 space-y-1 leading-relaxed mb-4">
        <li>목표 작성 및 목표 페이지 공유</li>
        <li>다른 회원의 목표에 대한 응원(클로버 결제) — 기능 활성화 시</li>
        <li>응원 메시지 기반 워드맵 생성 및 공유</li>
        <li>부적절한 콘텐츠에 대한 신고 접수</li>
        <li>서비스 관련 알림(인앱 및 카카오 알림톡) 발송</li>
      </ul>
      <p className="mb-4 leading-relaxed">
        회사는 서비스의 내용, 운영상 또는 기술상 필요에 따라 제공하는 서비스의
        전부 또는 일부를 변경할 수 있으며, 이 경우 변경 사유와 내용 등을
        사전에 공지합니다. 다만 긴급한 보안 문제 등 불가피한 경우 사후에
        공지할 수 있습니다.
      </p>

      <h2 className="text-lg font-semibold mt-10 mb-3">
        제4조 (회원가입)
      </h2>
      <p className="mb-4 leading-relaxed">
        회원가입은 이용자가 카카오 소셜 로그인을 통해 본인의 카카오 계정
        정보 제공에 동의하고, 회사가 이를 확인하여 승낙함으로써 체결됩니다.
        회사는 다음 각 호에 해당하는 신청에 대하여는 승낙을 하지 않거나
        사후에 이용계약을 해지할 수 있습니다.
      </p>
      <ul className="list-disc pl-5 space-y-1 leading-relaxed mb-4">
        <li>타인의 명의 또는 정보를 도용하여 신청한 경우</li>
        <li>허위의 정보를 기재하거나 회사가 제시하는 내용을 기재하지 않은 경우</li>
        <li>이전에 이 약관 위반 등으로 이용 제한을 받은 이력이 있는 경우</li>
      </ul>

      <h2 className="text-lg font-semibold mt-10 mb-3">
        제5조 (회원의 의무)
      </h2>
      <p className="mb-2 leading-relaxed">회원은 다음 행위를 하여서는 안 됩니다.</p>
      <ul className="list-disc pl-5 space-y-1 leading-relaxed mb-4">
        <li>회원가입 시 또는 목표/응원 작성 시 허위 정보를 등록하는 행위</li>
        <li>타인의 계정 또는 개인정보를 도용하는 행위</li>
        <li>
          서비스를 이용하여 법령 또는 공서양속에 반하는 정보를 게시하거나
          타인을 비방·모욕하는 행위
        </li>
        <li>
          비정상적인 방법으로 클로버를 취득하거나 시스템 취약점을 이용해
          부정한 이익을 얻으려는 행위
        </li>
        <li>서비스의 안정적 운영을 방해할 수 있는 일체의 부정이용 행위</li>
      </ul>

      <h2 className="text-lg font-semibold mt-10 mb-3">
        제6조 (서비스 이용제한 및 계정 정지)
      </h2>
      <p className="mb-2 leading-relaxed">
        회사는 회원이 제5조를 위반하거나 다른 회원으로부터 신고가 접수되어
        운영자 확인 결과 서비스 운영 정책에 반하는 것으로 판단되는 경우,
        해당 목표·응원 메시지 등 콘텐츠를 삭제하거나 회원의 서비스 이용을
        제한할 수 있습니다.
      </p>
      <ul className="list-disc pl-5 space-y-1 leading-relaxed mb-4">
        <li>
          신고 처리는 현재 운영자의 수동 검토를 통해 이루어지며(자동 제재
          시스템 아님), 검토 결과에 따라 대상 콘텐츠를 소프트 삭제할 수
          있습니다.
        </li>
        <li>
          이용제한에 이의가 있는 회원은 제11조의 문의처를 통해 소명할 수
          있습니다.
        </li>
      </ul>

      <h2 className="text-lg font-semibold mt-10 mb-3">
        제7조 (유료 서비스 — 응원 결제 및 환전)
      </h2>
      <p className="mb-2 leading-relaxed">
        현재 &ldquo;해낼게&rdquo;의 응원 결제 기능은 준비 중이며 비활성화되어
        있습니다(<code>PAYMENTS_ENABLED=false</code>). 결제 기능이
        활성화되는 경우, 결제는 토스페이먼츠를 통해 처리되며 별도의 안내와
        함께 관련 약관(전자금융거래 등)이 추가로 적용될 수 있습니다.
      </p>
      <ul className="list-disc pl-5 space-y-2 leading-relaxed mb-4">
        <li>
          <strong>서비스 이용수수료</strong>: 회원이 목표에 대해 받은 클로버를
          환전(현금화)할 때, 회사는 지급액에서 서비스 이용수수료{" "}
          <strong>5%(및 그에 대한 부가가치세 10% 별도 가산)</strong>를
          차감합니다. 계산 순서는 (1) 환전 대상 클로버(웰컴 클로버 제외,
          친구 응원분만) → (2) 원화 환산액에서 서비스 이용수수료 5%+VAT
          차감 → (3) 남은 금액에 대해 사업소득 원천징수 3.3%를 추가 차감한
          금액을 최종 지급합니다. 실제 차감 내역은 환전 신청 화면에서 신청
          시점 기준으로 항목별로 표시됩니다.
        </li>
        <li>
          <strong>원천징수</strong>: 클로버 환전으로 회원에게 지급되는 금액은
          세법상 기타소득 또는 사업소득으로 취급될 수 있으며, 관계 법령에
          따라 지급액의 3.3%(지방소득세 포함)를 원천징수한 후 차인지급합니다.
          원천징수 영수증 발급 등 세무 관련 사항은 회사가 관계 법령이 정한
          절차에 따라 처리합니다.
        </li>
        <li>
          <strong>환불 및 청약철회</strong>: 회원(응원 결제자)은 「전자상거래
          등에서의 소비자보호에 관한 법률」에 따라 결제일로부터 7일 이내에
          한하여 청약철회(환불)를 요청할 수 있습니다. 다만 다음의 경우 청약철회가
          제한될 수 있습니다 — ① 응원 대상 목표의 수령인이 이미 해당 클로버를
          환전(현금화) 신청하여 지급 절차가 개시된 경우, ② 응원 메시지가
          워드맵 등 서비스 화면에 공개되어 수령인이 이를 확인한 것으로
          합리적으로 인정되는 경우. 환불이 제한되는 경우 회사는 그 사유를
          구체적으로 안내합니다. 환불 요청은 제11조의 문의처를 통해 접수하며,
          해낼게는 현재 자동환불 시스템을 운영하지 않아 운영자가
          결제대행사(토스페이먼츠) 콘솔을 통해 수동으로 처리합니다.
        </li>
        <li>
          <strong>클로버 환전 요건</strong>: 클로버를 실제 현금으로 환전하는
          기능은 현재 버전에서 명시적으로 비활성화되어 있습니다. 향후
          활성화되는 경우 회원은 제7조의2에서 정한 본인인증(KYC) 절차를
          완료해야 하며, 최소 환전 클로버 수량(현재 정책상 30클로버) 도달
          여부는 웰컴 클로버를 포함하여 판단하되, 실제 지급액은 웰컴
          클로버를 제외한 친구 응원분에 대해서만 산정합니다.
        </li>
      </ul>

      <h2 className="text-lg font-semibold mt-10 mb-3">
        제7조의2 (환전 시 본인인증 — KYC)
      </h2>
      <p className="mb-2 leading-relaxed">
        클로버 환전은 실질적으로 회원에게 금전을 지급하는 절차이므로, 회사는
        「전자금융거래법」·「특정 금융거래정보의 보고 및 이용 등에 관한
        법률」등 관계 법령이 정하는 범위에서 아래와 같은 본인확인 절차를
        요구할 수 있습니다.
      </p>
      <ul className="list-disc pl-5 space-y-2 leading-relaxed mb-4">
        <li>
          <strong>본인인증(휴대폰 PASS 등)</strong>: 실명, 생년월일, 성인
          여부, 통신사, CI/DI 등 본인확인기관이 제공하는 인증 결과값을
          수집·확인합니다.
        </li>
        <li>
          <strong>계좌 실명 확인</strong>: 환전금을 지급받을 계좌는 회원 본인
          명의의 계좌여야 하며, 회사는 예금주 조회(계좌실명확인) API 등을
          통해 계좌 명의와 본인인증 명의의 일치 여부를 확인합니다.
        </li>
        <li>
          <strong>명의 불일치 시 처리</strong>: 본인인증 명의와 환전 계좌
          명의가 일치하지 않는 경우, 회사는 해당 환전 신청을 보류 또는
          거부할 수 있으며, 회원에게 명의 일치를 위한 재확인을 요청할 수
          있습니다. 타인 명의 계좌로의 우회 지급은 허용되지 않습니다.
        </li>
        <li>
          본인인증·계좌 실명 정보의 수집·보관은 개인정보처리방침에서 정한
          암호화·접근제어 조치에 따르며, 목적 달성 또는 관계 법령이 정한
          보관기간 경과 시 파기합니다.
        </li>
      </ul>

      <h2 className="text-lg font-semibold mt-10 mb-3">
        제7조의3 (클로버의 유효기간 및 소멸 — 낙전수입)
      </h2>
      <ul className="list-disc pl-5 space-y-2 leading-relaxed mb-4">
        <li>
          <strong>유효기간</strong>: 클로버는 적립일로부터{" "}
          <strong>5년간</strong> 유효합니다(「상법」상 상사채권 소멸시효에
          준함). 유효기간이 경과한 클로버는 환전 대상에서 제외되며 잔액에서
          소멸 처리됩니다.
        </li>
        <li>
          <strong>소멸 전 고지</strong>: 회사는 클로버가 소멸되기 최소 30일
          전, 회원이 등록한 연락처(카카오 알림톡 또는 인앱 알림)로 소멸
          예정 사실과 잔여 수량을 고지합니다.
        </li>
        <li>
          <strong>회원 탈퇴 시</strong>: 탈퇴 즉시 미환전 클로버는 환전
          대상에서 제외되며, 탈퇴일로부터 30일 이내에 환전을 신청하지 않으면
          소멸됩니다.
        </li>
        <li>
          <strong>웰컴 클로버</strong>: 웰컴 클로버(회사가 목표 생성 시 무상
          지급하는 클로버)는 애초에 환전(현금화) 대상이 아니며, 해당 목표가
          삭제되는 경우 잔액에서도 함께 무효화됩니다.
        </li>
        <li>
          소멸된 클로버로 인해 회사에 발생하는 이익(낙전수입)은 회사의
          운영 재원으로 사용되며, 그 규모가 유의미한 경우 투명성 제고를
          위해 연 1회 이상 서비스 내 공지를 통해 소멸 클로버 총량을
          고지합니다.
        </li>
      </ul>

      <h2 className="text-lg font-semibold mt-10 mb-3">
        제8조 (면책조항)
      </h2>
      <ul className="list-disc pl-5 space-y-1 leading-relaxed mb-4">
        <li>
          회사는 천재지변, 불가항력, 회원의 귀책사유 등으로 서비스를
          제공할 수 없는 경우 그에 대한 책임을 지지 않습니다.
        </li>
        <li>
          회사는 회원이 게시한 목표, 응원 메시지 등 콘텐츠의 정확성이나
          신뢰성에 대해 보증하지 않으며, 회원 간에 발생한 분쟁에 대해
          개입할 의무를 지지 않습니다.
        </li>
        <li>
          회사는 관계 법령이 허용하는 범위 내에서 서비스 이용과 관련하여
          회원에게 발생한 손해에 대한 책임을 제한할 수 있습니다.
        </li>
      </ul>

      <h2 className="text-lg font-semibold mt-10 mb-3">
        제9조 (분쟁해결 및 관할법원)
      </h2>
      <p className="mb-4 leading-relaxed">
        이 약관에서 정하지 않은 사항과 이 약관의 해석에 관하여는 관계
        법령 및 상관례에 따릅니다. 회사와 회원 간 발생한 분쟁에 관한
        소송은 민사소송법상의 관할법원에 제기하는 것을 원칙으로 합니다.
      </p>

      <h2 className="text-lg font-semibold mt-10 mb-3">
        제10조 (환전 지급 기준 요약)
      </h2>
      <p className="mb-2 leading-relaxed">
        회원의 이해를 돕기 위해 제7조~제7조의3의 환전 지급 계산식을 요약하면
        다음과 같습니다.
      </p>
      <ul className="list-disc pl-5 space-y-1 leading-relaxed mb-4">
        <li>지급 대상 클로버 = 총 잔액 − 웰컴 클로버 − 유효기간 경과분</li>
        <li>원화 환산액 = 지급 대상 클로버 × 클로버당 환산 단가</li>
        <li>서비스 이용수수료 = 원화 환산액 × 5%(+VAT 10% 별도 가산)</li>
        <li>원천징수 = (원화 환산액 − 서비스 이용수수료) × 3.3%</li>
        <li>최종 지급액 = 원화 환산액 − 서비스 이용수수료(+VAT) − 원천징수</li>
      </ul>

      <h2 className="text-lg font-semibold mt-10 mb-3">
        제11조 (문의처)
      </h2>
      <ul className="list-disc pl-5 space-y-1 leading-relaxed mb-4">
        <li>담당자: (추후 입력)</li>
        <li>이메일: (추후 입력)</li>
        <li>연락처: (추후 입력)</li>
      </ul>

      <h2 className="text-lg font-semibold mt-10 mb-3">부칙</h2>
      <p className="mb-4 leading-relaxed">
        이 약관은 2026년 7월 21일부터 적용됩니다. (제7조·제7조의2·제7조의3·제10조 신설 —
        서비스 이용수수료·원천징수·환불/청약철회·낙전수입(클로버 유효기간)·환전 시
        본인인증(KYC) 조항 추가)
      </p>
    </main>
  );
}
