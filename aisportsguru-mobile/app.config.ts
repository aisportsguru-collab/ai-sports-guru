import type { ExpoConfig } from '@expo/config';

export default ({ config }: { config: ExpoConfig }) => {
  // Fall back to your known projectId if env isn't set
  const projectId =
    process.env.EAS_PROJECT_ID ??
    (config?.extra as any)?.eas?.projectId ??
    '764a46a7-2d12-4edb-b2c2-8dff7570ff3c';

  return {
    ...config,
    extra: {
      ...(config.extra ?? {}),
      eas: {
        ...((config.extra as any)?.eas ?? {}),
        projectId
      }
    }
  };
};
/* ---- bundle id injection (auto-appended; safe if id already set) ---- */
const __wrapIds = (cfg: any) => {
  cfg.ios = cfg.ios || {};
  cfg.ios.bundleIdentifier = cfg.ios.bundleIdentifier || "com.aisportsguru.app";
  cfg.ios.buildNumber = cfg.ios.buildNumber || "1";
  return cfg;
};
try {
  // If the file exports a function, re-wrap its return
  const __orig = (exports as any).default;
  if (typeof __orig === "function") {
    // @ts-ignore
    (exports as any).default = (...args: any[]) => __wrapIds(__orig(...args));
  } else if (__orig && typeof __orig === "object") {
    // @ts-ignore
    (exports as any).default = __wrapIds(__orig);
  }
} catch {}
