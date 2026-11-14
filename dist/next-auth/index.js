"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/next-auth/index.ts
var next_auth_exports = {};
__export(next_auth_exports, {
  SSOUPProvider: () => SSOUPProvider
});
module.exports = __toCommonJS(next_auth_exports);

// src/config.ts
function getSSOConfig(overrideConfig) {
  const ssoUrl = (overrideConfig?.ssoUrl || process.env.SSO_URL || process.env.NEXT_PUBLIC_SSO_URL || "http://localhost:8000").replace(/\/+$/, "");
  const clientId = overrideConfig?.clientId || process.env.SSO_CLIENT_ID || process.env.NEXT_PUBLIC_SSO_CLIENT_ID || "";
  const clientSecret = overrideConfig?.clientSecret || process.env.SSO_CLIENT_SECRET || "";
  const redirectUri = overrideConfig?.redirectUri || process.env.SSO_REDIRECT_URI || "";
  const scope = overrideConfig?.scope || process.env.SSO_SCOPE || "*";
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

// src/next-auth/provider.ts
function SSOUPProvider(options) {
  const config = getSSOConfig(options);
  return {
    id: "sso-up",
    name: "SSO Universitas Pahlawan",
    type: "oauth",
    version: "2.0",
    authorization: {
      url: `${config.ssoUrl}/oauth/authorize`,
      params: {
        scope: config.scope || "*",
        ...config.prompt ? { prompt: config.prompt } : {}
      }
    },
    token: `${config.ssoUrl}/oauth/token`,
    userinfo: `${config.ssoUrl}/api/userinfo`,
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    profile(profile) {
      return {
        id: profile.sub || String(profile.id),
        name: profile.name,
        email: profile.email,
        username: profile.username,
        role: profile.role || "user",
        image: profile.avatar || profile.profile?.avatar || profile.profile?.foto || null,
        sainsData: profile.profile || profile.sains_data || {}
      };
    }
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  SSOUPProvider
});
//# sourceMappingURL=index.js.map