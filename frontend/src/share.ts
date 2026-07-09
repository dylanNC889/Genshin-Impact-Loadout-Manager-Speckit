/**
 * Compact, URL-safe encoding of a build/team so it can be shared via a link without saving
 * to the backend (works in the static Pages build too). Not encryption — just base64url JSON.
 */
export function encodeShare(obj: unknown): string {
  const json = JSON.stringify(obj);
  const b64 = btoa(String.fromCharCode(...new TextEncoder().encode(json)));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeShare<T>(code: string): T | null {
  try {
    const b64 = code.replace(/-/g, "+").replace(/_/g, "/");
    const bytes = Uint8Array.from(atob(b64), (ch) => ch.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes)) as T;
  } catch {
    return null;
  }
}
