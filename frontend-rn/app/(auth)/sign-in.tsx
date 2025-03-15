import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import LoginForm from '@/components/BackendLogin';
import GoogleLogin from '@/components/GoogleLogin';
import { useThemeColor } from '@/hooks/useThemeColor';

export default function SignIn() {
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');
  const dividerColor = useThemeColor({}, 'tabIconDefault');

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <Text style={[styles.title, { color: textColor }]}>Welcome Back</Text>
      <Text style={[styles.subtitle, { color: textColor }]}>Sign in to continue</Text>

      {/* Google Login */}
      <GoogleLogin />

      {/* Divider */}
      <View style={styles.dividerContainer}>
        <View style={[styles.dividerLine, { backgroundColor: dividerColor }]} />
        <Text style={[styles.dividerText, { color: dividerColor }]}>OR</Text>
        <View style={[styles.dividerLine, { backgroundColor: dividerColor }]} />
      </View>

      {/* Backend Login */}
      <LoginForm />

      {/* Sign Up Link */}
      <TouchableOpacity onPress={() => router.push('/sign-up')}>
        <Text style={[styles.linkText, { color: textColor }]}>
          Don't have an account? <Text style={[styles.link, { color: tintColor }]}>Sign Up</Text>
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 30,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 10,
  },
  linkText: {
    marginTop: 20,
  },
  link: {
    fontWeight: 'bold',
  },
});
