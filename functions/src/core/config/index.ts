import {STATIC_CONFIG} from './static-config';
import {getRuntimeConfig, RuntimeConfig} from './runtime-config';
import {SECRET_REFERENCES} from './secrets';

export interface AppConfig {
  static: typeof STATIC_CONFIG;
  runtime: RuntimeConfig;
}

export function getConfig(): AppConfig {
  return {
    static: STATIC_CONFIG,
    runtime: getRuntimeConfig(),
  };
}

// Re-export for convenience
export {STATIC_CONFIG, SECRET_REFERENCES, getRuntimeConfig};
export type {RuntimeConfig};
