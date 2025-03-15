import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, useColorScheme } from 'react-native';
import { useAuth } from '@/context/authProvider';
import Constants from 'expo-constants';
import { useThemeColor } from '@/hooks/useThemeColor';

export default function Profile() {
  const { currentUser, signOut } = useAuth();
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const placeholderBackground = useThemeColor({}, 'inputBackground');
  const placeholderTextColor = useThemeColor({}, 'inputText');
  const buttonBackground = useThemeColor({}, 'buttonBackground');
  const buttonTextColor = useThemeColor({}, 'buttonText');
  const theme = useColorScheme();

  return (
    <View style={[styles.container, { backgroundColor }]}>
      {/* Profile Section */}
      <View style={styles.profileSection}>
        <Image
          source={require('../../../assets/images/pfp.png')}
          style={styles.profileImage}
        />
        <Text style={[styles.profileName, { color: textColor }]}>{currentUser?.full_name || 'User'}</Text>
        <Text style={[styles.profileEmail, { color: placeholderTextColor }]}>{currentUser?.email}</Text>
      </View>

      {/* Settings Section */}
      <View style={[styles.settingsSection, { backgroundColor: placeholderBackground }]}>
        <Text style={[styles.settingsTitle, { color: textColor }]}>Settings</Text>

        {/* Theme Setting */}
        <TouchableOpacity style={styles.settingItem}>
          <Text style={[styles.settingText, { color: textColor }]}>Theme</Text>
          <Text style={[styles.settingValue, { color: placeholderTextColor }]}>
            {theme === 'light' ? 'Light' : 'Dark'}
          </Text>
        </TouchableOpacity>

        {/* Notifications Setting */}
        <TouchableOpacity style={styles.settingItem}>
          <Text style={[styles.settingText, { color: textColor }]}>Notifications</Text>
          <Text style={[styles.settingValue, { color: placeholderTextColor }]}>On</Text>
        </TouchableOpacity>
      </View>

      {/* Sign Out Button */}
      <TouchableOpacity
        style={[styles.signOutButton, { backgroundColor: buttonBackground }]}
        onPress={signOut}
      >
        <Text style={[styles.signOutButtonText, { color: buttonTextColor }]}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: Constants.statusBarHeight + 20,
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 10,
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  profileEmail: {
    fontSize: 16,
  },
  settingsSection: {
    borderRadius: 10,
    padding: 20,
  },
  settingsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  settingText: {
    fontSize: 16,
  },
  settingValue: {
    fontSize: 16,
  },
  signOutButton: {
    marginTop: 20,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  signOutButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});
