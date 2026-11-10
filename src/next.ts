/**
 * @univpahlawan/sso-client-next/next
 *
 * Next.js App Router handlers for SSO Universitas Pahlawan, with built-in:
 *  - CSRF `state` protection (random, cookie-bound, timing-safe compare)
 *  - seamless SSO (reuses a live SSO session; no forced re-login)
 *  - silent auto-login (`prompt=none`): logs the user in on page open if they
 *    already have an SSO session, otherwise drops back as a guest with no UI.
 */

import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  SsoClient,
  SSOConfig,
  SSOUserInfo,
  SSOTokenResponse,
  SSOSession,
  SSO_COOKIE_NAME,
  SSO_ACCESS_TOKEN_COOKIE,
  SSO_STATE_COOKIE,
  SILENT_FAIL_ERRORS,
  encodeSession,
  decodeSession,
} from "./index.js";

export * from "./index.js";

/** Cookie that throttles silent auto-login so guests without an SSO session don't loop. */
export const SSO_SILENT_TRIED_COOKIE = "sso_silent_tried";

const cookieBase = { path: "/", sameSite: "lax" as const, secure: true };

function randomState(): string {
  return crypto.randomBytes(32).toString("base64url");
}

function timingSafeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

/** Resolve a relative path against the public app origin (falls back to the request). */
function homeUrl(request: NextRequest, appOrigin: string | undefined, path = "/"): URL {
  return new URL(path, appOrigin || request.nextUrl.origin);
}

export interface SSOHandlerOptions {
  config?: Partial<SSOConfig>;
  /** Public base URL for redirects (e.g. https://app.universitaspahlawan.ac.id). */
  appOrigin?: string;
  /** Where to send the user after a successful login. Default "/". */
  loginRedirect?: string;
  /** Where to send the user after logout. Default "/". */
  logoutRedirect?: string;
  /** Where to land after a silent check (success or fail). Default "/". */
  silentRedirect?: string;
  /** Called after a successful code exchange; may set extra cookies on `response`. */
  onAuthenticated?: (
    user: SSOUserInfo,
    tokens: SSOTokenResponse,
    ctx: { request: NextRequest; response: NextResponse }
  ) => void | Promise<void>;
}

/** Begin the OAuth flow (interactive). Pass `silent` for a background prompt=none check. */
export async function handleSSORedirect(
  request: NextRequest,
  opts: SSOHandlerOptions & { silent?: boolean } = {}
): Promise<NextResponse> {
  const client = new SsoClient(opts.config);
  if (!client.isConfigured()) {
    return NextResponse.redirect(homeUrl(request, opts.appOrigin, "/?sso_error=unconfigured"));
  }

  const state = randomState();
  const url = client.authorizeUrl({ state, prompt: opts.silent ? "none" : undefined });
  const res = NextResponse.redirect(url);
  res.cookies.set(SSO_STATE_COOKIE, state, { ...cookieBase, httpOnly: true, maxAge: 600 });
  if (opts.silent) {
    // 5-minute cooldown so a guest with no SSO session isn't redirected in a loop.
    res.cookies.set(SSO_SILENT_TRIED_COOKIE, "1", { ...cookieBase, maxAge: 300 });
  }
  return res;
}

/** Handle the SSO callback: validate state, exchange the code, set the session cookie. */
export async function handleSSOCallback(request: NextRequest, opts: SSOHandlerOptions = {}): Promise<NextResponse> {
  const client = new SsoClient(opts.config);
  const sp = request.nextUrl.searchParams;

  // Silent check with no live session (or user declined): return home as a guest.
  const err = sp.get("error");
  if (err) {
    const res = NextResponse.redirect(homeUrl(request, opts.appOrigin, opts.silentRedirect || "/"));
    if (SILENT_FAIL_ERRORS.has(err)) {
      res.cookies.set(SSO_SILENT_TRIED_COOKIE, "1", { ...cookieBase, maxAge: 300 });
    } else {
      res.cookies.delete(SSO_STATE_COOKIE);
    }
    return res;
  }

  // CSRF: the returned state must match the one we issued.
  const returned = sp.get("state") || "";
  const expected = request.cookies.get(SSO_STATE_COOKIE)?.value || "";
  if (!expected || !returned || !timingSafeEqual(returned, expected)) {
    return NextResponse.redirect(homeUrl(request, opts.appOrigin, "/?sso_error=invalid_state"));
  }

  const code = sp.get("code") || "";
  if (!code || code.length > 4096) {
    return NextResponse.redirect(homeUrl(request, opts.appOrigin, "/?sso_error=invalid_code"));
  }

  let user: SSOUserInfo;
  let tokens: SSOTokenResponse;
  try {
    tokens = await client.exchangeCode(code);
    user = await client.fetchUserInfo(tokens);
  } catch {
    return NextResponse.redirect(homeUrl(request, opts.appOrigin, "/?sso_error=exchange_failed"));
  }

  const response = NextResponse.redirect(homeUrl(request, opts.appOrigin, opts.loginRedirect || "/"));
  const session: SSOSession = { user, tokens, issued_at: Date.now() };
  const maxAge = tokens.expires_in && tokens.expires_in > 0 ? tokens.expires_in : 7200;
  response.cookies.set(SSO_COOKIE_NAME, encodeSession(session), { ...cookieBase, httpOnly: true, maxAge });
  response.cookies.set(SSO_ACCESS_TOKEN_COOKIE, tokens.access_token, { ...cookieBase, httpOnly: true, maxAge });
  response.cookies.delete(SSO_STATE_COOKIE);
  response.cookies.delete(SSO_SILENT_TRIED_COOKIE);

  await opts.onAuthenticated?.(user, tokens, { request, response });
  return response;
}

/** Clear the SSO session cookies. A silent-login cooldown avoids instant re-login. */
export async function handleSSOLogout(request: NextRequest, opts: SSOHandlerOptions = {}): Promise<NextResponse> {
  const res = NextResponse.redirect(homeUrl(request, opts.appOrigin, opts.logoutRedirect || "/"));
  res.cookies.delete(SSO_COOKIE_NAME);
  res.cookies.delete(SSO_ACCESS_TOKEN_COOKIE);
  // 30-minute cooldown so a still-live SSO session doesn't silently log them back in.
  res.cookies.set(SSO_SILENT_TRIED_COOKIE, "1", { ...cookieBase, maxAge: 1800 });
  return res;
}

/** Read the convenience SSO session from the cookie (server components / route handlers). */
export async function getSSOSession(): Promise<SSOSession | null> {
  try {
    const store = await cookies();
    return decodeSession(store.get(SSO_COOKIE_NAME)?.value);
  } catch {
    return null;
  }
}

export async function getSSOAccessToken(): Promise<string | null> {
  try {
    const store = await cookies();
    return store.get(SSO_ACCESS_TOKEN_COOKIE)?.value || null;
  } catch {
    return null;
  }
}

/**
 * Catch-all route handler factory. Mount at app/api/sso/[...sso]/route.ts:
 *
 *   export const { GET, POST } = createSSORouteHandlers({ appOrigin: process.env.APP_URL })
 *
 * Routes: /redirect, /silent, /callback, /logout, /session
 */
export function createSSORouteHandlers(opts: SSOHandlerOptions = {}) {
  const handler = async (request: NextRequest, context: { params: Promise<{ sso?: string[] }> }) => {
    const params = await context.params;
    const action = params?.sso?.[0] || "";

    switch (action) {
      case "redirect":
        return handleSSORedirect(request, opts);
      case "silent":
        return handleSSORedirect(request, { ...opts, silent: true });
      case "callback":
        return handleSSOCallback(request, opts);
      case "logout":
        return handleSSOLogout(request, opts);
      case "session": {
        const session = await getSSOSession();
        return NextResponse.json({ authenticated: !!session, session });
      }
      default:
        return NextResponse.json({ error: `Endpoint /api/sso/${action} tidak ditemukan` }, { status: 404 });
    }
  };

  return { GET: handler, POST: handler };
}
