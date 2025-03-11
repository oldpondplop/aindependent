import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { useRouter } from 'expo-router';
import axios from 'axios';
import SubscriptionScreen from '../app/subscription';

// Mock dependencies
jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
  useLocalSearchParams: jest.fn().mockReturnValue({}),
}));

jest.mock('axios');
jest.mock('@/src/client', () => ({
  OpenAPI: {
    BASE: 'http://localhost:8000',
  },
}));

describe('SubscriptionScreen', () => {
  const mockRouter = {
    push: jest.fn(),
    back: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
  });

  it('renders subscription plans when user has no active subscription', async () => {
    // Mock API response for subscription status
    (axios.get as jest.Mock).mockResolvedValueOnce({
      data: {
        count: 0,
        data: [],
      },
    });

    const { getByText, getAllByText, queryByText } = render(<SubscriptionScreen />);

    // Wait for the component to load subscription data
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith('http://localhost:8000/api/v1/stripe/subscriptions');
    });

    // Check that subscription plans are rendered
    expect(getByText('Subscription Plans')).toBeTruthy();
    expect(getByText('Choose a subscription plan')).toBeTruthy();
    expect(getByText('Basic Plan')).toBeTruthy();
    expect(getByText('Premium Plan')).toBeTruthy();
    expect(getByText('$30/month')).toBeTruthy();
    expect(getByText('$50/month')).toBeTruthy();
    
    // Check that the subscribe button is rendered but disabled
    const subscribeButton = getByText('Subscribe Now');
    expect(subscribeButton).toBeTruthy();
    expect(subscribeButton.props.disabled).toBeTruthy();
    
    // Check that current subscription section is not rendered
    expect(queryByText('Current Subscription')).toBeNull();
  });

  it('enables subscribe button when a plan is selected', async () => {
    // Mock API response for subscription status
    (axios.get as jest.Mock).mockResolvedValueOnce({
      data: {
        count: 0,
        data: [],
      },
    });

    const { getByText } = render(<SubscriptionScreen />);

    // Wait for the component to load subscription data
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith('http://localhost:8000/api/v1/stripe/subscriptions');
    });

    // Select a plan
    fireEvent.press(getByText('Basic Plan'));

    // Check that the subscribe button is enabled
    const subscribeButton = getByText('Subscribe Now');
    expect(subscribeButton.props.disabled).toBeFalsy();
  });

  it('creates a checkout session when subscribe button is pressed', async () => {
    // Mock API responses
    (axios.get as jest.Mock).mockResolvedValueOnce({
      data: {
        count: 0,
        data: [],
      },
    });
    
    (axios.post as jest.Mock).mockImplementation((url) => {
      if (url === 'http://localhost:8000/api/v1/stripe/create-customer') {
        return Promise.resolve({ data: { message: 'Customer created successfully' } });
      } else if (url === 'http://localhost:8000/api/v1/stripe/create-checkout-session') {
        return Promise.resolve({ data: { url: 'https://checkout.stripe.com/test' } });
      }
      return Promise.reject(new Error('Unexpected URL'));
    });

    const { getByText } = render(<SubscriptionScreen />);

    // Wait for the component to load subscription data
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith('http://localhost:8000/api/v1/stripe/subscriptions');
    });

    // Select a plan
    fireEvent.press(getByText('Basic Plan'));

    // Press the subscribe button
    fireEvent.press(getByText('Subscribe Now'));

    // Wait for API calls to complete
    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith('http://localhost:8000/api/v1/stripe/create-customer');
      expect(axios.post).toHaveBeenCalledWith('http://localhost:8000/api/v1/stripe/create-checkout-session', {
        price_id: 'price_basic',
        success_url: 'http://localhost:8000/subscription-success',
        cancel_url: 'http://localhost:8000/subscription-cancel',
      });
      expect(mockRouter.push).toHaveBeenCalledWith({
        pathname: '/web-view',
        params: { url: 'https://checkout.stripe.com/test' },
      });
    });
  });

  it('renders current subscription when user has an active subscription', async () => {
    // Mock API response for subscription status
    const mockSubscription = {
      id: '123',
      status: 'active',
      current_period_start: Math.floor(Date.now() / 1000) - 86400, // yesterday
      current_period_end: Math.floor(Date.now() / 1000) + 2592000, // 30 days from now
      cancel_at_period_end: false,
      stripe_subscription_id: 'sub_123',
      user_id: 'user_123',
      price_id: 'price_123',
      price: {
        id: 'price_123',
        unit_amount: 3000,
        currency: 'usd',
        recurring_interval: 'month',
        stripe_price_id: 'price_basic',
        active: true,
        product_id: 'prod_123',
        product: {
          id: 'prod_123',
          name: 'Basic Plan',
          description: 'Access to basic features',
          active: true,
          stripe_product_id: 'prod_basic',
        },
      },
    };
    
    (axios.get as jest.Mock).mockResolvedValueOnce({
      data: {
        count: 1,
        data: [mockSubscription],
      },
    });

    const { getByText, queryByText } = render(<SubscriptionScreen />);

    // Wait for the component to load subscription data
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith('http://localhost:8000/api/v1/stripe/subscriptions');
    });

    // Check that current subscription section is rendered
    expect(getByText('Current Subscription')).toBeTruthy();
    expect(getByText('Status: active')).toBeTruthy();
    expect(getByText('Manage Subscription')).toBeTruthy();
    expect(getByText('Cancel Subscription')).toBeTruthy();
    
    // Check that subscription plans are not rendered
    expect(queryByText('Choose a subscription plan')).toBeNull();
  });

  it('opens customer portal when manage subscription is pressed', async () => {
    // Mock API responses
    const mockSubscription = {
      id: '123',
      status: 'active',
      current_period_start: Math.floor(Date.now() / 1000) - 86400,
      current_period_end: Math.floor(Date.now() / 1000) + 2592000,
      cancel_at_period_end: false,
      stripe_subscription_id: 'sub_123',
      user_id: 'user_123',
      price_id: 'price_123',
      price: {
        id: 'price_123',
        unit_amount: 3000,
        currency: 'usd',
        recurring_interval: 'month',
        stripe_price_id: 'price_basic',
        active: true,
        product_id: 'prod_123',
        product: {
          id: 'prod_123',
          name: 'Basic Plan',
          description: 'Access to basic features',
          active: true,
          stripe_product_id: 'prod_basic',
        },
      },
    };
    
    (axios.get as jest.Mock).mockResolvedValueOnce({
      data: {
        count: 1,
        data: [mockSubscription],
      },
    });
    
    (axios.post as jest.Mock).mockResolvedValueOnce({
      data: { url: 'https://billing.stripe.com/test' },
    });

    const { getByText } = render(<SubscriptionScreen />);

    // Wait for the component to load subscription data
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith('http://localhost:8000/api/v1/stripe/subscriptions');
    });

    // Press the manage subscription button
    fireEvent.press(getByText('Manage Subscription'));

    // Wait for API call to complete
    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith('http://localhost:8000/api/v1/stripe/create-customer-portal-session', {
        return_url: 'http://localhost:8000/subscription',
      });
      expect(mockRouter.push).toHaveBeenCalledWith({
        pathname: '/web-view',
        params: { url: 'https://billing.stripe.com/test' },
      });
    });
  });

  it('shows confirmation dialog when cancel subscription is pressed', async () => {
    // Mock API responses
    const mockSubscription = {
      id: '123',
      status: 'active',
      current_period_start: Math.floor(Date.now() / 1000) - 86400,
      current_period_end: Math.floor(Date.now() / 1000) + 2592000,
      cancel_at_period_end: false,
      stripe_subscription_id: 'sub_123',
      user_id: 'user_123',
      price_id: 'price_123',
      price: {
        id: 'price_123',
        unit_amount: 3000,
        currency: 'usd',
        recurring_interval: 'month',
        stripe_price_id: 'price_basic',
        active: true,
        product_id: 'prod_123',
        product: {
          id: 'prod_123',
          name: 'Basic Plan',
          description: 'Access to basic features',
          active: true,
          stripe_product_id: 'prod_basic',
        },
      },
    };
    
    (axios.get as jest.Mock).mockResolvedValueOnce({
      data: {
        count: 1,
        data: [mockSubscription],
      },
    });
    
    // Mock Alert.alert
    const mockAlert = jest.spyOn(require('react-native'), 'Alert', 'get');
    const mockAlertFn = jest.fn();
    mockAlert.mockImplementation(() => ({
      alert: mockAlertFn,
    }));

    const { getByText } = render(<SubscriptionScreen />);

    // Wait for the component to load subscription data
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith('http://localhost:8000/api/v1/stripe/subscriptions');
    });

    // Press the cancel subscription button
    fireEvent.press(getByText('Cancel Subscription'));

    // Check that confirmation dialog is shown
    expect(mockAlertFn).toHaveBeenCalledWith(
      'Cancel Subscription',
      'Are you sure you want to cancel your subscription? You will still have access until the end of your billing period.',
      expect.arrayContaining([
        expect.objectContaining({ text: 'No', style: 'cancel' }),
        expect.objectContaining({ text: 'Yes', style: 'destructive' }),
      ])
    );
  });
});
