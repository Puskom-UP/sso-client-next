/**
 * Configuration parameters for SSOClient
 */
interface SSOConfig {
    /** Base URL of SSO UP server (e.g. "https://sso.universitaspahlawan.ac.id" or "http://localhost:8000") */
    ssoUrl: string;
    /** OAuth Client ID */
    clientId: string;
    /** OAuth Client Secret */
    clientSecret: string;
    /** Callback URL registered on SSO Server (e.g. "http://localhost:3000/api/sso/callback") */
    redirectUri?: string;
    /** Default OAuth scope (default: "*") */
    scope?: string;
    /** Force re-authentication prompt mode ("login" or undefined/null) */
    prompt?: 'login' | string | null;
}
/**
 * OAuth2 Token response from /oauth/token
 */
interface SSOTokenResponse {
    token_type: string;
    expires_in: number;
    access_token: string;
    refresh_token?: string;
}
/**
 * SAINS profile structure attached to SSO UserInfo
 */
interface SainsProfile {
    nidn?: string;
    nim?: string;
    nip?: string;
    fid?: string;
    prodi?: string;
    nama_prodi?: string;
    fakultas?: string;
    nama_fakultas?: string;
    foto?: string;
    avatar?: string;
    alamat?: string;
    phone?: string;
    telepon?: string;
    [key: string]: any;
}
/**
 * OpenID / OAuth UserInfo response from /api/userinfo
 */
interface SSOUserInfo {
    /** User unique identifier on SSO Server */
    sub: string;
    /** Username (NIDN/NIM/NIP) */
    username: string;
    /** Full name */
    name: string;
    /** Email address */
    email: string;
    /** System role (admin, dosen, mahasiswa, pegawai, user) */
    role: string;
    /** SAINS profile payload */
    profile?: SainsProfile;
    [key: string]: any;
}
/**
 * Raw User model response from /api/user (fallback)
 */
interface SSORawUser {
    id: number;
    name: string;
    username: string;
    email: string;
    role: string;
    sains_data?: SainsProfile;
    avatar?: string;
    alamat?: string;
    [key: string]: any;
}
/**
 * Parameters for building authorization URL
 */
interface AuthorizationUrlOptions {
    state?: string;
    redirectUri?: string;
    scope?: string;
    prompt?: 'login' | string | null;
}

export type { AuthorizationUrlOptions as A, SSOConfig as S, SSOTokenResponse as a, SSOUserInfo as b, SSORawUser as c, SainsProfile as d };
