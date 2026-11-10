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

export {
  SSO_COOKIE_NAME,
  SSO_ACCESS_TOKEN_COOKIE,
  SSO_STATE_COOKIE,
  getSSOConfig,
  SsoClient,
  encodeSession,
  decodeSession,
  SILENT_FAIL_ERRORS
};
//# sourceMappingURL=chunk-BN2JS6QT.js.map