import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  slug: config.slug || 'aindependent',
  name: config.name || 'aindependent',
  extra: {
    ...config?.extra,
    API_URL: process.env.API_URL || 'http://localhost:8000',
    GOOGLE_WEB_CLIENT_ID: process.env.GOOGLE_WEB_CLIENT_ID,
    GOOGLE_ANDROID_CLIENT_ID: process.env.GOOGLE_ANDROID_CLIENT_ID,
   }
});

// console.log('API_URL', process.env.API_URL);
// console.log('GOOGLE_WEB_CLIENT_ID', process.env.GOOGLE_WEB_CLIENT_ID);
// console.log('GOOGLE_ANDROID_CLIENT_ID', process.env.GOOGLE_ANDROID_CLIENT_ID);
