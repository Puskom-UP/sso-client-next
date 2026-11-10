import {
  SILENT_FAIL_ERRORS,
  SSO_ACCESS_TOKEN_COOKIE,
  SSO_COOKIE_NAME,
  SSO_STATE_COOKIE,
  SsoClient,
  decodeSession,
  encodeSession,
  getSSOConfig
} from "./chunk-BN2JS6QT.js";

// src/next.ts
import crypto from "crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
var SSO_SILENT_TRIED_COOKIE = "sso_silent_tried";
var cookieBase = { path: "/", sameSite: "lax", secure: true };
function randomState() {
  return crypto.randomBytes(32).toString("base64url");
}
function timingSafeEqual(a, b) {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}
function homeUrl(request, appOrigin, path = "/") {
  return new URL(path, appOrigin || request.nextUrl.origin);
}
async function handleSSORedirect(request, opts = {}) {
  const client = new SsoClient(opts.config);
  if (!client.isConfigured()) {
    return NextResponse.redirect(homeUrl(request, opts.appOrigin, "/?sso_error=unconfigured"));
  }
  const state = randomState();
  const url = client.authorizeUrl({ state, prompt: opts.silent ? "none" : void 0 });
  const res = NextResponse.redirect(url);
  res.cookies.set(SSO_STATE_COOKIE, state, { ...cookieBase, httpOnly: true, maxAge: 600 });
  if (opts.silent) {
    res.cookies.set(SSO_SILENT_TRIED_COOKIE, "1", { ...cookieBase, maxAge: 300 });
  }
  return res;
}
async function handleSSOCallback(request, opts = {}) {
  const client = new SsoClient(opts.config);
  const sp = request.nextUrl.searchParams;
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
  const returned = sp.get("state") || "";
  const expected = request.cookies.get(SSO_STATE_COOKIE)?.value || "";
  if (!expected || !returned || !timingSafeEqual(returned, expected)) {
    return NextResponse.redirect(homeUrl(request, opts.appOrigin, "/?sso_error=invalid_state"));
  }
  const code = sp.get("code") || "";
  if (!code || code.length > 4096) {
    return NextResponse.redirect(homeUrl(request, opts.appOrigin, "/?sso_error=invalid_code"));
  }
  let user;
  let tokens;
  try {
    tokens = await client.exchangeCode(code);
    user = await client.fetchUserInfo(tokens);
  } catch {
    return NextResponse.redirect(homeUrl(request, opts.appOrigin, "/?sso_error=exchange_failed"));
  }
  const response = NextResponse.redirect(homeUrl(request, opts.appOrigin, opts.loginRedirect || "/"));
  const session = { user, tokens, issued_at: Date.now() };
  const maxAge = tokens.expires_in && tokens.expires_in > 0 ? tokens.expires_in : 7200;
  response.cookies.set(SSO_COOKIE_NAME, encodeSession(session), { ...cookieBase, httpOnly: true, maxAge });
  response.cookies.set(SSO_ACCESS_TOKEN_COOKIE, tokens.access_token, { ...cookieBase, httpOnly: true, maxAge });
  response.cookies.delete(SSO_STATE_COOKIE);
  response.cookies.delete(SSO_SILENT_TRIED_COOKIE);
  await opts.onAuthenticated?.(user, tokens, { request, response });
  return response;
}
async function handleSSOLogout(request, opts = {}) {
  const res = NextResponse.redirect(homeUrl(request, opts.appOrigin, opts.logoutRedirect || "/"));
  res.cookies.delete(SSO_COOKIE_NAME);
  res.cookies.delete(SSO_ACCESS_TOKEN_COOKIE);
  res.cookies.set(SSO_SILENT_TRIED_COOKIE, "1", { ...cookieBase, maxAge: 1800 });
  return res;
}
async function getSSOSession() {
  try {
    const store = await cookies();
    return decodeSession(store.get(SSO_COOKIE_NAME)?.value);
  } catch {
    return null;
  }
}
async function getSSOAccessToken() {
  try {
    const store = await cookies();
    return store.get(SSO_ACCESS_TOKEN_COOKIE)?.value || null;
  } catch {
    return null;
  }
}
function createSSORouteHandlers(opts = {}) {
  const handler = async (request, context) => {
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
export {
  SILENT_FAIL_ERRORS,
  SSO_ACCESS_TOKEN_COOKIE,
  SSO_COOKIE_NAME,
  SSO_SILENT_TRIED_COOKIE,
  SSO_STATE_COOKIE,
  SsoClient,
  createSSORouteHandlers,
  decodeSession,
  encodeSession,
  getSSOAccessToken,
  getSSOConfig,
  getSSOSession,
  handleSSOCallback,
  handleSSOLogout,
  handleSSORedirect
};
//# sourceMappingURL=next.js.map