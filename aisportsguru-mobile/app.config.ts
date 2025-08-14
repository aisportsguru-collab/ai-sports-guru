import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'AI Sports Guru',
  slug: 'ai-sports-guru',
  scheme: 'aisportsguru',
  owner: 'aisportsguru',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  ios: {
    bundleIdentifier: 'com.aisportsguru.app',
    supportsTablet: false,
    buildNumber: '1.0.0',
    infoPlist: {
      // Answered "yes" to standard/exempt encryption -> set this to false
      ITSAppUsesNonExemptEncryption: false
    }
  },
  android: {
    package: 'com.aisportsguru.app',
    versionCode: 1
  },
  extra: {
    eas: {
      projectId: 'd7861c8f-a2c5-4f9e-a4f5-5b483dcaa789'
    }
  }
};

export default () => config;
