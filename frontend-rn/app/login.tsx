import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { useGoogleAuth } from '@/hooks/useGoogleAuth';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { useRouter } from 'expo-router';

export default function LoginScreen() {
  const { googleSignIn } = useGoogleAuth();
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);
      const success = await googleSignIn();
      if (success) {
        // Navigate to home screen on successful login
        router.replace('/');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during sign in');
      console.error('Google sign in error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.logoContainer}>
        <Image 
          source={require('../assets/images/icon.png')} 
          style={styles.logo}
          resizeMode="contain"
        />
      </View>
      
      <ThemedText style={styles.title}>Welcome</ThemedText>
      <ThemedText style={styles.subtitle}>Sign in to continue</ThemedText>
      
      {error && (
        <View style={styles.errorContainer}>
          <ThemedText style={styles.errorText}>{error}</ThemedText>
        </View>
      )}
      
      <TouchableOpacity 
        style={styles.googleButton}
        onPress={handleGoogleSignIn}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <>
            <Image 
              source={require('../assets/images/google-logo.png')} 
              style={styles.googleIcon}
            />
            <Text style={styles.buttonText}>Sign in with Google</Text>
          </>
        )}
      </TouchableOpacity>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  logoContainer: {
    marginBottom: 40,
  },
  logo: {
    width: 120,
    height: 120,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 30,
    opacity: 0.7,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4285F4',
    borderRadius: 4,
    paddingVertical: 12,
    paddingHorizontal: 24,
    width: '100%',
    maxWidth: 300,
  },
  googleIcon: {
    width: 24,
    height: 24,
    marginRight: 12,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 2,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  errorContainer: {
    marginBottom: 20,
    padding: 10,
    backgroundColor: 'rgba(255, 0, 0, 0.1)',
    borderRadius: 4,
    width: '100%',
    maxWidth: 300,
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
  },
});
