export function injectTrackingPixel(
  html: string,
  campaignId: string,
  recipientId: string,
): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const src = `${base}/api/track/open?campaignId=${encodeURIComponent(campaignId)}&recipientId=${encodeURIComponent(recipientId)}`;
  const pixel = `<img src="${src}" width="1" height="1" alt="" style="display:none" />`;

  const closeBody = html.lastIndexOf("</body>");
  if (closeBody !== -1) {
    return html.slice(0, closeBody) + pixel + html.slice(closeBody);
  }
  return html + pixel;
}

export function wrapTrackingLinks(
  html: string,
  campaignId: string,
  recipientId: string,
): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "";

  return html.replace(
    /<a(\s[^>]*?)href="([^"]*)"([^>]*?)>/gi,
    (_match, before, url, after) => {
      // Skip mailto:, tel:, and links that are already wrapped
      if (
        url.startsWith("mailto:") ||
        url.startsWith("tel:") ||
        url.includes("/api/track/click")
      ) {
        return `<a${before}href="${url}"${after}>`;
      }

      const tracked = `${base}/api/track/click?campaignId=${encodeURIComponent(campaignId)}&recipientId=${encodeURIComponent(recipientId)}&url=${encodeURIComponent(url)}`;
      return `<a${before}href="${tracked}"${after}>`;
    },
  );
}
