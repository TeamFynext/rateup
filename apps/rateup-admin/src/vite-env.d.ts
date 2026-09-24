/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** rateup-api's origin, e.g. https://api.rateup.app (local: http://localhost:3001). */
  readonly VITE_API_URL: string;
  /** Label for the environment badge in the header: "production", "staging", "local"… */
  readonly VITE_APP_ENV?: string;
  /** Dev only: skip the staff API and sign in as a fake staff user. Ignored in production builds. */
  readonly VITE_STAFF_MOCK?: string;
  /** The Workspace domain staff sign in with; only used for the hint in the add dialog. */
  readonly VITE_STAFF_DOMAIN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
