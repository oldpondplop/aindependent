import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { useAuth } from '@/hooks/useAuth';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';

export default function ProfileScreen() {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText style={styles.title}>Profile</ThemedText>
      
      {user ? (
        <View style={styles.profileContainer}>
          <ThemedText style={styles.label}>Email:</ThemedText>
          <ThemedText style={styles.value}>{user.email}</ThemedText>
          
          <ThemedText style={styles.label}>Name:</ThemedText>
          <ThemedText style={styles.value}>{user.full_name || 'Not provided'}</ThemedText>
          
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ThemedText>Not logged in</ThemedText>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  profileContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    marginBottom: 16,
  },
  logoutButton: {
    backgroundColor: '#f44336',
    borderRadius: 4,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
