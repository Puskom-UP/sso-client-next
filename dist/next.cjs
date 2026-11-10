"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/next.ts
var next_exports = {};
__export(next_exports, {
  SILENT_FAIL_ERRORS: () => SILENT_FAIL_ERRORS,
  SSO_ACCESS_TOKEN_COOKIE: () => SSO_ACCESS_TOKEN_COOKIE,
  SSO_COOKIE_NAME: () => SSO_COOKIE_NAME,
  SSO_SILENT_TRIED_COOKIE: () => SSO_SILENT_TRIED_COOKIE,
  SSO_STATE_COOKIE: () => SSO_STATE_COOKIE,
  SsoClient: () => SsoClient,
  createSSORouteHandlers: () => createSSORouteHandlers,
  decodeSession: () => decodeSession,
  encodeSession: () => encodeSession,
  getSSOAccessToken: () => getSSOAccessToken,
  getSSOConfig: () => getSSOConfig,
  getSSOSession: () => getSSOSession,
  handleSSOCallback: () => handleSSOCallback,
  handleSSOLogout: () => handleSSOLogout,
  handleSSORedirect: () => handleSSORedirect
});
module.exports = __toCommonJS(next_exports);
var import_node_crypto = __toESM(require("crypto"), 1);
var import_server = require("next/server");
var import_headers = require("next/headers");

// src/index.ts
var SSO_COOKIE_NAME = "sso_session";
var SSO_ACCESS_TOKEN_COOKIE = "sso_access_token";
var SSO_STATE_COOKIE = "sso_state";
var trimSlashes = (s) => s.replace(/\/+$/, "");
function getSSOConfig(override) {
  const ssoUrl = trimSlashes(
    override?.ssoUrl || process.env.SSO_URL || process.env.NEXT_PUBLIC_SSO_URL || "https://sso-v2.universitaspahlawan.ac.id"
  );
  const clientId = override?.clientId || process.env.SSO_CLIENT_ID || process.env.NEXT_PUBLIC_SSO_CLIENT_ID || "";
  const clientSecret = override?.clientSecret || process.env.SSO_CLIENT_SECRET || "";
  const redirectUri = override?.redirectUri || process.env.SSO_REDIRECT_URI || void 0;
  const scope = override?.scope || process.env.SSO_SCOPE || "*";
  const prompt = override?.prompt !== void 0 ? override.prompt : process.env.SSO_PROMPT ?? "";
  return { ssoUrl, clientId, clientSecret, redirectUri, scope, prompt };
}
var SsoClient = class {
  constructor(override) {
    this.config = getSSOConfig(override);
  }
  isConfigured() {
    return Boolean(this.config.clientId && this.config.clientSecret);
  }
  /** Build the /oauth/authorize URL. */
  authorizeUrl(options) {
    const redirectUri = options.redirectUri || this.config.redirectUri;
    if (!redirectUri) throw new Error("redirectUri belum diatur (SSO_REDIRECT_URI).");
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: this.config.scope,
      state: options.state
    });
    const prompt = options.prompt !== void 0 ? options.prompt : this.config.prompt;
    if (prompt) params.set("prompt", prompt);
    return `${this.config.ssoUrl}/oauth/authorize?${params.toString()}`;
  }
  /** Exchange an authorization code for tokens. */
  async exchangeCode(code, redirectUri) {
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      redirect_uri: redirectUri || this.config.redirectUri || "",
      code
    });
    const res = await fetch(`${this.config.ssoUrl}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body,
      cache: "no-store"
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Tukar kode gagal (${res.status}): ${text.slice(0, 200)}`);
    }
    return await res.json();
  }
  /** Fetch the authenticated user's profile (userinfo). */
  async fetchUserInfo(tokens) {
    const res = await fetch(`${this.config.ssoUrl}/api/user`, {
      headers: { Authorization: `${tokens.token_type || "Bearer"} ${tokens.access_token}`, Accept: "application/json" },
      cache: "no-store"
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Ambil profil gagal (${res.status}): ${text.slice(0, 200)}`);
    }
    const raw = await res.json();
    const u = raw.data || raw;
    return {
      sub: String(u.sub ?? u.id ?? u.username ?? ""),
      username: String(u.username ?? u.nidn ?? u.nip ?? u.sub ?? ""),
      name: String(u.name ?? u.nama ?? ""),
      email: String(u.email ?? ""),
      role: u.role ? String(u.role) : void 0,
      profile: u.profile || void 0,
      ...u
    };
  }
};
function encodeSession(session) {
  return Buffer.from(JSON.stringify(session), "utf-8").toString("base64");
}
function decodeSession(value) {
  if (!value) return null;
  try {
    const json = Buffer.from(value, "base64").toString("utf-8");
    const data = JSON.parse(json);
    if (!data?.user?.username) return null;
    return data;
  } catch {
    return null;
  }
}
var SILENT_FAIL_ERRORS = /* @__PURE__ */ new Set(["login_required", "consent_required", "interaction_required"]);

// src/next.ts
var SSO_SILENT_TRIED_COOKIE = "sso_silent_tried";
var cookieBase = { path: "/", sameSite: "lax", secure: true };
function randomState() {
  return import_node_crypto.default.randomBytes(32).toString("base64url");
}
function timingSafeEqual(a, b) {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return import_node_crypto.default.timingSafeEqual(ba, bb);
}
function homeUrl(request, appOrigin, path = "/") {
  return new URL(path, appOrigin || request.nextUrl.origin);
}
async function handleSSORedirect(request, opts = {}) {
  const client = new SsoClient(opts.config);
  if (!client.isConfigured()) {
    return import_server.NextResponse.redirect(homeUrl(request, opts.appOrigin, "/?sso_error=unconfigured"));
  }
  const state = randomState();
  const url = client.authorizeUrl({ state, prompt: opts.silent ? "none" : void 0 });
  const res = import_server.NextResponse.redirect(url);
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
    const res = import_server.NextResponse.redirect(homeUrl(request, opts.appOrigin, opts.silentRedirect || "/"));
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
    return import_server.NextResponse.redirect(homeUrl(request, opts.appOrigin, "/?sso_error=invalid_state"));
  }
  const code = sp.get("code") || "";
  if (!code || code.length > 4096) {
    return import_server.NextResponse.redirect(homeUrl(request, opts.appOrigin, "/?sso_error=invalid_code"));
  }
  let user;
  let tokens;
  try {
    tokens = await client.exchangeCode(code);
    user = await client.fetchUserInfo(tokens);
  } catch {
    return import_server.NextResponse.redirect(homeUrl(request, opts.appOrigin, "/?sso_error=exchange_failed"));
  }
  const response = import_server.NextResponse.redirect(homeUrl(request, opts.appOrigin, opts.loginRedirect || "/"));
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
  const res = import_server.NextResponse.redirect(homeUrl(request, opts.appOrigin, opts.logoutRedirect || "/"));
  res.cookies.delete(SSO_COOKIE_NAME);
  res.cookies.delete(SSO_ACCESS_TOKEN_COOKIE);
  res.cookies.set(SSO_SILENT_TRIED_COOKIE, "1", { ...cookieBase, maxAge: 1800 });
  return res;
}
async function getSSOSession() {
  try {
    const store = await (0, import_headers.cookies)();
    return decodeSession(store.get(SSO_COOKIE_NAME)?.value);
  } catch {
    return null;
  }
}
async function getSSOAccessToken() {
  try {
    const store = await (0, import_headers.cookies)();
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
        return import_server.NextResponse.json({ authenticated: !!session, session });
      }
      default:
        return import_server.NextResponse.json({ error: `Endpoint /api/sso/${action} tidak ditemukan` }, { status: 404 });
    }
  };
  return { GET: handler, POST: handler };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
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
});
//# sourceMappingURL=next.cjs.map