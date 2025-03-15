import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { useAuth } from '@/context/authProvider';
import { router } from 'expo-router';
import { useThemeColor } from '@/hooks/useThemeColor';
import Constants from 'expo-constants';

export default function Home() {
  const { currentUser } = useAuth();
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');
  const cardBackground = useThemeColor({}, 'inputBackground');
  const borderColor = useThemeColor({}, 'border') || '#e0e0e0';

  // Define your routes here to make it easy to add new ones
  const ROUTES = [
    { name: 'Health Check', path: '/health-check' },
    { name: 'Profile', path: '/profile' },
    // Add more routes as needed
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome Message */}
        <View style={styles.header}>
          <Text style={[styles.welcomeText, { color: textColor }]}>
            Welcome, {currentUser?.full_name || currentUser?.email}!
          </Text>
        </View>

        {/* Quick Links Section */}
        <View style={[styles.linksContainer, { borderColor }]}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>
            Navigation
          </Text>
          <View style={styles.linkGrid}>
            {ROUTES.map((route, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.linkButton, { backgroundColor: cardBackground, borderColor }]}
                onPress={() => router.push(route.path)}
              >
                <Text style={[styles.linkText, { color: tintColor }]}>
                  {route.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Constants.statusBarHeight + 20,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    marginBottom: 24,
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  linksContainer: {
    marginBottom: 24,
    borderTopWidth: 1,
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  linkGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  linkButton: {
    width: '48%',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
  },
  linkText: {
    fontSize: 16,
    fontWeight: '500',
  },
});
