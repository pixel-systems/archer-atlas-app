// slz.sk sits behind a WAF that rejects obvious bot user-agents with an
// "Access Denied" page. We use a current Chrome/macOS UA + Slovak Accept-Language
// so requests look like a regular browser. Politeness is enforced by `withDelay`.
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

/**
 * Polite fetch wrapper for slz.sk. Sequential by design — call sites should
 * await each request and let pacing happen naturally. For large batches use
 * `withDelay`.
 */
export async function fetchSlz(url: string, init: RequestInit = {}): Promise<Response> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "User-Agent": USER_AGENT,
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,application/pdf,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language": "sk-SK,sk;q=0.9,en;q=0.8",
      ...(init.headers ?? {}),
    },
    // Always bypass Next's data cache; the DB is the source of truth.
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`fetchSlz ${url} -> ${res.status} ${res.statusText}`);
  }
  return res;
}

/**
 * Fetch HTML from slz.sk. The site uses windows-1250 in some pages; we decode
 * defensively.
 */
export async function fetchSlzHtml(url: string): Promise<string> {
  const res = await fetchSlz(url);
  const buf = await res.arrayBuffer();
  const contentType = res.headers.get("content-type") ?? "";
  const charsetMatch = /charset=([^;]+)/i.exec(contentType);
  const charset = charsetMatch?.[1]?.trim().toLowerCase() ?? "utf-8";

  try {
    const decoder = new TextDecoder(charset, { fatal: false });
    return decoder.decode(buf);
  } catch {
    return new TextDecoder("utf-8").decode(buf);
  }
}

export async function withDelay<T>(items: T[], delayMs: number, fn: (item: T) => Promise<void>) {
  for (const item of items) {
    await fn(item);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
}
