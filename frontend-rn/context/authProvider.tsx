import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useContext, createContext, type PropsWithChildren } from 'react';
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useStorageState } from './useStorageState';
import { handleError } from '@/utils/utils';
import { UserPublic,
  UserRegister,
  GoogleAuthRequest,
  BodyLoginLoginForAccessToken,
} from '@/src/client';
import {
  loginForAccessTokenMutation,
  readUserMeOptions,
  readUsersQueryKey,
  registerUserMutation,
  authGoogleMutation
} from '@/src/client/@tanstack/react-query.gen';

type AuthContextType = {
  session: string | null;
  isLoading: boolean;
  isLoggedIn: boolean;
  currentUser?: UserPublic;
  signIn: (token: string) => void;
  signInWithBackend: (credentials: { username: string; password: string }) => Promise<void>;
  signUpWithBackend: (data: UserRegister) => Promise<void>;
  signInWithGoogle: (data : GoogleAuthRequest) => Promise<void>;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [[isLoading, token], setToken] = useStorageState('sessionToken');
  const router = useRouter();
  const queryClient = useQueryClient()

  const isLoggedIn = Boolean(token);

  const { data: currentUser } = useQuery({
    ...readUserMeOptions(),
    enabled: isLoggedIn,
  })

  const signIn = (token: string) => {
    setToken(token);
  };

  const signOut = () => {
    setToken(null);
  };

  const signInWithBackendMutation = useMutation({
    ...loginForAccessTokenMutation(),
    onSuccess: (data) => {
      signIn(data.access_token);
      router.replace('/');
    },
    onError: (error) => {
      handleError(error, 'An error occurred during login. Please try again.');
    },
  });

  const signUpWithBackendMutation = useMutation({
    ...registerUserMutation(),
    onSuccess: () => {
      Alert.alert('Success', 'Signed Up in successfully!');
      router.push('/sign-in');
    },
    onError: (error) => {
      handleError(error, 'An error occurred during sign-up. Please try again.');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: readUsersQueryKey() });
    },
  })

  const signInWithGoogleMutation = useMutation({
    ...authGoogleMutation(),
    onSuccess: (data) => {
      signIn(data.access_token);
      router.replace('/');
    },
    onError: (error) => {
      handleError(error, 'An error occurred during sign-in. Please try again.');
    },
  });

  async function signInWithBackend(data: BodyLoginLoginForAccessToken): Promise<void> {
    await signInWithBackendMutation.mutateAsync({body: data});
  }

  async function signUpWithBackend(data: UserRegister): Promise<void> {
    await signUpWithBackendMutation.mutateAsync({ body: data });
  }

  async function signInWithGoogle(data: GoogleAuthRequest): Promise<void> {
    await signInWithGoogleMutation.mutateAsync({ body: data});
  }

  return (
    <AuthContext.Provider
      value={{
        session: token,
        isLoading,
        isLoggedIn,
        currentUser,
        signIn,
        signInWithGoogle,
        signInWithBackend,
        signUpWithBackend,
        signOut,
      }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
