import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "아동 보호 정책 | 해낼게",
  description: "해낼게의 아동·청소년 보호 원칙과 신고 및 지원 경로입니다.",
};

export default function ChildSafetyPage() {
  return (
    <main
      className="mx-auto max-w-2xl px-6 py-16 text-foreground"
      data-testid="child-safety-page"
    >
      <h1 className="mb-3 text-2xl font-bold">아동·청소년 보호 정책</h1>
      <p className="mb-8 text-sm text-muted-foreground">
        시행일 2026년 10월 22일
      </p>

      <p className="leading-relaxed">
        해낼게는 목표와 응원 메시지를 나누는 과정에서 아동·청소년이 성적 착취,
        학대, 괴롭힘, 협박이나 개인정보 노출의 대상이 되지 않도록 보호합니다.
        이 정책은 해낼게의 목표, 응원 메시지, 프로필과 신고 기능에 적용됩니다.
      </p>

      <h2 className="mb-3 mt-10 text-lg font-semibold">금지되는 행위</h2>
      <ul className="list-disc space-y-2 pl-5 leading-relaxed">
        <li>아동·청소년을 성적으로 대상화하거나 착취하는 콘텐츠와 접근</li>
        <li>그루밍, 만남 유도, 협박, 괴롭힘과 자해를 부추기는 행위</li>
        <li>학교, 연락처, 위치 등 아동·청소년을 식별할 수 있는 정보의 무단 공개</li>
        <li>불법 촬영물, 성착취물 또는 그 유통을 돕는 링크와 안내</li>
      </ul>

      <h2 className="mb-3 mt-10 text-lg font-semibold">신고와 대응</h2>
      <p className="leading-relaxed">
        관련 콘텐츠를 발견하면 대상 링크와 이유를 적어{" "}
        <a
          className="font-semibold text-primary underline"
          href="mailto:haenaelge.official@gmail.com?subject=%5B%EC%95%84%EB%8F%99%20%EB%B3%B4%ED%98%B8%20%EC%8B%A0%EA%B3%A0%5D"
        >
          haenaelge.official@gmail.com
        </a>
        으로 신고해 주세요. 신고자의 개인정보는 신고 처리에 필요한 범위에서만
        다룹니다. 회사는 신고 내용을 확인해 콘텐츠 접근 제한 또는 삭제, 계정
        제한, 증거 보존과 관계 기관 협조 등 필요한 조치를 검토합니다.
      </p>

      <h2 className="mb-3 mt-10 text-lg font-semibold">긴급한 피해</h2>
      <ul className="list-disc space-y-2 pl-5 leading-relaxed">
        <li>즉시 위험하거나 범죄가 의심되면 경찰 112</li>
        <li>청소년 상담과 보호 지원은 청소년전화 1388</li>
        <li>온라인 불법·유해정보 신고와 상담은 1377</li>
      </ul>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
        이 페이지는 법률 검토가 끝났다는 뜻이 아닙니다. 미성년자의 결제·지급,
        법정대리인 동의와 신원정보 처리 기준은 별도 법률 검토가 필요한 사항으로
        유지합니다.
      </p>
    </main>
  );
}
