import type { Page } from "@playwright/test";

type RawImageDiagnostic = {
  url: string;
  loading: string;
  visible: "viewport" | "offscreen";
};

export type VisualImageScopeSnapshot = {
  hiddenByAttribute: boolean;
  display: string;
  visibility: string;
  width: number;
  height: number;
};

export function sanitizeVisualAssetUrl(rawUrl: string, baseUrl: string) {
  if (!rawUrl) return "empty";
  if (rawUrl.startsWith("data:")) {
    return rawUrl.slice(0, rawUrl.indexOf(",") > 0 ? rawUrl.indexOf(",") : 32);
  }
  try {
    const url = new URL(rawUrl, baseUrl);
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return "invalid-url";
  }
}

export function isVisualImageSnapshotInScope(snapshot: VisualImageScopeSnapshot) {
  return !snapshot.hiddenByAttribute
    && snapshot.display !== "none"
    && snapshot.visibility !== "hidden"
    && snapshot.visibility !== "collapse"
    && snapshot.width > 0
    && snapshot.height > 0;
}

function sanitizeDiagnostics(diagnostics: RawImageDiagnostic[], baseUrl: string) {
  return diagnostics.map((diagnostic) => ({
    ...diagnostic,
    url: sanitizeVisualAssetUrl(diagnostic.url, baseUrl),
  }));
}

export async function waitForVisualAssets(page: Page) {
  try {
    await page.waitForFunction(() => document.fonts.status === "loaded", undefined, {
      timeout: 15_000,
    });
  } catch (error) {
    const fonts = page.isClosed() ? { status: "page-closed", pending: [] } : await page.evaluate(() => ({
      status: document.fonts.status,
      pending: Array.from(document.fonts)
        .filter((font) => font.status !== "loaded")
        .map((font) => ({ family: font.family, status: font.status })),
    }));
    throw new Error(`visual_fonts_not_ready ${JSON.stringify(fonts)}`, { cause: error });
  }

  const initial = await page.evaluate(async () => {
    const inScope = (image: HTMLImageElement) => {
      if (image.closest('[hidden],[aria-hidden="true"],[inert]')) return false;
      const style = getComputedStyle(image);
      const rect = image.getBoundingClientRect();
      return style.display !== "none"
        && style.visibility !== "hidden"
        && style.visibility !== "collapse"
        && rect.width > 0
        && rect.height > 0;
    };
    const describe = (image: HTMLImageElement) => {
      const rect = image.getBoundingClientRect();
      return {
        url: image.currentSrc || image.src,
        loading: image.loading || "auto",
        visible: rect.bottom > 0 && rect.right > 0
          && rect.top < window.innerHeight && rect.left < window.innerWidth
          ? "viewport" as const
          : "offscreen" as const,
      };
    };
    const pending = Array.from(document.images).filter((image) => inScope(image) && !image.complete);
    const scrollPositions = new Map<Element, { left: number; top: number }>();
    if (document.scrollingElement) {
      scrollPositions.set(document.scrollingElement, {
        left: document.scrollingElement.scrollLeft,
        top: document.scrollingElement.scrollTop,
      });
    }
    for (const image of pending) {
      for (let node = image.parentElement; node; node = node.parentElement) {
        if ((node.scrollHeight > node.clientHeight || node.scrollWidth > node.clientWidth)
          && !scrollPositions.has(node)) {
          scrollPositions.set(node, { left: node.scrollLeft, top: node.scrollTop });
        }
      }
    }
    const scope = globalThis as typeof globalThis & {
      __e2eVisualReadyRestore?: {
        loading: ReadonlyArray<readonly [HTMLImageElement, string | null]>;
        scroll: Array<readonly [Element, number, number]>;
      };
    };
    scope.__e2eVisualReadyRestore = {
      loading: pending.map((image) => [image, image.getAttribute("loading")] as const),
      scroll: Array.from(scrollPositions, ([element, position]) => [
        element,
        position.left,
        position.top,
      ] as const),
    };
    const diagnostics = pending.map(describe);
    for (const image of pending) image.loading = "eager";
    for (const image of pending) {
      image.scrollIntoView({ block: "center", inline: "nearest" });
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    }
    return { baseUrl: document.baseURI, diagnostics };
  });
  const pendingDiagnostics = sanitizeDiagnostics(initial.diagnostics, initial.baseUrl);
  if (pendingDiagnostics.length > 0) {
    console.info("VISUAL_ASSET_LAZY_TRIGGER", JSON.stringify(pendingDiagnostics));
  }

  let waitError: unknown;
  let incomplete: RawImageDiagnostic[] = [];
  try {
    await page.waitForFunction(() => Array.from(document.images).every((image) => {
      if (image.closest('[hidden],[aria-hidden="true"],[inert]')) return true;
      const style = getComputedStyle(image);
      const rect = image.getBoundingClientRect();
      const inScope = style.display !== "none"
        && style.visibility !== "hidden"
        && style.visibility !== "collapse"
        && rect.width > 0
        && rect.height > 0;
      return !inScope || image.complete;
    }), undefined, { timeout: 15_000 });
  } catch (error) {
    waitError = error;
    incomplete = page.isClosed() ? initial.diagnostics : await page.evaluate(() => Array.from(document.images)
      .filter((image) => {
        const style = getComputedStyle(image);
        const rect = image.getBoundingClientRect();
        return !image.closest('[hidden],[aria-hidden="true"],[inert]')
          && style.display !== "none"
          && style.visibility !== "hidden"
          && style.visibility !== "collapse"
          && rect.width > 0
          && rect.height > 0
          && !image.complete;
      })
      .map((image) => {
        const rect = image.getBoundingClientRect();
        return {
          url: image.currentSrc || image.src,
          loading: image.loading || "auto",
          visible: rect.bottom > 0 && rect.right > 0
            && rect.top < window.innerHeight && rect.left < window.innerWidth
            ? "viewport" as const
            : "offscreen" as const,
        };
      }));
  } finally {
    if (!page.isClosed()) {
      await page.evaluate(() => {
        const scope = globalThis as typeof globalThis & {
          __e2eVisualReadyRestore?: {
            loading: ReadonlyArray<readonly [HTMLImageElement, string | null]>;
            scroll: Array<readonly [Element, number, number]>;
          };
        };
        const restore = scope.__e2eVisualReadyRestore;
        if (!restore) return;
        for (const [image, loading] of restore.loading) {
          if (loading === null) image.removeAttribute("loading");
          else image.setAttribute("loading", loading);
        }
        for (const [element, left, top] of restore.scroll) element.scrollTo(left, top);
        delete scope.__e2eVisualReadyRestore;
      });
    }
  }
  if (waitError) {
    throw new Error(
      `visual_images_not_complete ${JSON.stringify(sanitizeDiagnostics(incomplete, initial.baseUrl))}`,
      { cause: waitError },
    );
  }

  const broken = await page.evaluate(async () => {
    const failures: RawImageDiagnostic[] = [];
    for (const image of Array.from(document.images)) {
      if (image.closest('[hidden],[aria-hidden="true"],[inert]')) continue;
      const style = getComputedStyle(image);
      const rect = image.getBoundingClientRect();
      if (style.display === "none" || style.visibility === "hidden"
        || style.visibility === "collapse" || rect.width <= 0 || rect.height <= 0) continue;
      try {
        if (image.naturalWidth <= 0) throw new Error("broken");
        await image.decode();
      } catch {
        failures.push({
          url: image.currentSrc || image.src,
          loading: image.loading || "auto",
          visible: rect.bottom > 0 && rect.right > 0
            && rect.top < window.innerHeight && rect.left < window.innerWidth
            ? "viewport"
            : "offscreen",
        });
      }
    }
    return { baseUrl: document.baseURI, failures };
  });
  if (broken.failures.length > 0) {
    throw new Error(
      `visual_images_broken ${JSON.stringify(sanitizeDiagnostics(broken.failures, broken.baseUrl))}`,
    );
  }
}
