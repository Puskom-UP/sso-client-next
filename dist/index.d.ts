/**
 * @univpahlawan/sso-client-next — core
 *
 * OAuth2 Authorization Code client for SSO Universitas Pahlawan (Passport/SAINS).
 * Framework-agnostic; the Next.js App Router handlers live in the `/next` entry.
 */
interface SSOProfile {
    nama_fakultas?: string;
    nama_prodi?: string;
    phone?: string;
    telepon?: string;
    [key: string]: unknown;
}
interface SSOUserInfo {
    sub: string;
    username: string;
    name: string;
    email: string;
    role?: string;
    profile?: SSOProfile;
    [key: string]: unknown;
}
interface SSOTokenResponse {
    access_token: string;
    token_type: string;
    expires_in?: number;
    refresh_token?: string;
    scope?: string;
}
interface SSOConfig {
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
interface SSOSession {
    user: SSOUserInfo;
    tokens: SSOTokenResponse;
    issued_at: number;
}
/** Cookie that carries the (base64 JSON) SSO session for convenience reads. */
declare const SSO_COOKIE_NAME = "sso_session";
/** Cookie that carries the raw access token (optional, for back-channel calls). */
declare const SSO_ACCESS_TOKEN_COOKIE = "sso_access_token";
/** Short-lived cookie holding the CSRF `state` value during the auth round-trip. */
declare const SSO_STATE_COOKIE = "sso_state";
/** Resolve config from explicit overrides, falling back to environment variables. */
declare function getSSOConfig(override?: Partial<SSOConfig>): SSOConfig;
interface AuthorizeOptions {
    state: string;
    redirectUri?: string;
    /** Override the configured prompt (e.g. "none" for a silent check). */
    prompt?: string;
}
/** Thin OAuth2 client around the SSO server's authorize/token/userinfo endpoints. */
declare class SsoClient {
    readonly config: SSOConfig;
    constructor(override?: Partial<SSOConfig>);
    isConfigured(): boolean;
    /** Build the /oauth/authorize URL. */
    authorizeUrl(options: AuthorizeOptions): string;
    /** Exchange an authorization code for tokens. */
    exchangeCode(code: string, redirectUri?: string): Promise<SSOTokenResponse>;
    /** Fetch the authenticated user's profile (userinfo). */
    fetchUserInfo(tokens: SSOTokenResponse): Promise<SSOUserInfo>;
}
/** Encode a session object to the cookie value. */
declare function encodeSession(session: SSOSession): string;
/** Decode a cookie value to a session object (returns null on any problem). */
declare function decodeSession(value: string | undefined | null): SSOSession | null;
/** OIDC error codes that mean "no interactive session" during a silent check. */
declare const SILENT_FAIL_ERRORS: Set<string>;

export { type AuthorizeOptions, SILENT_FAIL_ERRORS, type SSOConfig, type SSOProfile, type SSOSession, type SSOTokenResponse, type SSOUserInfo, SSO_ACCESS_TOKEN_COOKIE, SSO_COOKIE_NAME, SSO_STATE_COOKIE, SsoClient, decodeSession, encodeSession, getSSOConfig };
