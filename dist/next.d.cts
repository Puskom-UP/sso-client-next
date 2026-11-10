import { NextRequest, NextResponse } from 'next/server';
import { SSOConfig, SSOUserInfo, SSOTokenResponse, SSOSession } from './index.cjs';
export { AuthorizeOptions, SILENT_FAIL_ERRORS, SSOProfile, SSO_ACCESS_TOKEN_COOKIE, SSO_COOKIE_NAME, SSO_STATE_COOKIE, SsoClient, decodeSession, encodeSession, getSSOConfig } from './index.cjs';

/**
 * @univpahlawan/sso-client-next/next
 *
 * Next.js App Router handlers for SSO Universitas Pahlawan, with built-in:
 *  - CSRF `state` protection (random, cookie-bound, timing-safe compare)
 *  - seamless SSO (reuses a live SSO session; no forced re-login)
 *  - silent auto-login (`prompt=none`): logs the user in on page open if they
 *    already have an SSO session, otherwise drops back as a guest with no UI.
 */

/** Cookie that throttles silent auto-login so guests without an SSO session don't loop. */
declare const SSO_SILENT_TRIED_COOKIE = "sso_silent_tried";
interface SSOHandlerOptions {
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
    onAuthenticated?: (user: SSOUserInfo, tokens: SSOTokenResponse, ctx: {
        request: NextRequest;
        response: NextResponse;
    }) => void | Promise<void>;
}
/** Begin the OAuth flow (interactive). Pass `silent` for a background prompt=none check. */
declare function handleSSORedirect(request: NextRequest, opts?: SSOHandlerOptions & {
    silent?: boolean;
}): Promise<NextResponse>;
/** Handle the SSO callback: validate state, exchange the code, set the session cookie. */
declare function handleSSOCallback(request: NextRequest, opts?: SSOHandlerOptions): Promise<NextResponse>;
/** Clear the SSO session cookies. A silent-login cooldown avoids instant re-login. */
declare function handleSSOLogout(request: NextRequest, opts?: SSOHandlerOptions): Promise<NextResponse>;
/** Read the convenience SSO session from the cookie (server components / route handlers). */
declare function getSSOSession(): Promise<SSOSession | null>;
declare function getSSOAccessToken(): Promise<string | null>;
/**
 * Catch-all route handler factory. Mount at app/api/sso/[...sso]/route.ts:
 *
 *   export const { GET, POST } = createSSORouteHandlers({ appOrigin: process.env.APP_URL })
 *
 * Routes: /redirect, /silent, /callback, /logout, /session
 */
declare function createSSORouteHandlers(opts?: SSOHandlerOptions): {
    GET: (request: NextRequest, context: {
        params: Promise<{
            sso?: string[];
        }>;
    }) => Promise<NextResponse<unknown>>;
    POST: (request: NextRequest, context: {
        params: Promise<{
            sso?: string[];
        }>;
    }) => Promise<NextResponse<unknown>>;
};

export { SSOConfig, type SSOHandlerOptions, SSOSession, SSOTokenResponse, SSOUserInfo, SSO_SILENT_TRIED_COOKIE, createSSORouteHandlers, getSSOAccessToken, getSSOSession, handleSSOCallback, handleSSOLogout, handleSSORedirect };
