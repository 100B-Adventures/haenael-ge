import { createElement } from "react";
import { render } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import {
  SensitiveNavigationBoundary,
  shouldUseDocumentNavigation,
} from "../SensitiveNavigationBoundary";

it("결제·초대 내부 링크만 새 document navigation 경계로 보낸다", () => {
  const origin = "https://haenael.app";

  expect(shouldUseDocumentNavigation("/payment/success?paymentKey=secret", origin)).toBe(true);
  expect(shouldUseDocumentNavigation("/invite/private-token", origin)).toBe(true);
  expect(shouldUseDocumentNavigation("/friends", origin)).toBe(false);
  expect(shouldUseDocumentNavigation("https://example.com/invite/token", origin)).toBe(false);
});

it("민감 내부 링크 클릭에서 SPA handler로 전파되기 전에 기본 이동을 가로챈다", () => {
  const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
  render(createElement(SensitiveNavigationBoundary));
  const anchor = document.createElement("a");
  anchor.href = "/invite/private-token";
  anchor.textContent = "초대";
  document.body.appendChild(anchor);

  const event = new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 });
  anchor.dispatchEvent(event);

  expect(event.defaultPrevented).toBe(true);
  anchor.remove();
  consoleError.mockRestore();
});
