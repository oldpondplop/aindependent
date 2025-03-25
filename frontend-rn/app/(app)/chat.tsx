import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter, Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { OpenAPI } from '@/src/client';

// Message type definition
interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
}

// User avatar component
const UserAvatar = () => (
  <View style={styles.userAvatar}>
    <Ionicons name="person" size={20} color="#FFFFFF" />
  </View>
);

// Assistant avatar component
const AssistantAvatar = () => (
  <View style={styles.assistantAvatar}>
    <Ionicons name="chatbubble" size={20} color="#FFFFFF" />
  </View>
);

// Chat message component
const ChatMessage = ({ content, isUser, timestamp }: { content: string; isUser: boolean; timestamp: Date }) => {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <View style={[styles.messageContainer, isUser ? styles.userMessageContainer : styles.assistantMessageContainer]}>
      {!isUser && <AssistantAvatar />}
      <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.assistantBubble]}>
        <Text style={[styles.messageText, isUser ? styles.userMessageText : styles.assistantMessageText]}>
          {content}
        </Text>
        <Text style={styles.timestamp}>{formatTime(timestamp)}</Text>
      </View>
      {isUser && <UserAvatar />}
    </View>
  );
};

// Chat input component
const ChatInput = ({ onSendMessage, disabled = false }: { onSendMessage: (message: string) => void; disabled?: boolean }) => {
  const [message, setMessage] = useState('');
  
  const handleSend = () => {
    if (message.trim()) {
      onSendMessage(message.trim());
      setMessage('');
    }
  };
  
  return (
    <View style={styles.inputContainer}>
      <TextInput
        style={styles.input}
        value={message}
        onChangeText={setMessage}
        placeholder="Type a message..."
        placeholderTextColor="#A0AEC0"
        multiline
        maxLength={1000}
        editable={!disabled}
      />
      <TouchableOpacity 
        style={[styles.sendButton, (!message.trim() || disabled) && styles.disabledButton]} 
        onPress={handleSend}
        disabled={!message.trim() || disabled}
      >
        <Ionicons name="send" size={20} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
};

// Request counter component
const RequestCounter = ({ usedRequests, maxFreeRequests }: { usedRequests: number; maxFreeRequests: number }) => {
  const remainingRequests = maxFreeRequests - usedRequests;
  
  return (
    <View style={styles.counterContainer}>
      <Text style={styles.counterLabel}>Free Requests:</Text>
      <View style={styles.dotsContainer}>
        {Array.from({ length: maxFreeRequests }).map((_, index) => (
          <View 
            key={index} 
            style={[
              styles.dot, 
              index < usedRequests ? styles.usedDot : styles.availableDot
            ]} 
          />
        ))}
      </View>
      <Text style={[
        styles.remainingText,
        remainingRequests <= 2 ? styles.warningText : null
      ]}>
        {remainingRequests} remaining
      </Text>
    </View>
  );
};

// Subscription prompt component
const SubscriptionPrompt = ({ onSubscribe }: { onSubscribe: () => void }) => {
  return (
    <View style={styles.subscriptionContainer}>
      <View style={styles.iconContainer}>
        <Ionicons name="star" size={32} color="#FFCC00" />
      </View>
      <Text style={styles.subscriptionTitle}>You've reached the limit!</Text>
      <Text style={styles.subscriptionDescription}>
        You've used all 6 of your free requests. Subscribe to continue chatting with our AI assistant.
      </Text>
      <TouchableOpacity style={styles.subscribeButton} onPress={onSubscribe}>
        <Text style={styles.buttonText}>Subscribe Now</Text>
      </TouchableOpacity>
      <Text style={styles.benefitsTitle}>Subscription Benefits:</Text>
      <View style={styles.benefitRow}>
        <Ionicons name="checkmark-circle" size={16} color="#4CD964" />
        <Text style={styles.benefitText}>Unlimited AI chat messages</Text>
      </View>
      <View style={styles.benefitRow}>
        <Ionicons name="checkmark-circle" size={16} color="#4CD964" />
        <Text style={styles.benefitText}>Priority response time</Text>
      </View>
      <View style={styles.benefitRow}>
        <Ionicons name="checkmark-circle" size={16} color="#4CD964" />
        <Text style={styles.benefitText}>Access to advanced features</Text>
      </View>
    </View>
  );
};

// Main chat screen
export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: "Hello! I'm your friendly AI assistant. How can I help you today?",
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [requestCount, setRequestCount] = useState({
    used: 0,
    max: 6,
  });
  const [showSubscription, setShowSubscription] = useState(false);
  const { isAuthenticated, user } = useAuth();
  const scrollViewRef = useRef<ScrollView>(null);
  const router = useRouter();
  
  useEffect(() => {
    // Fetch user's request count
    if (isAuthenticated && user) {
      fetchRequestCount();
    }
  }, [isAuthenticated, user]);
  
  const fetchRequestCount = async () => {
    try {
      const response = await fetch(`${OpenAPI.BASE}/api/v1/chat/request-count`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch request count');
      }
      
      const data = await response.json();
      setRequestCount({
        used: data.count,
        max: 6,
      });
      
      if (data.count >= 6 && !data.has_subscription) {
        setShowSubscription(true);
      }
    } catch (error) {
      console.error('Error fetching request count:', error);
    }
  };
  
  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return;
    
    // Add user message to chat
    const userMessage: Message = {
      id: Date.now().toString(),
      content,
      isUser: true,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    
    // Scroll to bottom
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 50);
    
    try {
      const response = await fetch(`${OpenAPI.BASE}/api/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          messages: messages.map(m => ({
            role: m.isUser ? 'user' : 'assistant',
            content: m.content,
          })).concat([{ role: 'user', content }]),
        }),
      });
      
      if (response.status === 403) {
        // User has reached free request limit
        setShowSubscription(true);
        setIsLoading(false);
        await fetchRequestCount();
        return;
      }
      
      if (!response.ok) {
        throw new Error('Failed to get response');
      }
      
      const data = await response.json();
      
      // Add assistant message to chat
      const assistantMessage: Message = {
        id: Date.now().toString(),
        content: data.message.content,
        isUser: false,
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      await fetchRequestCount();
    } catch (error) {
      console.error('Error sending message:', error);
      // Add error message
      const errorMessage: Message = {
        id: Date.now().toString(),
        content: "I'm sorry, I couldn't process your request. Please try again.",
        isUser: false,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      // Scroll to bottom
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 50);
    }
  };
  
  const handleSubscribe = () => {
    // Navigate to subscription screen
    router.push('/subscription');
  };
  
  if (!isAuthenticated) {
    return <Redirect href="/(auth)/sign-in" />;
  }
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Chat Assistant</Text>
        <RequestCounter usedRequests={requestCount.used} maxFreeRequests={requestCount.max} />
      </View>
      
      {showSubscription ? (
        <SubscriptionPrompt onSubscribe={handleSubscribe} />
      ) : (
        <>
          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesContainer}
            contentContainerStyle={styles.messagesContent}
          >
            {messages.map(message => (
              <ChatMessage
                key={message.id}
                content={message.content}
                isUser={message.isUser}
                timestamp={message.timestamp}
              />
            ))}
            {isLoading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color="#5E72EB" size="small" />
                <Text style={styles.loadingText}>Thinking...</Text>
              </View>
            )}
          </ScrollView>
          
          <ChatInput
            onSendMessage={handleSendMessage}
            disabled={isLoading || showSubscription}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2D3748',
    textAlign: 'center',
    marginBottom: 8,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    paddingVertical: 16,
  },
  messageContainer: {
    flexDirection: 'row',
    marginVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'flex-end',
  },
  userMessageContainer: {
    justifyContent: 'flex-end',
  },
  assistantMessageContainer: {
    justifyContent: 'flex-start',
  },
  userAvatar: {
    width: 32,
    height: 32,
    backgroundColor: '#5E72EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  assistantAvatar: {
    width: 32,
    height: 32,
    backgroundColor: '#43DDE6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  messageBubble: {
    maxWidth: '70%',
    padding: 12,
  },
  userBubble: {
    backgroundColor: '#5E72EB',
  },
  assistantBubble: {
    backgroundColor: '#F8F9FC',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userMessageText: {
    color: '#FFFFFF',
  },
  assistantMessageText: {
    color: '#2D3748',
  },
  timestamp: {
    fontSize: 12,
    color: '#A0AEC0',
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    backgroundColor: '#F8F9FC',
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 16,
    color: '#2D3748',
  },
  sendButton: {
    width: 40,
    height: 40,
    backgroundColor: '#5E72EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  disabledButton: {
    backgroundColor: '#CBD5E0',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#4A5568',
  },
  counterContainer: {
    padding: 12,
    backgroundColor: '#F8F9FC',
    marginHorizontal: 16,
    marginVertical: 8,
  },
  counterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A5568',
    marginBottom: 8,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  dot: {
    width: 12,
    height: 12,
    marginHorizontal: 2,
  },
  usedDot: {
    backgroundColor: '#CBD5E0',
  },
  availableDot: {
    backgroundColor: '#5E72EB',
  },
  remainingText: {
    fontSize: 12,
    color: '#4A5568',
    textAlign: 'right',
  },
  warningText: {
    color: '#FFCC00',
    fontWeight: '600',
  },
  subscriptionContainer: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    margin: 16,
    alignItems: 'center',
  },
  iconContainer: {
    width: 64,
    height: 64,
    backgroundColor: '#FFF9E6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  subscriptionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2D3748',
    marginBottom: 8,
  },
  subscriptionDescription: {
    fontSize: 16,
    color: '#4A5568',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  subscribeButton: {
    backgroundColor: '#5E72EB',
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  benefitsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3748',
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  benefitText: {
    fontSize: 14,
    color: '#4A5568',
    marginLeft: 8,
  },
});
