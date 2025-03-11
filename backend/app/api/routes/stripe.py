import stripe
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlmodel import Session, select

from app import crud
from app.api.deps import CurrentUser, SessionDep, get_current_active_user
from app.core.config import settings
from app.models import (
    CreateCheckoutSessionRequest,
    CreateCustomerPortalSessionRequest,
    Message,
    StripePrice,
    StripePricePublic,
    StripeProduct,
    StripeProductPublic,
    StripeSessionResponse,
    StripeSubscription,
    StripeSubscriptionPublic,
    StripeSubscriptionsPublic,
    User,
)

# Configure Stripe API key
stripe.api_key = settings.STRIPE_API_KEY

router = APIRouter(prefix="/stripe", tags=["stripe"])


@router.get("/products", response_model=list[StripeProductPublic])
def get_products(session: SessionDep):
    """
    Get all active products.
    """
    products = session.exec(
        select(StripeProduct).where(StripeProduct.active == True)
    ).all()
    return products


@router.get("/prices", response_model=list[StripePricePublic])
def get_prices(session: SessionDep):
    """
    Get all active prices.
    """
    prices = session.exec(
        select(StripePrice).where(StripePrice.active == True)
    ).all()
    return prices


@router.post("/create-customer", response_model=Message)
def create_customer(current_user: CurrentUser, session: SessionDep):
    """
    Create a Stripe customer for the current user.
    """
    if current_user.stripe_customer_id:
        return {"message": "Customer already exists"}

    # Create customer in Stripe
    customer = stripe.Customer.create(
        email=current_user.email,
        name=current_user.full_name,
        metadata={"user_id": str(current_user.id)},
    )

    # Update user with Stripe customer ID
    current_user.stripe_customer_id = customer.id
    session.add(current_user)
    session.commit()
    session.refresh(current_user)

    return {"message": "Customer created successfully"}


@router.post("/create-checkout-session", response_model=StripeSessionResponse)
def create_checkout_session(
    request: CreateCheckoutSessionRequest, current_user: CurrentUser, session: SessionDep
):
    """
    Create a Stripe Checkout Session for subscription.
    """
    # Ensure user has a Stripe customer ID
    if not current_user.stripe_customer_id:
        # Create customer in Stripe
        customer = stripe.Customer.create(
            email=current_user.email,
            name=current_user.full_name,
            metadata={"user_id": str(current_user.id)},
        )
        current_user.stripe_customer_id = customer.id
        session.add(current_user)
        session.commit()
        session.refresh(current_user)
    
    # Create checkout session
    checkout_session = stripe.checkout.Session.create(
        customer=current_user.stripe_customer_id,
        payment_method_types=["card"],
        line_items=[
            {
                "price": request.price_id,
                "quantity": 1,
            }
        ],
        mode="subscription",
        success_url=request.success_url,
        cancel_url=request.cancel_url,
    )
    
    return {"url": checkout_session.url}


@router.post("/create-customer-portal-session", response_model=StripeSessionResponse)
def create_customer_portal_session(
    request: CreateCustomerPortalSessionRequest, current_user: CurrentUser
):
    """
    Create a Stripe Customer Portal Session.
    """
    if not current_user.stripe_customer_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User does not have a Stripe customer ID",
        )
    
    # Create customer portal session
    portal_session = stripe.billing_portal.Session.create(
        customer=current_user.stripe_customer_id,
        return_url=request.return_url,
    )
    
    return {"url": portal_session.url}


@router.get("/subscriptions", response_model=StripeSubscriptionsPublic)
def get_subscriptions(current_user: CurrentUser, session: SessionDep):
    """
    Get all subscriptions for the current user.
    """
    subscriptions = session.exec(
        select(StripeSubscription).where(StripeSubscription.user_id == current_user.id)
    ).all()
    
    return {"data": subscriptions, "count": len(subscriptions)}


@router.post("/cancel-subscription/{subscription_id}", response_model=Message)
def cancel_subscription(subscription_id: str, current_user: CurrentUser, session: SessionDep):
    """
    Cancel a subscription.
    """
    # Find subscription in database
    db_subscription = session.exec(
        select(StripeSubscription).where(
            StripeSubscription.stripe_subscription_id == subscription_id,
            StripeSubscription.user_id == current_user.id,
        )
    ).first()
    
    if not db_subscription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription not found",
        )
    
    # Cancel subscription in Stripe
    stripe.Subscription.modify(
        subscription_id,
        cancel_at_period_end=True,
    )
    
    # Update subscription in database
    db_subscription.cancel_at_period_end = True
    session.add(db_subscription)
    session.commit()
    
    return {"message": "Subscription will be canceled at the end of the billing period"}


@router.post("/webhook", status_code=status.HTTP_200_OK)
async def stripe_webhook(request: Request, session: SessionDep):
    """
    Handle Stripe webhook events.
    """
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except ValueError as e:
        # Invalid payload
        raise HTTPException(status_code=400, detail=str(e))
    except stripe.error.SignatureVerificationError as e:
        # Invalid signature
        raise HTTPException(status_code=400, detail=str(e))
    
    # Handle the event
    if event["type"] == "checkout.session.completed":
        session_obj = event["data"]["object"]
        
        # Get customer and subscription IDs
        customer_id = session_obj["customer"]
        subscription_id = session_obj["subscription"]
        
        # Find user by Stripe customer ID
        user = session.exec(
            select(User).where(User.stripe_customer_id == customer_id)
        ).first()
        
        if not user:
            return {"status": "error", "message": "User not found"}
        
        # Get subscription details from Stripe
        subscription = stripe.Subscription.retrieve(subscription_id)
        price_id = subscription["items"]["data"][0]["price"]["id"]
        
        # Find or create price in database
        db_price = session.exec(
            select(StripePrice).where(StripePrice.stripe_price_id == price_id)
        ).first()
        
        if not db_price:
            # Get price details from Stripe
            price = stripe.Price.retrieve(price_id)
            product = stripe.Product.retrieve(price["product"])
            
            # Create product in database
            db_product = StripeProduct(
                name=product["name"],
                description=product.get("description", ""),
                active=product["active"],
                stripe_product_id=product["id"],
            )
            session.add(db_product)
            session.commit()
            session.refresh(db_product)
            
            # Create price in database
            db_price = StripePrice(
                unit_amount=price["unit_amount"],
                currency=price["currency"],
                recurring_interval=price["recurring"]["interval"],
                stripe_price_id=price["id"],
                active=price["active"],
                product_id=db_product.id,
            )
            session.add(db_price)
            session.commit()
            session.refresh(db_price)
        
        # Create subscription in database
        db_subscription = StripeSubscription(
            status=subscription["status"],
            current_period_start=subscription["current_period_start"],
            current_period_end=subscription["current_period_end"],
            cancel_at_period_end=subscription["cancel_at_period_end"],
            stripe_subscription_id=subscription["id"],
            user_id=user.id,
            price_id=db_price.id,
        )
        session.add(db_subscription)
        session.commit()
    
    elif event["type"] == "customer.subscription.updated":
        subscription = event["data"]["object"]
        
        # Update subscription in database
        db_subscription = session.exec(
            select(StripeSubscription).where(
                StripeSubscription.stripe_subscription_id == subscription["id"]
            )
        ).first()
        
        if db_subscription:
            db_subscription.status = subscription["status"]
            db_subscription.current_period_start = subscription["current_period_start"]
            db_subscription.current_period_end = subscription["current_period_end"]
            db_subscription.cancel_at_period_end = subscription["cancel_at_period_end"]
            session.add(db_subscription)
            session.commit()
    
    elif event["type"] == "customer.subscription.deleted":
        subscription = event["data"]["object"]
        
        # Update subscription in database
        db_subscription = session.exec(
            select(StripeSubscription).where(
                StripeSubscription.stripe_subscription_id == subscription["id"]
            )
        ).first()
        
        if db_subscription:
            db_subscription.status = "canceled"
            session.add(db_subscription)
            session.commit()
    
    return {"status": "success"}
