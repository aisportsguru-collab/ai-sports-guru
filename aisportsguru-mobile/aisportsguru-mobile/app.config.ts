import { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'AI Sports Guru',
  slug: 'aisportsguru-mobile',
  scheme: 'aisportsguru',
  plugins: ['expo-router'],
  experiments: { typedRoutes: true },
  ios: { bundleIdentifier: 'com.aisportsguru.app' },
  android: { package: 'com.aisportsguru.app' },
};

export default config;
