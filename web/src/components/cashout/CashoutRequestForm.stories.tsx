import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { CashoutRequestForm } from "./CashoutRequestForm";

/**
 * 환전 신청 폼을 로그인 없이 단독으로 띄운다.
 *
 * 왜 필요한가.
 *   승인 시안 v3.7 과 실제 화면이 어긋나는지 확인하려면 화면을 눈으로 봐야 한다.
 *   그런데 이 폼은 로그인한 사용자만 볼 수 있어서, 확인하려면 로컬 데이터베이스를
 *   띄우고 인증 세션을 만들어야 했다. 2026-08-27 에 그 로컬 환경이 올라오지 않아
 *   고친 화면을 아무도 못 보는 상태가 됐다.
 *
 *   스토리로 만들면 데이터베이스 없이 화면만 띄울 수 있다. 시안과 나란히 놓고
 *   대조하는 데 이게 가장 빠른 길이다.
 */
const meta = {
  title: "Cashout/CashoutRequestForm",
  component: CashoutRequestForm,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <div className="mx-auto w-[390px] bg-background">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof CashoutRequestForm>;

export default meta;
type Story = StoryObj<typeof meta>;

const base: React.ComponentProps<typeof CashoutRequestForm> = {
  cashoutEnabled: true,
  reachedThreshold: true,
  payableAmount: 40,
  totalBalance: 52,
  minCashoutClover: 30,
  currentCashout: null,
  history: [],
  initialPhone: "01012345678",
};

/** 신청 단계. 금액과 계좌를 입력하는 첫 화면이다. */
export const Form: Story = { args: { ...base } };

/**
 * 확인 단계. 시안은 계좌와 금액과 잠금 안내만 있는 전용 화면이고,
 * 개발 화면도 그렇게 보여야 한다. 2026-08-27 이전에는 이전 단계 내용이
 * 그대로 남아 시안의 2.6배 길이였다.
 *
 * 확인 단계로 넘어가려면 계좌 정보를 채우고 버튼을 눌러야 하므로
 * Storybook 에서는 play 함수로 그 조작을 재현한다.
 */
export const Confirm: Story = {
  args: { ...base },
  play: async ({ canvasElement }) => {
    const root = canvasElement;
    const setValue = (el: HTMLInputElement | HTMLSelectElement, value: string) => {
      const proto = el instanceof HTMLSelectElement
        ? HTMLSelectElement.prototype
        : HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
      setter?.call(el, value);
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    };

    const bank = root.querySelector<HTMLSelectElement>("select");
    if (bank) setValue(bank, "KB");

    // 계좌·예금주 입력란에는 testid 가 없어 라벨 텍스트로 찾는다.
    const byLabel = (text: string) => {
      const label = Array.from(root.querySelectorAll("label"))
        .find((el) => el.textContent?.trim() === text);
      const id = label?.getAttribute("for");
      return id ? root.querySelector<HTMLInputElement>(`#${id}`) : null;
    };
    const account = byLabel("계좌번호");
    const holder = byLabel("예금주");
    if (account) setValue(account, "123456789012");
    if (holder) setValue(holder, "홍길동");

    const confirm = root.querySelector<HTMLButtonElement>('[data-testid="cashout-confirm-button"]');
    confirm?.click();
  },
};

/**
 * 로딩 단계. 신청을 보내는 중이다.
 * 확인 단계와 같은 문제였다. 시안은 전용 화면인데 개발은 이전 내용을 다 남기고
 * 로딩만 덧붙여 시안의 2.4배 길이였다.
 *
 * 확인 단계에서 신청 버튼을 누르면 서버로 요청이 나가는데, Storybook 에는 서버가
 * 없어 응답이 오지 않는다. 그 사이 로딩 화면이 유지되므로 그 상태를 캡처한다.
 */
export const Submitting: Story = {
  args: { ...base },
  play: async (ctx) => {
    await Confirm.play?.(ctx);
    const submit = ctx.canvasElement.querySelector<HTMLButtonElement>(
      '[data-testid="cashout-confirm-step"] button',
    );
    submit?.click();
  },
};
