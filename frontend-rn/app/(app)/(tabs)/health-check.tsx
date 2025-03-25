import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { OpenAPI, UtilsService } from '@/src/client';

export default function HealthCheckScreen() {
  const fullUrl = `${OpenAPI.BASE}/api/v1/utils/health-check/`;
  console.log("Calling health check at:", fullUrl);

  const { data, error, isLoading } = useQuery({
    queryKey: ['health-check'],
    queryFn: () => UtilsService.healthCheck(),
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchInterval: 30000
  });

  return (
    <View style={styles.container}>
      {isLoading ? <ActivityIndicator size="small" color="#0000ff" /> :
      <Text style={error ? styles.errorText : styles.statusText}>
        {error ? `Error: ${error instanceof Error ? error.message : 'Unknown'}` : `Status: ${data ? 'Healthy ✓' : 'Unhealthy ✗'}`}
      </Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  statusText: { color: '#22c55e', fontWeight: 'bold' },
  errorText: { color: '#ef4444', fontWeight: 'bold' },
});
