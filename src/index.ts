/**
 * @univpahlawan/sso-client-next — core
 *
 * OAuth2 Authorization Code client for SSO Universitas Pahlawan (Passport/SAINS).
 * Framework-agnostic; the Next.js App Router handlers live in the `/next` entry.
 */

export interface SSOProfile {
  nama_fakultas?: string;
  nama_prodi?: string;
  phone?: string;
  telepon?: string;
  [key: string]: unknown;
}

export interface SSOUserInfo {
  sub: string;
  username: string;
  name: string;
  email: string;
  role?: string;
  profile?: SSOProfile;
  [key: string]: unknown;
}

export interface SSOTokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
}

export interface SSOConfig {
  /** Base URL of the SSO server, e.g. https://sso-v2.universitaspahlawan.ac.id */
  ssoUrl: string;
  clientId: string;
  clientSecret: string;
  /** Absolute callback URL registered for this client. */
  redirectUri?: string;
  scope: string;
  /**
   * OIDC prompt. "" (default) reuses an existing SSO session (seamless SSO),
   * "none" performs a silent background check, "login" forces re-authentication.
   */
  prompt: "" | "none" | "login" | string;
}

export interface SSOSession {
  user: SSOUserInfo;
  tokens: SSOTokenResponse;
  issued_at: number;
}

/** Cookie that carries the (base64 JSON) SSO session for convenience reads. */
export const SSO_COOKIE_NAME = "sso_session";
/** Cookie that carries the raw access token (optional, for back-channel calls). */
export const SSO_ACCESS_TOKEN_COOKIE = "sso_access_token";
/** Short-lived cookie holding the CSRF `state` value during the auth round-trip. */
export const SSO_STATE_COOKIE = "sso_state";

const trimSlashes = (s: string) => s.replace(/\/+$/, "");

/** Resolve config from explicit overrides, falling back to environment variables. */
export function getSSOConfig(override?: Partial<SSOConfig>): SSOConfig {
  const ssoUrl = trimSlashes(
    override?.ssoUrl || process.env.SSO_URL || process.env.NEXT_PUBLIC_SSO_URL || "https://sso-v2.universitaspahlawan.ac.id"
  );
  const clientId = override?.clientId || process.env.SSO_CLIENT_ID || process.env.NEXT_PUBLIC_SSO_CLIENT_ID || "";
  const clientSecret = override?.clientSecret || process.env.SSO_CLIENT_SECRET || "";
  const redirectUri = override?.redirectUri || process.env.SSO_REDIRECT_URI || undefined;
  const scope = override?.scope || process.env.SSO_SCOPE || "*";
  // Default to "" (seamless SSO), NOT "login" — opening an app should reuse a live
  // SSO session instead of forcing a fresh login every time.
  const prompt = override?.prompt !== undefined ? override.prompt : process.env.SSO_PROMPT ?? "";
  return { ssoUrl, clientId, clientSecret, redirectUri, scope, prompt };
}

export interface AuthorizeOptions {
  state: string;
  redirectUri?: string;
  /** Override the configured prompt (e.g. "none" for a silent check). */
  prompt?: string;
}

/** Thin OAuth2 client around the SSO server's authorize/token/userinfo endpoints. */
export class SsoClient {
  readonly config: SSOConfig;

  constructor(override?: Partial<SSOConfig>) {
    this.config = getSSOConfig(override);
  }

  isConfigured(): boolean {
    return Boolean(this.config.clientId && this.config.clientSecret);
  }

  /** Build the /oauth/authorize URL. */
  authorizeUrl(options: AuthorizeOptions): string {
    const redirectUri = options.redirectUri || this.config.redirectUri;
    if (!redirectUri) throw new Error("redirectUri belum diatur (SSO_REDIRECT_URI).");
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: this.config.scope,
      state: options.state,
    });
    const prompt = options.prompt !== undefined ? options.prompt : this.config.prompt;
    if (prompt) params.set("prompt", prompt);
    return `${this.config.ssoUrl}/oauth/authorize?${params.toString()}`;
  }

  /** Exchange an authorization code for tokens. */
  async exchangeCode(code: string, redirectUri?: string): Promise<SSOTokenResponse> {
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      redirect_uri: redirectUri || this.config.redirectUri || "",
      code,
    });
    const res = await fetch(`${this.config.ssoUrl}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body,
      cache: "no-store",
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Tukar kode gagal (${res.status}): ${text.slice(0, 200)}`);
    }
    return (await res.json()) as SSOTokenResponse;
  }

  /** Fetch the authenticated user's profile (userinfo). */
  async fetchUserInfo(tokens: SSOTokenResponse): Promise<SSOUserInfo> {
    const res = await fetch(`${this.config.ssoUrl}/api/user`, {
      headers: { Authorization: `${tokens.token_type || "Bearer"} ${tokens.access_token}`, Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Ambil profil gagal (${res.status}): ${text.slice(0, 200)}`);
    }
    const raw = (await res.json()) as Record<string, unknown>;
    // Normalise common shapes (SAINS may wrap under `data`).
    const u = (raw.data as Record<string, unknown>) || raw;
    return {
      sub: String(u.sub ?? u.id ?? u.username ?? ""),
      username: String(u.username ?? u.nidn ?? u.nip ?? u.sub ?? ""),
      name: String(u.name ?? u.nama ?? ""),
      email: String(u.email ?? ""),
      role: u.role ? String(u.role) : undefined,
      profile: (u.profile as SSOProfile) || undefined,
      ...u,
    };
  }
}

/** Encode a session object to the cookie value. */
export function encodeSession(session: SSOSession): string {
  return Buffer.from(JSON.stringify(session), "utf-8").toString("base64");
}

/** Decode a cookie value to a session object (returns null on any problem). */
export function decodeSession(value: string | undefined | null): SSOSession | null {
  if (!value) return null;
  try {
    const json = Buffer.from(value, "base64").toString("utf-8");
    const data = JSON.parse(json) as SSOSession;
    if (!data?.user?.username) return null;
    return data;
  } catch {
    return null;
  }
}

/** OIDC error codes that mean "no interactive session" during a silent check. */
export const SILENT_FAIL_ERRORS = new Set(["login_required", "consent_required", "interaction_required"]);
