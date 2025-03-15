import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { client } from '@/src/client/client.gen';
import { UtilsService } from '@/src/client';

export default function HealthCheckScreen() {
  const [isHealthy, setIsHealthy] = useState<boolean | null>(null);

  const checkHealth = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 500);

      await UtilsService.healthCheck({
        client,
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      setIsHealthy(true);
    } catch (error) {
      setIsHealthy(false);
    }
  };

  // Check immediately and set up interval
  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 500);
    return () => clearInterval(interval);
  }, []);

  // Null state is loading (first check)
  const backgroundColor = isHealthy === null ? '#f3f4f6' : isHealthy ? '#22c55e' : '#ef4444';

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor }]}
      activeOpacity={0.8}
      onPress={checkHealth}
    >
      {isHealthy !== null && (
        <Text style={styles.statusText}>
          {isHealthy ? 'ONLINE' : 'OFFLINE'}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 28,
    letterSpacing: 1.5
  }
});
