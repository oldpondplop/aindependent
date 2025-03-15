import { Redirect, Slot } from 'expo-router';
import { Text } from 'react-native';
import { useAuth } from '@/context/authProvider';

export default function AppLayout() {
  const { session, isLoading } = useAuth();

  // Show a loading placeholder while checking authentication
  if (isLoading) {
    return <Text>Loading...</Text>;
  }

  // Redirect to the sign-in screen if the user is not authenticated
  if (!session) {
    return <Redirect href="/sign-in" />;
  }

  // Render the protected layout for authenticated users
  return <Slot />;
}
