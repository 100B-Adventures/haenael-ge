
// privacy/page.tsx — 개인정보처리방침 (법정 고지)

import { PRODUCT_COPY } from "@/lib/copy/generated/app-privacy-page";
import { AnalyticsConsentControls } from "@/components/analytics/AnalyticsConsentControls";

export default function PrivacyPage() {
  return (
    <main className="max-w-2xl mx-auto px-6 py-16" data-testid="privacy-page">
      <h1 className="text-2xl font-bold mb-6">{PRODUCT_COPY.TEXT_001}</h1>

      <p className="text-sm text-muted-foreground mb-10">{PRODUCT_COPY.TEXT_002}</p>

      <p className="mb-8 leading-relaxed">{PRODUCT_COPY.TEXT_003}</p>

      <h2 className="text-lg font-semibold mt-10 mb-3">{PRODUCT_COPY.TEXT_004}</h2>
      <p className="mb-2 leading-relaxed">{PRODUCT_COPY.TEXT_005}</p>
      <ul className="list-disc pl-5 space-y-2 leading-relaxed mb-4">
        <li>
          <strong>{PRODUCT_COPY.TEXT_006}</strong>{PRODUCT_COPY.TEXT_007}<ul className="list-disc pl-5 mt-2 space-y-1">
            <li>
              <strong>{PRODUCT_COPY.TEXT_008}</strong>{PRODUCT_COPY.TEXT_009}</li>
            <li>
              <strong>{PRODUCT_COPY.TEXT_010}</strong>{PRODUCT_COPY.TEXT_011}</li>
            <li>
              <strong>{PRODUCT_COPY.TEXT_012}</strong>{PRODUCT_COPY.TEXT_013}</li>
            <li>
              <strong>{PRODUCT_COPY.TEXT_014}</strong>{PRODUCT_COPY.TEXT_015}</li>
            <li>
              <strong>{PRODUCT_COPY.TEXT_016}</strong>{PRODUCT_COPY.TEXT_017}</li>
            <li>
              <strong>{PRODUCT_COPY.TEXT_018}</strong>{PRODUCT_COPY.TEXT_019}</li>
          </ul>{PRODUCT_COPY.TEXT_020}</li>
        <li>
          <strong>{PRODUCT_COPY.TEXT_021}</strong>{PRODUCT_COPY.TEXT_022}</li>
        <li>
          <strong>{PRODUCT_COPY.TEXT_023}</strong>{PRODUCT_COPY.TEXT_024}</li>
        <li>
          <strong>{PRODUCT_COPY.TEXT_025}</strong>{PRODUCT_COPY.TEXT_026}</li>
        <li>
          <strong>{PRODUCT_COPY.TEXT_027}</strong>{PRODUCT_COPY.TEXT_028}</li>
        <li>
          <strong>{PRODUCT_COPY.TEXT_029}</strong>{PRODUCT_COPY.TEXT_030}</li>
        <li>
          <strong>{PRODUCT_COPY.TEXT_031}</strong>{PRODUCT_COPY.TEXT_032}</li>
        <li>
          <strong>{PRODUCT_COPY.TEXT_033}</strong>{PRODUCT_COPY.TEXT_034}<ul className="list-disc pl-5 mt-2 space-y-1">
            <li>{PRODUCT_COPY.TEXT_035}</li>
            <li>{PRODUCT_COPY.TEXT_036}<strong>{PRODUCT_COPY.TEXT_037}</strong>{PRODUCT_COPY.TEXT_038}</li>
          </ul>
        </li>
      </ul>
      <p className="mb-4 leading-relaxed">{PRODUCT_COPY.TEXT_039}</p>

      <h2 className="text-lg font-semibold mt-10 mb-3">{PRODUCT_COPY.TEXT_040}</h2>
      <ul className="list-disc pl-5 space-y-1 leading-relaxed mb-4">
        <li>{PRODUCT_COPY.TEXT_041}</li>
        <li>{PRODUCT_COPY.TEXT_042}</li>
        <li>{PRODUCT_COPY.TEXT_043}</li>
        <li>{PRODUCT_COPY.TEXT_044}</li>
        <li>{PRODUCT_COPY.TEXT_045}</li>
        <li>{PRODUCT_COPY.TEXT_046}</li>
        <li>{PRODUCT_COPY.TEXT_047}</li>
        <li>{PRODUCT_COPY.TEXT_048}</li>
        <li>{PRODUCT_COPY.TEXT_049}</li>
        <li>{PRODUCT_COPY.TEXT_050}</li>
      </ul>

      <h2 className="text-lg font-semibold mt-10 mb-3">{PRODUCT_COPY.TEXT_051}</h2>
      <p className="mb-2 leading-relaxed">{PRODUCT_COPY.TEXT_052}</p>
      <ul className="list-disc pl-5 space-y-1 leading-relaxed mb-4">
        <li>{PRODUCT_COPY.TEXT_053}</li>
        <li>{PRODUCT_COPY.TEXT_054}</li>
        <li>{PRODUCT_COPY.TEXT_055}</li>
        <li>{PRODUCT_COPY.TEXT_056}</li>
      </ul>
      <p className="mb-4 leading-relaxed">{PRODUCT_COPY.TEXT_057}</p>
      <p className="mb-4 leading-relaxed">{PRODUCT_COPY.TEXT_058}<strong>{PRODUCT_COPY.TEXT_059}</strong>{PRODUCT_COPY.TEXT_060}</p>
      <p className="mb-4 leading-relaxed">{PRODUCT_COPY.TEXT_061}</p>

      <h2 className="text-lg font-semibold mt-10 mb-3">{PRODUCT_COPY.TEXT_062}</h2>
      <p className="mb-2 leading-relaxed">{PRODUCT_COPY.TEXT_063}</p>
      <p className="mb-2 leading-relaxed">{PRODUCT_COPY.TEXT_064}{" "}
        <strong>{PRODUCT_COPY.TEXT_065}</strong>{PRODUCT_COPY.TEXT_066}</p>
      <ul className="list-disc pl-5 space-y-2 leading-relaxed mb-4">
        <li>
          <strong>Supabase</strong>{PRODUCT_COPY.TEXT_067}</li>
        <li>
          <strong>Vercel</strong>{PRODUCT_COPY.TEXT_068}</li>
        <li>
          <strong>{PRODUCT_COPY.TEXT_069}</strong>{PRODUCT_COPY.TEXT_070}</li>
        <li>
          <strong>{PRODUCT_COPY.TEXT_071}</strong>{PRODUCT_COPY.TEXT_072}</li>
        <li>
          <strong>{PRODUCT_COPY.TEXT_073}</strong>{PRODUCT_COPY.TEXT_074}<strong>{PRODUCT_COPY.TEXT_075}</strong>{PRODUCT_COPY.TEXT_076}</li>
        <li>
          <strong>Google Analytics(GA4)</strong>{PRODUCT_COPY.TEXT_077}</li>
        <li>
          <strong>Microsoft Clarity</strong>{PRODUCT_COPY.TEXT_104}</li>
        <li>
          <strong>Meta 픽셀</strong>{PRODUCT_COPY.TEXT_105}</li>
      </ul>
      <p className="mb-4 leading-relaxed">{PRODUCT_COPY.TEXT_080}</p>

      <h3 className="font-semibold mt-6 mb-2">{PRODUCT_COPY.TEXT_106}</h3>
      <p className="mb-2 leading-relaxed">{PRODUCT_COPY.TEXT_107}</p>
      <ul className="list-disc pl-5 space-y-2 leading-relaxed mb-4">
        <li>
          <strong>Google Analytics(GA4)</strong>{PRODUCT_COPY.TEXT_108}{" "}
          <a className="underline" href="https://support.google.com/policies/contact/general_privacy_form">
            Google 개인정보 문의
          </a>{" "}
          및 <a className="underline" href="https://tools.google.com/dlpage/gaoptout">{PRODUCT_COPY.TEXT_109}</a>.
        </li>
        <li>
          <strong>Microsoft Clarity</strong>{PRODUCT_COPY.TEXT_111}
        </li>
        <li>
          <strong>Meta 픽셀</strong>{PRODUCT_COPY.TEXT_112}{" "}
          <a className="underline" href="https://www.facebook.com/adpreferences">
            {PRODUCT_COPY.TEXT_113}
          </a>{" "}
          또는 <a className="underline" href="https://www.facebook.com/privacy/policy/">Meta 개인정보처리방침</a>.
        </li>
      </ul>
      <p className="mb-4 leading-relaxed">{PRODUCT_COPY.TEXT_115}</p>
      <AnalyticsConsentControls />

      <h2 className="text-lg font-semibold mt-10 mb-3">{PRODUCT_COPY.TEXT_081}</h2>
      <p className="mb-2 leading-relaxed">{PRODUCT_COPY.TEXT_082}</p>
      <p className="mb-4 leading-relaxed">{PRODUCT_COPY.TEXT_083}</p>

      <h2 className="text-lg font-semibold mt-10 mb-3">{PRODUCT_COPY.TEXT_084}</h2>
      <p className="mb-4 leading-relaxed">{PRODUCT_COPY.TEXT_085}</p>
      <ul className="list-disc pl-5 space-y-1 leading-relaxed mb-4">
        <li>{PRODUCT_COPY.TEXT_086}</li>
        <li>{PRODUCT_COPY.TEXT_087}</li>
        <li>{PRODUCT_COPY.TEXT_088}</li>
        <li>{PRODUCT_COPY.TEXT_089}</li>
      </ul>

      <h2 className="text-lg font-semibold mt-10 mb-3">{PRODUCT_COPY.TEXT_090}</h2>
      <p className="mb-2 leading-relaxed">{PRODUCT_COPY.TEXT_091}</p>
      <ul className="list-disc pl-5 space-y-2 leading-relaxed mb-4">
        <li>
          <strong>{PRODUCT_COPY.TEXT_092}</strong>{PRODUCT_COPY.TEXT_093}</li>
        <li>
          <strong>{PRODUCT_COPY.TEXT_094}</strong>{PRODUCT_COPY.TEXT_095}</li>
        <li>{PRODUCT_COPY.TEXT_096}</li>
      </ul>

      <h2 className="text-lg font-semibold mt-10 mb-3">{PRODUCT_COPY.TEXT_097}</h2>
      <p className="mb-4 leading-relaxed">{PRODUCT_COPY.TEXT_098}</p>
      <ul className="list-disc pl-5 space-y-1 leading-relaxed mb-4">
        <li>{PRODUCT_COPY.TEXT_099}</li>
        <li>{PRODUCT_COPY.TEXT_100}</li>
        <li>{PRODUCT_COPY.TEXT_101}</li>
      </ul>

      <h2 className="text-lg font-semibold mt-10 mb-3">{PRODUCT_COPY.TEXT_102}</h2>
      <p className="mb-4 leading-relaxed">{PRODUCT_COPY.TEXT_103}</p>
    </main>
  );
}
