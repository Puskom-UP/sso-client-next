import { S as SSOConfig, A as AuthorizationUrlOptions, a as SSOTokenResponse, b as SSOUserInfo, c as SSORawUser } from './types-DJIzN3pZ.js';
export { d as SainsProfile } from './types-DJIzN3pZ.js';

/**
 * Load SSOConfig from process.env or provided override parameters.
 */
declare function getSSOConfig(overrideConfig?: Partial<SSOConfig>): SSOConfig;

/**
 * SSO UP Client Class for Next.js and Node.js
 */
declare class SSOClient {
    config: SSOConfig;
    constructor(config?: Partial<SSOConfig>);
    /**
     * Get the base URL of the SSO UP Server (without trailing slash)
     */
    getBaseUrl(): string;
    /**
     * Build the OAuth authorization URL to redirect users to SSO UP
     */
    getAuthorizationUrl(options?: AuthorizationUrlOptions): string;
    /**
     * Exchange OAuth authorization code for Access Token and Refresh Token
     */
    exchangeCode(code: string, redirectUri?: string): Promise<SSOTokenResponse>;
    /**
     * Fetch structured user info from /api/userinfo (OpenID standard)
     */
    getUserInfo(accessToken: string): Promise<SSOUserInfo>;
    /**
     * Fetch raw user model from /api/user (Fallback)
     */
    getUser(accessToken: string): Promise<SSORawUser>;
    /**
     * Internal helper to normalize /api/user response to SSOUserInfo format
     */
    private getUserAsUserInfo;
    /**
     * SAINS API Proxy: Fetch list of Fakultas
     */
    getFakultas(accessToken: string): Promise<any>;
    /**
     * SAINS API Proxy: Fetch list of Prodi
     */
    getProdi(accessToken: string): Promise<any>;
    /**
     * SAINS API Proxy: Fetch Dosen detail
     */
    getDosen(accessToken: string, username?: string): Promise<any>;
    /**
     * SAINS API Proxy: Fetch Mahasiswa detail
     */
    getMahasiswa(accessToken: string, username?: string): Promise<any>;
    /**
     * SAINS API Proxy: Fetch Pegawai detail
     */
    getPegawai(accessToken: string, username?: string): Promise<any>;
    /**
     * Generic internal fetch for SAINS endpoints
     */
    private fetchSainsApi;
}
/**
 * Singleton factory helper
 */
declare function createSSOClient(config?: Partial<SSOConfig>): SSOClient;

export { AuthorizationUrlOptions, SSOClient, SSOConfig, SSORawUser, SSOTokenResponse, SSOUserInfo, createSSOClient, getSSOConfig };
