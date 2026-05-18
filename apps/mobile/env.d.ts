/** Minimal `process.env` typing for EXPO_PUBLIC_* vars (avoids adding @types/node to tsconfig). */
declare namespace NodeJS {
  interface ProcessEnv {
    EXPO_PUBLIC_MAPTILER_API_KEY?: string;
    EXPO_PUBLIC_MAPTILER_STYLE_ID?: string;
  }
}

declare const process: {
  env: NodeJS.ProcessEnv;
};
