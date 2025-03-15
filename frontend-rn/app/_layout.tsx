import 'react-native-reanimated';
import { useEffect } from 'react';
import { Slot } from 'expo-router';
import { useFonts } from 'expo-font';
import Constants from 'expo-constants';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';

import { AuthProvider,  } from '@/context/authProvider';
import { useColorScheme } from '@/hooks/useColorScheme';

import { client } from '@/src/client/client.gen';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useReactQueryDevTools } from '@dev-plugins/react-query';
import { getTokenFromStorage } from '@/context/useStorageState';

// set up @hey-api/client-fetch client
client.setConfig({
  baseUrl: Constants.expoConfig?.extra?.API_URL || 'http://localhost:8000',
  auth: async () => {
    const token = await getTokenFromStorage();
    return token ?? '';
  }
});

client.interceptors.request.use(async (request) => {
  console.log('Request:', JSON.stringify(request, null, 2));
  return request;
});

client.interceptors.response.use((response) => {
  console.log('Response:', JSON.stringify(response, null, 2));
  return response;
});


// set up tanstack/react-query client
const queryClient = new QueryClient();

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function Root() {
  // TODO: this is only used for debugging, delete this in production.
  useReactQueryDevTools(queryClient);

  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
        <AuthProvider>
          <Slot />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
