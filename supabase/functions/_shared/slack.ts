export interface SlackAlert {
  event: string;
  severity?: "info" | "warning" | "critical";
  summary: string;
  fields?: Record<string, string | number | boolean | null>;
}

export async function sendSlackAlert(alert: SlackAlert): Promise<boolean> {
  const webhookUrl = Deno.env.get("SLACK_WEBHOOK_URL");
  if (!webhookUrl) return false;

  const escape = (value: unknown) => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").slice(0, 300);
  const fields = Object.entries(alert.fields ?? {})
    .map(([key, value]) => `*${escape(key)}:* ${escape(value)}`)
    .join("\n");
  const text = [
    `[haenael-ge][${alert.severity ?? "info"}] ${alert.event}`,
    escape(alert.summary),
    fields,
  ].filter(Boolean).join("\n");

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!response.ok) {
      console.error("[slack] webhook failed", response.status);
      return false;
    }
    return true;
  } catch (error) {
    console.error("[slack] webhook request failed", error);
    return false;
  }
}
