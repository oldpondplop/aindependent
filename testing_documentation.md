# Stripe Subscription Integration Testing Documentation

This document outlines the testing approach for the Stripe subscription integration in the aindependent project, covering both backend and frontend components.

## 1. Testing Approach

The testing strategy follows a comprehensive approach that includes:

- **Unit Testing**: Testing individual components and functions in isolation
- **Integration Testing**: Testing the interaction between components
- **Mock Testing**: Using mocks to simulate external dependencies (Stripe API)
- **API Testing**: Testing the REST API endpoints
- **UI Testing**: Testing the user interface components and interactions

## 2. Backend Testing

### 2.1 Test Setup

The backend tests use:
- SQLite in-memory database for test isolation
- Pytest as the testing framework
- Mock objects to simulate Stripe API responses
- Dependency overrides to inject test dependencies

### 2.2 Test Coverage

The backend tests cover the following areas:

1. **API Endpoints**:
   - GET `/api/v1/stripe/products` - Test retrieving products
   - GET `/api/v1/stripe/prices` - Test retrieving prices
   - GET `/api/v1/stripe/subscriptions` - Test retrieving user subscriptions
   - POST `/api/v1/stripe/create-customer` - Test creating a Stripe customer
   - POST `/api/v1/stripe/create-checkout-session` - Test creating a checkout session
   - POST `/api/v1/stripe/create-customer-portal-session` - Test creating a customer portal session
   - POST `/api/v1/stripe/cancel-subscription/{subscription_id}` - Test canceling a subscription
   - POST `/api/v1/stripe/webhook` - Test webhook handling

2. **Error Handling**:
   - Test handling of non-existent resources
   - Test validation of request data
   - Test error responses from Stripe API

3. **Database Operations**:
   - Test creation and updating of database records
   - Test relationships between models

### 2.3 Running Backend Tests

To run the backend tests:

```bash
cd backend
pytest app/tests/api/test_stripe.py -v
```

## 3. Frontend Testing

### 3.1 Test Setup

The frontend tests use:
- React Testing Library for rendering and interacting with components
- Jest as the testing framework
- Mock objects to simulate API responses
- Mock functions to simulate user interactions

### 3.2 Test Coverage

The frontend tests cover the following areas:

1. **Component Rendering**:
   - Test rendering of subscription plans when user has no active subscription
   - Test rendering of current subscription details when user has an active subscription

2. **User Interactions**:
   - Test selecting a subscription plan
   - Test subscribing to a plan
   - Test managing a subscription
   - Test canceling a subscription

3. **API Integration**:
   - Test API calls to backend endpoints
   - Test handling of API responses
   - Test error handling

4. **Navigation**:
   - Test navigation to checkout page
   - Test navigation to customer portal
   - Test navigation after successful/canceled subscription

### 3.3 Running Frontend Tests

To run the frontend tests:

```bash
cd frontend-rn
npm test -- tests/subscription.test.tsx
```

## 4. Test Mocking Strategy

### 4.1 Stripe API Mocking

Since the Stripe API is an external dependency, we use mocking to simulate its behavior:

1. **Backend Mocking**:
   - Mock `stripe.Customer.create` for customer creation
   - Mock `stripe.checkout.Session.create` for checkout session creation
   - Mock `stripe.billing_portal.Session.create` for customer portal session creation
   - Mock `stripe.Subscription.modify` for subscription modification
   - Mock `stripe.Webhook.construct_event` for webhook event handling

2. **Frontend Mocking**:
   - Mock Axios requests to backend API endpoints
   - Mock navigation functions from Expo Router

### 4.2 Benefits of Mocking

- Tests run faster without external API calls
- Tests are more reliable and deterministic
- Tests can simulate various scenarios including error cases
- No need for actual Stripe credentials during testing

## 5. Test Data Management

### 5.1 Backend Test Data

- Test data is created in a fixture using an in-memory SQLite database
- Each test has access to predefined products, prices, and subscriptions
- Test data is cleaned up after each test to ensure isolation

### 5.2 Frontend Test Data

- Mock data is defined inline within each test
- Different data scenarios are used to test different component states

## 6. Continuous Integration Considerations

For CI/CD pipelines, consider the following:

1. **Environment Variables**:
   - Use placeholder values for Stripe API keys in CI environments

2. **Test Isolation**:
   - Ensure tests run in isolation to prevent interference

3. **Test Coverage Reports**:
   - Configure test runners to generate coverage reports

## 7. Future Test Enhancements

Potential areas for expanding test coverage:

1. **End-to-End Testing**:
   - Add E2E tests using tools like Cypress or Detox

2. **Performance Testing**:
   - Add tests to measure performance of subscription-related operations

3. **Security Testing**:
   - Add tests to verify secure handling of payment information

4. **Webhook Testing**:
   - Expand tests for different webhook event types

5. **Edge Cases**:
   - Add tests for subscription upgrades/downgrades
   - Add tests for subscription renewals
   - Add tests for payment failures
