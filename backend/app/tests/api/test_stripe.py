import json
from unittest.mock import patch, MagicMock
import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine
from sqlmodel.pool import StaticPool

from app.main import app
from app.api.deps import get_session, get_current_active_user
from app.models import (
    User, 
    StripeProduct, 
    StripePrice, 
    StripeSubscription,
    StripeProductPublic,
    StripePricePublic
)
import uuid

# Create a test database
TEST_SQLALCHEMY_DATABASE_URL = "sqlite://"
engine = create_engine(
    TEST_SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

# Create the tables
SQLModel.metadata.create_all(engine)

# Override the get_session dependency
def get_test_session():
    with Session(engine) as session:
        yield session

# Mock current user for testing
test_user_id = uuid.uuid4()
test_user = User(
    id=test_user_id,
    email="test@example.com",
    full_name="Test User",
    is_active=True,
    stripe_customer_id="cus_test123"
)

def get_test_current_user():
    return test_user

app.dependency_overrides[get_session] = get_test_session
app.dependency_overrides[get_current_active_user] = get_test_current_user

client = TestClient(app)

@pytest.fixture
def db_session():
    with Session(engine) as session:
        # Create test data
        product = StripeProduct(
            id=uuid.uuid4(),
            name="Test Product",
            description="Test Description",
            active=True,
            stripe_product_id="prod_test123"
        )
        session.add(product)
        session.commit()
        
        price = StripePrice(
            id=uuid.uuid4(),
            unit_amount=3000,
            currency="usd",
            recurring_interval="month",
            stripe_price_id="price_test123",
            active=True,
            product_id=product.id
        )
        session.add(price)
        session.commit()
        
        subscription = StripeSubscription(
            id=uuid.uuid4(),
            status="active",
            current_period_start=1609459200,  # 2021-01-01
            current_period_end=1612137600,    # 2021-02-01
            cancel_at_period_end=False,
            stripe_subscription_id="sub_test123",
            user_id=test_user_id,
            price_id=price.id
        )
        session.add(subscription)
        session.commit()
        
        yield session
        
        # Clean up
        session.delete(subscription)
        session.delete(price)
        session.delete(product)
        session.commit()

@patch('stripe.Customer.create')
def test_create_customer(mock_stripe_customer, db_session):
    # Mock the Stripe API response
    mock_stripe_customer.return_value = MagicMock(id="cus_new123")
    
    # Update test user to not have a Stripe customer ID
    with db_session as session:
        user = session.get(User, test_user_id)
        user.stripe_customer_id = None
        session.add(user)
        session.commit()
    
    # Test the endpoint
    response = client.post("/api/v1/stripe/create-customer")
    assert response.status_code == 200
    assert response.json() == {"message": "Customer created successfully"}
    
    # Verify the user was updated
    with db_session as session:
        user = session.get(User, test_user_id)
        assert user.stripe_customer_id == "cus_new123"
        
        # Reset for other tests
        user.stripe_customer_id = "cus_test123"
        session.add(user)
        session.commit()

def test_get_products(db_session):
    response = client.get("/api/v1/stripe/products")
    assert response.status_code == 200
    products = response.json()
    assert len(products) == 1
    assert products[0]["name"] == "Test Product"
    assert products[0]["description"] == "Test Description"
    assert products[0]["stripe_product_id"] == "prod_test123"

def test_get_prices(db_session):
    response = client.get("/api/v1/stripe/prices")
    assert response.status_code == 200
    prices = response.json()
    assert len(prices) == 1
    assert prices[0]["unit_amount"] == 3000
    assert prices[0]["currency"] == "usd"
    assert prices[0]["stripe_price_id"] == "price_test123"

def test_get_subscriptions(db_session):
    response = client.get("/api/v1/stripe/subscriptions")
    assert response.status_code == 200
    data = response.json()
    assert data["count"] == 1
    assert data["data"][0]["status"] == "active"
    assert data["data"][0]["stripe_subscription_id"] == "sub_test123"

@patch('stripe.checkout.Session.create')
def test_create_checkout_session(mock_stripe_checkout, db_session):
    # Mock the Stripe API response
    mock_stripe_checkout.return_value = MagicMock(url="https://checkout.stripe.com/test")
    
    # Test the endpoint
    response = client.post(
        "/api/v1/stripe/create-checkout-session",
        json={
            "price_id": "price_test123",
            "success_url": "https://example.com/success",
            "cancel_url": "https://example.com/cancel"
        }
    )
    assert response.status_code == 200
    assert response.json() == {"url": "https://checkout.stripe.com/test"}

@patch('stripe.billing_portal.Session.create')
def test_create_customer_portal_session(mock_stripe_portal, db_session):
    # Mock the Stripe API response
    mock_stripe_portal.return_value = MagicMock(url="https://billing.stripe.com/test")
    
    # Test the endpoint
    response = client.post(
        "/api/v1/stripe/create-customer-portal-session",
        json={"return_url": "https://example.com/return"}
    )
    assert response.status_code == 200
    assert response.json() == {"url": "https://billing.stripe.com/test"}

@patch('stripe.Subscription.modify')
def test_cancel_subscription(mock_stripe_subscription, db_session):
    # Mock the Stripe API response
    mock_stripe_subscription.return_value = MagicMock()
    
    # Test the endpoint
    response = client.post("/api/v1/stripe/cancel-subscription/sub_test123")
    assert response.status_code == 200
    assert response.json() == {"message": "Subscription will be canceled at the end of the billing period"}
    
    # Verify the subscription was updated
    with db_session as session:
        subscription = session.query(StripeSubscription).filter(
            StripeSubscription.stripe_subscription_id == "sub_test123"
        ).first()
        assert subscription.cancel_at_period_end == True

def test_cancel_subscription_not_found(db_session):
    response = client.post("/api/v1/stripe/cancel-subscription/sub_nonexistent")
    assert response.status_code == 404
    assert response.json() == {"detail": "Subscription not found"}

@patch('stripe.Webhook.construct_event')
def test_stripe_webhook_checkout_completed(mock_construct_event, db_session):
    # Mock the Stripe webhook event
    event_data = {
        "type": "checkout.session.completed",
        "data": {
            "object": {
                "customer": "cus_test123",
                "subscription": "sub_new123"
            }
        }
    }
    mock_construct_event.return_value = event_data
    
    # Mock Stripe API calls
    with patch('stripe.Subscription.retrieve') as mock_sub_retrieve, \
         patch('stripe.Price.retrieve') as mock_price_retrieve, \
         patch('stripe.Product.retrieve') as mock_product_retrieve:
        
        mock_sub_retrieve.return_value = {
            "id": "sub_new123",
            "status": "active",
            "current_period_start": 1609459200,
            "current_period_end": 1612137600,
            "cancel_at_period_end": False,
            "items": {
                "data": [
                    {"price": {"id": "price_new123"}}
                ]
            }
        }
        
        mock_price_retrieve.return_value = {
            "id": "price_new123",
            "unit_amount": 5000,
            "currency": "usd",
            "recurring": {"interval": "month"},
            "active": True,
            "product": "prod_new123"
        }
        
        mock_product_retrieve.return_value = {
            "id": "prod_new123",
            "name": "New Product",
            "description": "New Description",
            "active": True
        }
        
        # Test the webhook endpoint
        response = client.post(
            "/api/v1/stripe/webhook",
            headers={"stripe-signature": "test_signature"},
            content=json.dumps(event_data).encode()
        )
        assert response.status_code == 200
        assert response.json() == {"status": "success"}
        
        # Verify a new subscription was created
        with db_session as session:
            new_subscription = session.query(StripeSubscription).filter(
                StripeSubscription.stripe_subscription_id == "sub_new123"
            ).first()
            assert new_subscription is not None
            assert new_subscription.status == "active"
