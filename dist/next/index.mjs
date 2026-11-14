// src/next/cookies.ts
import { cookies } from "next/headers";
var SSO_COOKIE_NAME = "sso_session";
var SSO_ACCESS_TOKEN_COOKIE = "sso_access_token";
async function getSSOSession() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SSO_COOKIE_NAME);
    if (!sessionCookie || !sessionCookie.value) {
      return null;
    }
    const decoded = Buffer.from(sessionCookie.value, "base64").toString("utf-8");
    return JSON.parse(decoded);
  } catch (error) {
    return null;
  }
}
async function getSSOAccessToken() {
  const session = await getSSOSession();
  return session?.tokens?.access_token || null;
}

// src/next/handlers.ts
import { NextResponse } from "next/server";

// src/config.ts
function getSSOConfig(overrideConfig) {
  const ssoUrl = (overrideConfig?.ssoUrl || process.env.SSO_URL || process.env.NEXT_PUBLIC_SSO_URL || "http://localhost:8000").replace(/\/+$/, "");
  const clientId = overrideConfig?.clientId || process.env.SSO_CLIENT_ID || process.env.NEXT_PUBLIC_SSO_CLIENT_ID || "";
  const clientSecret = overrideConfig?.clientSecret || process.env.SSO_CLIENT_SECRET || "";
  const redirectUri = overrideConfig?.redirectUri || process.env.SSO_REDIRECT_URI || "";
  const scope = overrideConfig?.scope || process.env.SSO_SCOPE || "";
  const prompt = overrideConfig?.prompt !== void 0 ? overrideConfig.prompt : process.env.SSO_PROMPT ?? "login";
  return {
    ssoUrl,
    clientId,
    clientSecret,
    redirectUri,
    scope,
    prompt: prompt || null
  };
}

// src/client.ts
var SSOClient = class {
  config;
  constructor(config) {
    this.config = getSSOConfig(config);
  }
  /**
   * Get the base URL of the SSO UP Server (without trailing slash)
   */
  getBaseUrl() {
    return this.config.ssoUrl;
  }
  /**
   * Build the OAuth authorization URL to redirect users to SSO UP
   */
  getAuthorizationUrl(options) {
    const redirectUri = options?.redirectUri || this.config.redirectUri;
    if (!redirectUri) {
      throw new Error(
        "[SSOClient] redirectUri is required. Pass it in options or set SSO_REDIRECT_URI environment variable."
      );
    }
    if (!this.config.clientId) {
      throw new Error(
        "[SSOClient] clientId is required. Pass it in config or set SSO_CLIENT_ID environment variable."
      );
    }
    const queryParams = {
      client_id: this.config.clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: options?.scope || this.config.scope || ""
    };
    if (options?.state) {
      queryParams.state = options.state;
    }
    const prompt = options?.prompt !== void 0 ? options.prompt : this.config.prompt;
    if (prompt) {
      queryParams.prompt = prompt;
    }
    const searchParams = new URLSearchParams(queryParams);
    return `${this.config.ssoUrl}/oauth/authorize?${searchParams.toString()}`;
  }
  /**
   * Exchange OAuth authorization code for Access Token and Refresh Token
   */
  async exchangeCode(code, redirectUri) {
    const finalRedirectUri = redirectUri || this.config.redirectUri;
    if (!finalRedirectUri) {
      throw new Error(
        "[SSOClient] redirectUri is required for code exchange."
      );
    }
    const bodyParams = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      redirect_uri: finalRedirectUri,
      code
    });
    const response = await fetch(`${this.config.ssoUrl}/oauth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json"
      },
      body: bodyParams.toString()
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `[SSOClient] Token exchange failed (HTTP ${response.status}): ${errorText}`
      );
    }
    return await response.json();
  }
  /**
   * Fetch structured user info from /api/userinfo (OpenID standard)
   */
  async getUserInfo(accessToken) {
    const response = await fetch(`${this.config.ssoUrl}/api/userinfo`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json"
      }
    });
    if (!response.ok) {
      if (response.status === 404) {
        return this.getUserAsUserInfo(accessToken);
      }
      const errorText = await response.text();
      throw new Error(
        `[SSOClient] Get UserInfo failed (HTTP ${response.status}): ${errorText}`
      );
    }
    return await response.json();
  }
  /**
   * Fetch raw user model from /api/user (Fallback)
   */
  async getUser(accessToken) {
    const response = await fetch(`${this.config.ssoUrl}/api/user`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json"
      }
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `[SSOClient] Get User failed (HTTP ${response.status}): ${errorText}`
      );
    }
    return await response.json();
  }
  /**
   * Internal helper to normalize /api/user response to SSOUserInfo format
   */
  async getUserAsUserInfo(accessToken) {
    const rawUser = await this.getUser(accessToken);
    return {
      sub: String(rawUser.id),
      username: rawUser.username,
      name: rawUser.name,
      email: rawUser.email,
      role: rawUser.role || "user",
      profile: rawUser.sains_data || {}
    };
  }
  /**
   * SAINS API Proxy: Fetch list of Fakultas
   */
  async getFakultas(accessToken) {
    return this.fetchSainsApi("/api/sains/fakultas", accessToken);
  }
  /**
   * SAINS API Proxy: Fetch list of Prodi
   */
  async getProdi(accessToken) {
    return this.fetchSainsApi("/api/sains/prodi", accessToken);
  }
  /**
   * SAINS API Proxy: Fetch Dosen detail
   */
  async getDosen(accessToken, username) {
    const query = username ? `?username=${encodeURIComponent(username)}` : "";
    return this.fetchSainsApi(`/api/sains/dosen${query}`, accessToken);
  }
  /**
   * SAINS API Proxy: Fetch Mahasiswa detail
   */
  async getMahasiswa(accessToken, username) {
    const query = username ? `?username=${encodeURIComponent(username)}` : "";
    return this.fetchSainsApi(`/api/sains/mahasiswa${query}`, accessToken);
  }
  /**
   * SAINS API Proxy: Fetch Pegawai detail
   */
  async getPegawai(accessToken, username) {
    const query = username ? `?username=${encodeURIComponent(username)}` : "";
    return this.fetchSainsApi(`/api/sains/pegawai${query}`, accessToken);
  }
  /**
   * Generic internal fetch for SAINS endpoints
   */
  async fetchSainsApi(endpoint, accessToken) {
    const response = await fetch(`${this.config.ssoUrl}${endpoint}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json"
      }
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `[SSOClient] SAINS API failed (${endpoint} HTTP ${response.status}): ${errorText}`
      );
    }
    return response.json();
  }
};

// src/next/handlers.ts
async function handleSSORedirect(request, options) {
  const ssoClient = new SSOClient(options?.config);
  const requestUrl = new URL(request.url);
  const redirectUri = ssoClient.config.redirectUri || `${requestUrl.protocol}//${requestUrl.host}/api/sso/callback`;
  const authUrl = ssoClient.getAuthorizationUrl({
    redirectUri,
    prompt: ssoClient.config.prompt
  });
  return NextResponse.redirect(authUrl);
}
async function handleSSOCallback(request, options) {
  const ssoClient = new SSOClient(options?.config);
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  if (error) {
    return NextResponse.json(
      { error: `SSO authorization denied: ${error}` },
      { status: 400 }
    );
  }
  if (!code) {
    return NextResponse.json(
      { error: "Missing authorization code in query parameters" },
      { status: 400 }
    );
  }
  try {
    const requestUrl = new URL(request.url);
    const redirectUri = ssoClient.config.redirectUri || `${requestUrl.protocol}//${requestUrl.host}/api/sso/callback`;
    const tokens = await ssoClient.exchangeCode(code, redirectUri);
    const userInfo = await ssoClient.getUserInfo(tokens.access_token);
    if (options?.onAuthenticated) {
      await options.onAuthenticated(userInfo, tokens);
    }
    let targetPath = options?.redirectTo || "/dashboard";
    if (options?.roleRedirects && userInfo.role && options.roleRedirects[userInfo.role]) {
      targetPath = options.roleRedirects[userInfo.role];
    }
    const redirectUrl = new URL(targetPath, request.url);
    const response = NextResponse.redirect(redirectUrl);
    const sessionData = {
      user: userInfo,
      tokens
    };
    const encodedSession = Buffer.from(JSON.stringify(sessionData)).toString("base64");
    response.cookies.set(SSO_COOKIE_NAME, encodedSession, {
      httpOnly: true,
      secure: process.env.NODE_NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: tokens.expires_in || 86400
      // Default 24h
    });
    response.cookies.set(SSO_ACCESS_TOKEN_COOKIE, tokens.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: tokens.expires_in || 86400
    });
    return response;
  } catch (err) {
    return NextResponse.json(
      { error: err.message || "SSO Authentication failed" },
      { status: 500 }
    );
  }
}
async function handleSSOLogout(request, options) {
  const targetUrl = new URL(options?.redirectTo || "/", request.url);
  const response = NextResponse.redirect(targetUrl);
  response.cookies.set(SSO_COOKIE_NAME, "", {
    httpOnly: true,
    path: "/",
    maxAge: 0
  });
  response.cookies.set(SSO_ACCESS_TOKEN_COOKIE, "", {
    httpOnly: true,
    path: "/",
    maxAge: 0
  });
  return response;
}
function createSSORouteHandlers(options) {
  const handler = async (request) => {
    const url = new URL(request.url);
    const path = url.pathname;
    if (path.endsWith("/redirect")) {
      return handleSSORedirect(request, options);
    }
    if (path.endsWith("/callback")) {
      return handleSSOCallback(request, options);
    }
    if (path.endsWith("/logout")) {
      return handleSSOLogout(request, { redirectTo: options?.redirectTo });
    }
    return NextResponse.json({ error: "Endpoint not found" }, { status: 404 });
  };
  return {
    GET: handler,
    POST: handler
  };
}
export {
  SSO_ACCESS_TOKEN_COOKIE,
  SSO_COOKIE_NAME,
  createSSORouteHandlers,
  getSSOAccessToken,
  getSSOSession,
  handleSSOCallback,
  handleSSOLogout,
  handleSSORedirect
};
//# sourceMappingURL=index.mjs.map