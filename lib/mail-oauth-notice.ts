/** Parse `?mail=` / `?message=` query params after Gmail or Outlook OAuth redirect. */
export function parseMailOAuthSearchParams(search: string): {
  notice: string | null;
  openMailTab: boolean;
  shouldRefreshIntegrations: boolean;
} {
  const params = new URLSearchParams(search);
  const mail = params.get("mail");
  const tab = params.get("tab");
  const detail = params.get("message")?.trim();

  const openMailTab =
    tab === "mail" || Boolean(mail?.startsWith("gmail_")) || Boolean(mail?.startsWith("outlook_"));

  if (!mail) {
    return { notice: null, openMailTab, shouldRefreshIntegrations: false };
  }

  const provider = mail.startsWith("outlook_") ? "Outlook" : mail.startsWith("gmail_") ? "Gmail" : "Mail";

  if (mail.endsWith("_connected")) {
    return {
      notice: `${provider} connected successfully. Gmail and Outlook can both stay connected.`,
      openMailTab: true,
      shouldRefreshIntegrations: true
    };
  }
  if (mail.endsWith("_denied")) {
    return {
      notice: `${provider} connection was cancelled.`,
      openMailTab: true,
      shouldRefreshIntegrations: false
    };
  }
  if (mail.endsWith("_error")) {
    const decoded = detail ? decodeURIComponent(detail.replace(/\+/g, " ")) : "Unknown error";
    return {
      notice: `${provider} connection failed: ${decoded}`,
      openMailTab: true,
      shouldRefreshIntegrations: false
    };
  }

  return { notice: null, openMailTab, shouldRefreshIntegrations: false };
}

export function clearMailOAuthSearchParams() {
  if (typeof window === "undefined") {
    return;
  }
  const url = new URL(window.location.href);
  url.searchParams.delete("mail");
  url.searchParams.delete("message");
  url.searchParams.delete("tab");
  const next = url.pathname + (url.searchParams.toString() ? `?${url.searchParams}` : "");
  window.history.replaceState({}, "", next);
}
