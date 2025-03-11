import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import Constants from 'expo-constants';
import { client } from '@/src/client/client.gen';

import { useColorScheme } from '@/hooks/useColorScheme';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useReactQueryDevTools } from '@dev-plugins/react-query';
import { AuthProvider, getTokenFromStorage } from '@/context/auth';

client.setConfig({
  baseUrl: Constants.expoConfig?.extra?.API_URL || 'http://localhost:8000',
  auth: async () => {
    const token = await getTokenFromStorage();
    return token;
  },
});

client.interceptors.request.use(async (request) => {
  console.log(`Request: ${request}`);
  return request;
});

client.interceptors.response.use((response) => {
  console.log(`Response: ${response}`);
  return response;
});

const queryClient = new QueryClient();

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useReactQueryDevTools(queryClient);  // TODO: this is only used for debugging, delte this in prod.

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
        <AuthProvider>
          <Stack>
            {/* Public routes */}
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            {/* Protected routes */}
            <Stack.Screen name="(app)" options={{ headerShown: false }} />
            <Stack.Screen name="+not-found" />
          </Stack>
        </AuthProvider>
        <StatusBar style="auto" />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
