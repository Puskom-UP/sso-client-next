# @univpahlawan/sso-client-next

Klien **SSO Universitas Pahlawan** (OAuth2 Authorization Code) untuk aplikasi **Next.js App Router**, dikelola oleh **UPT Komputer & Sistem Informasi**.

Fitur:
- OAuth2 Authorization Code ke SSO UP (`/oauth/authorize`, `/oauth/token`, `/api/user`).
- **Seamless SSO** — sekali login di SSO, semua app yang memakai host SSO sama tidak minta login lagi.
- **Auto-login senyap (`prompt=none`)** — begitu halaman dibuka, jika sudah login di SSO langsung masuk tanpa UI; jika belum, tetap sebagai tamu (tanpa loop).
- **Proteksi CSRF `state`** bawaan (acak, terikat cookie, timing-safe).
- Otentikasi saja — **hak akses (otorisasi) diatur masing-masing aplikasi**.

## Instalasi

```bash
npm install git+https://github.com/Puskom-UP/sso-client-next.git
```

## Konfigurasi (.env)

```env
SSO_URL=https://sso-v2.universitaspahlawan.ac.id
SSO_CLIENT_ID=<client id aplikasi Anda>
SSO_CLIENT_SECRET=<client secret>
SSO_REDIRECT_URI=https://app-anda.universitaspahlawan.ac.id/api/sso/callback
SSO_SCOPE=*
# "" = seamless (default), "none" = silent, "login" = paksa login ulang
SSO_PROMPT=
APP_URL=https://app-anda.universitaspahlawan.ac.id
```

> Daftarkan `client_id`/`client_secret` ke UPT Komputer dengan `redirect_uri` di atas.

## Pemakaian — App Router

**`app/api/sso/[...sso]/route.ts`**

```ts
import { createSSORouteHandlers } from "@univpahlawan/sso-client-next/next";

export const { GET, POST } = createSSORouteHandlers({
  appOrigin: process.env.APP_URL,
  loginRedirect: "/?sso_login=success",
  onAuthenticated: async (user) => {
    // Sinkronkan/mapping user ke peran aplikasi Anda di sini (otorisasi lokal).
    console.log("Login:", user.username, user.name);
  },
});
```

Endpoint yang tersedia: `/api/sso/redirect`, `/api/sso/silent`, `/api/sso/callback`, `/api/sso/logout`, `/api/sso/session`.

### Tombol login

```tsx
<a href="/api/sso/redirect">Masuk dengan SSO UP</a>
```

### Auto-login senyap saat buka halaman (opsional)

Di klien, saat user belum login di aplikasi:

```ts
if (!loggedIn && !/(?:^|;\s*)sso_silent_tried=/.test(document.cookie)) {
  window.location.href = "/api/sso/silent"; // diam-diam; cooldown cookie diatur otomatis
}
```

Jika sudah punya sesi SSO → langsung masuk. Jika belum → kembali sebagai tamu (tanpa loop, cooldown 5 menit).

### Membaca sesi (server)

```ts
import { getSSOSession } from "@univpahlawan/sso-client-next/next";
const session = await getSSOSession(); // { user, tokens } | null
```

> ⚠️ Cookie sesi hanya alat transport identitas. **Jangan** dipakai langsung untuk keputusan hak akses — lakukan otorisasi (role/izin) di aplikasi Anda sendiri, berbasis `user.username`/`email` dari SAINS.

## Lisensi

MIT © UPT Komputer & Sistem Informasi, Universitas Pahlawan Tuanku Tambusai.
