/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Label for the environment badge in the header: "production", "staging", "local"… */
  readonly VITE_APP_ENV?: string;
  /** Dev only: skip the staff API and sign in as a fake staff user. Ignored in production builds. */
  readonly VITE_STAFF_MOCK?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
