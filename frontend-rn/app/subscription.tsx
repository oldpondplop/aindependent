import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { OpenAPI } from '@/src/client';
import axios from 'axios';

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  interval: string;
  stripe_price_id: string;
}

export default function SubscriptionScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([
    {
      id: '1',
      name: 'Basic Plan',
      description: 'Access to basic features',
      price: 30,
      interval: 'month',
      stripe_price_id: 'price_basic'
    },
    {
      id: '2',
      name: 'Premium Plan',
      description: 'Access to all premium features',
      price: 50,
      interval: 'month',
      stripe_price_id: 'price_premium'
    }
  ]);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [currentSubscription, setCurrentSubscription] = useState<any>(null);

  useEffect(() => {
    fetchSubscriptionStatus();
  }, []);

  const fetchSubscriptionStatus = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${OpenAPI.BASE}/api/v1/stripe/subscriptions`);
      if (response.data.count > 0) {
        setCurrentSubscription(response.data.data[0]);
      }
    } catch (error) {
      console.error('Error fetching subscription status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = (planId: string) => {
    setSelectedPlan(planId);
  };

  const handleSubscribe = async () => {
    if (!selectedPlan) {
      Alert.alert('Error', 'Please select a subscription plan');
      return;
    }

    try {
      setLoading(true);
      const plan = plans.find(p => p.id === selectedPlan);
      
      if (!plan) {
        Alert.alert('Error', 'Invalid plan selected');
        return;
      }

      // Create customer if needed
      await axios.post(`${OpenAPI.BASE}/api/v1/stripe/create-customer`);
      
      // Create checkout session
      const response = await axios.post(`${OpenAPI.BASE}/api/v1/stripe/create-checkout-session`, {
        price_id: plan.stripe_price_id,
        success_url: `${OpenAPI.BASE}/subscription-success`,
        cancel_url: `${OpenAPI.BASE}/subscription-cancel`
      });

      // Open the checkout URL in a WebView
      router.push({
        pathname: '/web-view',
        params: { url: response.data.url }
      });
    } catch (error) {
      console.error('Error creating subscription:', error);
      Alert.alert('Error', 'Failed to create subscription. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!currentSubscription) return;

    Alert.alert(
      'Cancel Subscription',
      'Are you sure you want to cancel your subscription? You will still have access until the end of your billing period.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await axios.post(
                `${OpenAPI.BASE}/api/v1/stripe/cancel-subscription/${currentSubscription.stripe_subscription_id}`
              );
              Alert.alert('Success', 'Your subscription has been canceled');
              fetchSubscriptionStatus();
            } catch (error) {
              console.error('Error canceling subscription:', error);
              Alert.alert('Error', 'Failed to cancel subscription. Please try again.');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleManageSubscription = async () => {
    try {
      setLoading(true);
      const response = await axios.post(`${OpenAPI.BASE}/api/v1/stripe/create-customer-portal-session`, {
        return_url: `${OpenAPI.BASE}/subscription`
      });
      
      // Open the customer portal URL in a WebView
      router.push({
        pathname: '/web-view',
        params: { url: response.data.url }
      });
    } catch (error) {
      console.error('Error opening customer portal:', error);
      Alert.alert('Error', 'Failed to open customer portal. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <ThemedText style={styles.title}>Subscription Plans</ThemedText>
        
        {currentSubscription ? (
          <View style={styles.currentSubscriptionContainer}>
            <ThemedText style={styles.currentSubscriptionTitle}>Current Subscription</ThemedText>
            <ThemedText style={styles.currentSubscriptionDetails}>
              Status: {currentSubscription.status}
            </ThemedText>
            {currentSubscription.cancel_at_period_end && (
              <ThemedText style={styles.canceledText}>
                Your subscription will end on {new Date(currentSubscription.current_period_end * 1000).toLocaleDateString()}
              </ThemedText>
            )}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.manageButton]}
                onPress={handleManageSubscription}
              >
                <Text style={styles.buttonText}>Manage Subscription</Text>
              </TouchableOpacity>
              
              {!currentSubscription.cancel_at_period_end && (
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={handleCancelSubscription}
                >
                  <Text style={styles.cancelButtonText}>Cancel Subscription</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ) : (
          <>
            <ThemedText style={styles.subtitle}>Choose a subscription plan</ThemedText>
            
            {plans.map((plan) => (
              <TouchableOpacity
                key={plan.id}
                style={[
                  styles.planCard,
                  selectedPlan === plan.id && styles.selectedPlan
                ]}
                onPress={() => handleSelectPlan(plan.id)}
              >
                <ThemedText style={styles.planName}>{plan.name}</ThemedText>
                <ThemedText style={styles.planDescription}>{plan.description}</ThemedText>
                <ThemedText style={styles.planPrice}>${plan.price}/{plan.interval}</ThemedText>
              </TouchableOpacity>
            ))}
            
            <TouchableOpacity
              style={[styles.button, styles.subscribeButton, !selectedPlan && styles.disabledButton]}
              onPress={handleSubscribe}
              disabled={!selectedPlan}
            >
              <Text style={styles.buttonText}>Subscribe Now</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 20,
  },
  planCard: {
    padding: 20,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  selectedPlan: {
    borderColor: '#007bff',
    backgroundColor: 'rgba(0, 123, 255, 0.1)',
  },
  planName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  planDescription: {
    marginBottom: 10,
  },
  planPrice: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  button: {
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 20,
  },
  subscribeButton: {
    backgroundColor: '#007bff',
  },
  manageButton: {
    backgroundColor: '#007bff',
    flex: 1,
    marginRight: 10,
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#dc3545',
    flex: 1,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  cancelButtonText: {
    color: '#dc3545',
    fontWeight: 'bold',
    fontSize: 16,
  },
  disabledButton: {
    backgroundColor: '#cccccc',
  },
  currentSubscriptionContainer: {
    padding: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 20,
  },
  currentSubscriptionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  currentSubscriptionDetails: {
    marginBottom: 10,
  },
  canceledText: {
    color: '#dc3545',
    marginBottom: 10,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
