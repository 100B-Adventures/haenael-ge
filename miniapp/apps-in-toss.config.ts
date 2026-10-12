import { defineConfig } from "@apps-in-toss/web-framework/config";

export default defineConfig({
  appName: "haenael-ge",
  brand: {
    primaryColor: "#1B8A4F",
  },
  permissions: [
    {
      name: "photos",
      access: "read",
    },
  ],
  navigationBar: {
    withBackButton: true,
    withTitle: false,
    transparentBackground: false,
    theme: "light",
  },
  webView: {
    bounces: false,
    pullToRefreshEnabled: false,
    overScrollMode: "content",
    allowsBackForwardNavigationGestures: true,
  },
  webBundleDir: "dist",
});
