import React, { useEffect } from 'react';
import { Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import Constants from 'expo-constants';
import { useAuth } from '@/context/authProvider';
import { AntDesign } from '@expo/vector-icons';
import { useThemeColor } from '@/hooks/useThemeColor';
import Google from 'expo-auth-session/providers/google';

// Always call this to ensure any web popups are dismissed when the auth session completes.
WebBrowser.maybeCompleteAuthSession();

const discovery: AuthSession.DiscoveryDocument = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke'
};

const platform = Platform.OS

export default function GoogleSignIn() {
  const { signInWithGoogle } = useAuth();
  const isWeb = Platform.OS === 'web';

  const clientId = isWeb ? Constants.expoConfig?.extra?.GOOGLE_WEB_CLIENT_ID : Constants.expoConfig?.extra?.GOOGLE_ANDROID_CLIENT_ID;


  // const redirectUriAndroid = `${Constants.expoConfig?.android?.package}:/oauthredirect`;
  const redirectUriAndroid = AuthSession.makeRedirectUri({
    native: `${Constants.expoConfig?.android?.package}:/sign-in`,
  });

  const redirectUriWeb = "http://127.0.0.1:8081/sign-in";  // this doesnt work
  const redirectUri = isWeb ? redirectUriWeb : redirectUriAndroid;

  console.log('Client ID:', clientId);
  console.log('Redirect URI:', redirectUri);

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId,
      redirectUri,
      scopes: ['openid', 'profile', 'email'],
      responseType: AuthSession.ResponseType.Code,
      usePKCE: true,
    },
    discovery
  );

  useEffect(() => {
    console.log('Response:', response);
    if (response?.type === 'success' && response.params.code) {
      const code = response.params.code;
      const codeVerifier = request?.codeVerifier || '';
      signInWithGoogle({ code, codeVerifier, platform});
    }
  }, [response]);

  const borderColor = useThemeColor({}, 'tabIconDefault');
  const buttonBackground = useThemeColor({}, 'buttonBackground');
  const buttonTextColor = useThemeColor({}, 'buttonText');

  return (
    <TouchableOpacity
      style={[styles.googleButton, { borderColor, backgroundColor: buttonBackground }]}
      disabled={!request}
      onPress={() => promptAsync()}
    >
      <AntDesign name="google" size={24} color={buttonTextColor} />
      <Text style={[styles.googleButtonText, { color: buttonTextColor }]}>Sign in with Google</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: 400,
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 20,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
});
