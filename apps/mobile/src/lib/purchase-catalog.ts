import { AppError } from "./errors";

export const cloverProducts = [1, 3, 5, 10].map((cloverAmount) => ({
  cloverAmount,
  productId: `haenael.cheer.clover.${cloverAmount}`,
  storePrice: cloverAmount * 1200,
  tossPrice: cloverAmount * 1100
}));

export type StoreProvider = "APPLE" | "GOOGLE_PLAY";
export type PurchaseProvider = StoreProvider | "GOOGLE_ALTERNATIVE";

export function availableProviders(os: string): PurchaseProvider[] {
  return os === "ios" ? ["APPLE"] : ["GOOGLE_PLAY", "GOOGLE_ALTERNATIVE"];
}

export function productForAmount(amount: number) {
  const product = cloverProducts.find((item) => item.cloverAmount === amount);
  if (!product) throw new AppError("invalid_product", "클로버 수량을 다시 골라 주세요.");
  return product;
}
