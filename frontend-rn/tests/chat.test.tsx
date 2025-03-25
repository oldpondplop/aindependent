import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import ChatScreen from '@/app/(app)/chat';

// Mock dependencies
jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
  Redirect: jest.fn().mockImplementation(({ href }) => <div>Redirecting to {href}</div>),
}));

jest.mock('@/hooks/useAuth', () => ({
  useAuth: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();
global.localStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
};

describe('ChatScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock useAuth hook
    useAuth.mockReturnValue({
      isAuthenticated: true,
      user: { id: 'test-user-id' },
    });
    
    // Mock router
    const mockRouter = { push: jest.fn() };
    useRouter.mockReturnValue(mockRouter);
    
    // Mock localStorage
    localStorage.getItem.mockReturnValue('test-token');
    
    // Mock fetch for request count
    global.fetch.mockImplementation((url) => {
      if (url.includes('/chat/request-count')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ count: 3, max: 6, has_subscription: false, remaining: 3 }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    });
  });
  
  it('renders initial welcome message', async () => {
    let component;
    await act(async () => {
      component = render(<ChatScreen />);
    });
    
    const { getByText } = component;
    expect(getByText("Hello! I'm your friendly AI assistant. How can I help you today?")).toBeTruthy();
  });
  
  it('shows request counter with correct count', async () => {
    let component;
    await act(async () => {
      component = render(<ChatScreen />);
    });
    
    const { getByText } = component;
    expect(getByText('3 remaining')).toBeTruthy();
  });
  
  it('sends message and displays response', async () => {
    // Mock fetch for chat completion
    global.fetch.mockImplementation((url, options) => {
      if (url.includes('/chat/completions')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            message: {
              role: 'assistant',
              content: 'This is a test response',
            },
          }),
        });
      } else if (url.includes('/chat/request-count')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ count: 4, max: 6, has_subscription: false, remaining: 2 }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    });
    
    let component;
    await act(async () => {
      component = render(<ChatScreen />);
    });
    
    const { getByText, getByPlaceholderText } = component;
    
    // Type a message
    const input = getByPlaceholderText('Type a message...');
    await act(async () => {
      fireEvent.changeText(input, 'Hello, this is a test');
    });
    
    // Send the message
    const sendButton = getByText('').closest('TouchableOpacity');
    await act(async () => {
      fireEvent.press(sendButton);
    });
    
    // Check that user message is displayed
    expect(getByText('Hello, this is a test')).toBeTruthy();
    
    // Wait for response
    await waitFor(() => {
      expect(getByText('This is a test response')).toBeTruthy();
    });
    
    // Check that request count was updated
    expect(getByText('2 remaining')).toBeTruthy();
  });
  
  it('shows subscription prompt when limit is reached', async () => {
    // Mock fetch for request count with limit reached
    global.fetch.mockImplementation((url) => {
      if (url.includes('/chat/request-count')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ count: 6, max: 6, has_subscription: false, remaining: 0 }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    });
    
    let component;
    await act(async () => {
      component = render(<ChatScreen />);
    });
    
    const { getByText } = component;
    
    // Check that subscription prompt is shown
    expect(getByText("You've reached the limit!")).toBeTruthy();
    expect(getByText("You've used all 6 of your free requests. Subscribe to continue chatting with our AI assistant.")).toBeTruthy();
    
    // Check that subscribe button is present
    const subscribeButton = getByText('Subscribe Now');
    expect(subscribeButton).toBeTruthy();
    
    // Press subscribe button
    await act(async () => {
      fireEvent.press(subscribeButton);
    });
    
    // Check that router was called with subscription route
    const mockRouter = useRouter();
    expect(mockRouter.push).toHaveBeenCalledWith('/subscription');
  });
  
  it('handles API errors gracefully', async () => {
    // Mock fetch for chat completion with error
    global.fetch.mockImplementation((url, options) => {
      if (url.includes('/chat/completions')) {
        return Promise.resolve({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
        });
      } else if (url.includes('/chat/request-count')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ count: 3, max: 6, has_subscription: false, remaining: 3 }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    });
    
    let component;
    await act(async () => {
      component = render(<ChatScreen />);
    });
    
    const { getByText, getByPlaceholderText } = component;
    
    // Type a message
    const input = getByPlaceholderText('Type a message...');
    await act(async () => {
      fireEvent.changeText(input, 'This will cause an error');
    });
    
    // Send the message
    const sendButton = getByText('').closest('TouchableOpacity');
    await act(async () => {
      fireEvent.press(sendButton);
    });
    
    // Check that error message is displayed
    await waitFor(() => {
      expect(getByText("I'm sorry, I couldn't process your request. Please try again.")).toBeTruthy();
    });
  });
  
  it('redirects to sign-in when not authenticated', async () => {
    // Mock useAuth to return not authenticated
    useAuth.mockReturnValue({
      isAuthenticated: false,
      user: null,
    });
    
    let component;
    await act(async () => {
      component = render(<ChatScreen />);
    });
    
    const { getByText } = component;
    expect(getByText('Redirecting to /(auth)/sign-in')).toBeTruthy();
  });
});
