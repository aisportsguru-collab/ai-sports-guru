import type { ExpoConfig } from 'expo/config';
import appJson from './app.json';

export default (): ExpoConfig => {
  const base = (appJson as any).expo ?? {};
  const hasIconPng = true; // set to true; Expo will ignore if missing at build time for iOS dev

  return {
    ...base,

    // Simple, classy splash (no stretched image)
    splash: {
      backgroundColor: '#0b0f2a',
      resizeMode: 'contain',
      dark: {
        backgroundColor: '#0b0f2a',
        resizeMode: 'contain',
      },
      light: {
        backgroundColor: '#eaf0ff',
        resizeMode: 'contain',
      },
    },

    android: {
      ...(base.android ?? {}),
      // Point adaptive icon to a safe file if you have one; otherwise set a color only.
      adaptiveIcon: hasIconPng
        ? {
            foregroundImage: './assets/icon.png',
            backgroundColor: '#0b0f2a',
          }
        : undefined,
    },
  };
};
