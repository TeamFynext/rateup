/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Label for the environment badge in the header: "production", "staging", "local"… */
  readonly VITE_APP_ENV?: string;
  /** Dev only: skip the staff API and sign in as a fake staff user. Ignored in production builds. */
  readonly VITE_STAFF_MOCK?: string;
  /** The Workspace domain staff sign in with; only used for the hint in the add dialog. */
  readonly VITE_STAFF_DOMAIN?: string;
  /** The customer app; Share QR mints public survey links on it. */
  readonly VITE_CUSTOMER_APP_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
