import { b as SSOUserInfo, a as SSOTokenResponse, S as SSOConfig } from '../types-DJIzN3pZ.mjs';
import { NextRequest, NextResponse } from 'next/server';

declare const SSO_COOKIE_NAME = "sso_session";
declare const SSO_ACCESS_TOKEN_COOKIE = "sso_access_token";
interface SSOSessionData {
    user: SSOUserInfo;
    tokens: SSOTokenResponse;
}
/**
 * Get the current SSO Session from cookies (for Server Components & Route Handlers in Next.js App Router)
 */
declare function getSSOSession(): Promise<SSOSessionData | null>;
/**
 * Get only the SSO access token from cookies
 */
declare function getSSOAccessToken(): Promise<string | null>;

interface SSORouteHandlerOptions {
    /** SSO configuration overrides */
    config?: Partial<SSOConfig>;
    /** Default redirect path after successful login (default: "/dashboard") */
    redirectTo?: string;
    /** Role-based redirect map (e.g. { admin: "/admin", dosen: "/dosen" }) */
    roleRedirects?: Record<string, string>;
    /** Callback hook called after user is authenticated */
    onAuthenticated?: (user: SSOUserInfo, tokens: SSOTokenResponse) => Promise<void> | void;
}
/**
 * Handle SSO Login Redirect (/api/sso/redirect)
 */
declare function handleSSORedirect(request: NextRequest, options?: SSORouteHandlerOptions): Promise<NextResponse>;
/**
 * Handle SSO Callback (/api/sso/callback)
 */
declare function handleSSOCallback(request: NextRequest, options?: SSORouteHandlerOptions): Promise<NextResponse>;
/**
 * Handle SSO Logout (/api/sso/logout)
 */
declare function handleSSOLogout(request: NextRequest, options?: {
    redirectTo?: string;
}): Promise<NextResponse>;
/**
 * Create a catch-all Route Handler for Next.js App Router
 * Usage in `app/api/sso/[...sso]/route.ts`:
 * ```ts
 * import { createSSORouteHandlers } from '@webkampus/sso-client-next/next';
 * export const { GET, POST } = createSSORouteHandlers();
 * ```
 */
declare function createSSORouteHandlers(options?: SSORouteHandlerOptions): {
    GET: (request: NextRequest) => Promise<NextResponse<unknown>>;
    POST: (request: NextRequest) => Promise<NextResponse<unknown>>;
};

export { type SSORouteHandlerOptions, type SSOSessionData, SSO_ACCESS_TOKEN_COOKIE, SSO_COOKIE_NAME, createSSORouteHandlers, getSSOAccessToken, getSSOSession, handleSSOCallback, handleSSOLogout, handleSSORedirect };
