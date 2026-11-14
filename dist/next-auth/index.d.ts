interface SSOUPProviderOptions {
    ssoUrl?: string;
    clientId?: string;
    clientSecret?: string;
    scope?: string;
    prompt?: 'login' | string | null;
}
/**
 * Pre-configured NextAuth.js / Auth.js OAuth Provider for SSO UP.
 * Compatible with NextAuth v4 and NextAuth v5 (Auth.js).
 *
 * Usage in `pages/api/auth/[...nextauth].ts` or `app/api/auth/[...nextauth]/route.ts`:
 * ```ts
 * import NextAuth from 'next-auth';
 * import { SSOUPProvider } from '@webkampus/sso-client-next/next-auth';
 *
 * export default NextAuth({
 *   providers: [
 *     SSOUPProvider({
 *       clientId: process.env.SSO_CLIENT_ID,
 *       clientSecret: process.env.SSO_CLIENT_SECRET,
 *     })
 *   ]
 * })
 * ```
 */
declare function SSOUPProvider(options?: SSOUPProviderOptions): {
    id: string;
    name: string;
    type: string;
    version: string;
    authorization: {
        url: string;
        params: {
            prompt?: string | undefined;
            scope: string;
        };
    };
    token: string;
    userinfo: string;
    clientId: string;
    clientSecret: string;
    profile(profile: any): {
        id: any;
        name: any;
        email: any;
        username: any;
        role: any;
        image: any;
        sainsData: any;
    };
};

export { SSOUPProvider, type SSOUPProviderOptions };
