import React from 'react';
import { StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ThemedView } from '@/components/ThemedView';
import { ActivityIndicator } from 'react-native';

export default function WebViewScreen() {
  const router = useRouter();
  const { url } = useLocalSearchParams();
  
  if (!url) {
    router.back();
    return null;
  }

  const handleNavigationStateChange = (navState: any) => {
    // Check if we've been redirected to success or cancel URLs
    if (navState.url.includes('subscription-success')) {
      // Redirect to subscription page after successful payment
      setTimeout(() => {
        router.push('/subscription');
      }, 1000);
    } else if (navState.url.includes('subscription-cancel')) {
      // Go back to subscription page if payment was canceled
      router.back();
    }
  };

  return (
    <ThemedView style={styles.container}>
      <WebView
        source={{ uri: url as string }}
        style={styles.webview}
        onNavigationStateChange={handleNavigationStateChange}
        startInLoadingState={true}
        renderLoading={() => (
          <ThemedView style={styles.loadingContainer}>
            <ActivityIndicator size="large" />
          </ThemedView>
        )}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
