/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly BASE_URL: string;
  /** True in the static (GitHub Pages) build: no backend; data is bundled + localStorage. */
  readonly VITE_STATIC?: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
