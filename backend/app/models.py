from typing import Optional
import uuid

from pydantic import EmailStr
from sqlmodel import Field, Relationship, SQLModel


# Shared properties
class UserBase(SQLModel):
    email: EmailStr = Field(unique=True, index=True, max_length=255)
    is_active: bool = True
    is_superuser: bool = False
    full_name: str | None = Field(default=None, max_length=255)


# Properties to receive via API on creation
class UserCreate(UserBase):
    password: str = Field(min_length=8, max_length=40)


class UserRegister(SQLModel):
    email: EmailStr = Field(max_length=255)
    password: str = Field(min_length=8, max_length=40)
    full_name: str | None = Field(default=None, max_length=255)


# Properties to receive via API on update, all are optional
class UserUpdate(UserBase):
    email: EmailStr | None = Field(default=None, max_length=255)  # type: ignore
    password: str | None = Field(default=None, min_length=8, max_length=40)


class UserUpdateMe(SQLModel):
    full_name: str | None = Field(default=None, max_length=255)
    email: EmailStr | None = Field(default=None, max_length=255)


class UpdatePassword(SQLModel):
    current_password: str = Field(min_length=8, max_length=40)
    new_password: str = Field(min_length=8, max_length=40)


# Database model, database table inferred from class name
class User(UserBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    hashed_password: Optional[str] = None  # Not needed for Google users
    # hashed_password: str
    items: list["Item"] = Relationship(back_populates="owner", cascade_delete=True)
    google_id: Optional[str] = Field(default=None, unique=True, index=True)  # Store Google ID
    stripe_customer_id: Optional[str] = Field(default=None, unique=True, index=True)  # Store Stripe Customer ID
    subscriptions: list["StripeSubscription"] = Relationship(back_populates="user", cascade_delete=True)

# Properties to return via API, id is always required
class UserPublic(UserBase):
    id: uuid.UUID


class UsersPublic(SQLModel):
    data: list[UserPublic]
    count: int


# Shared properties
class ItemBase(SQLModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=255)


# Properties to receive on item creation
class ItemCreate(ItemBase):
    pass


# Properties to receive on item update
class ItemUpdate(ItemBase):
    title: str | None = Field(default=None, min_length=1, max_length=255)  # type: ignore


# Database model, database table inferred from class name
class Item(ItemBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    title: str = Field(max_length=255)
    owner_id: uuid.UUID = Field(
        foreign_key="user.id", nullable=False, ondelete="CASCADE"
    )
    owner: User | None = Relationship(back_populates="items")


# Properties to return via API, id is always required
class ItemPublic(ItemBase):
    id: uuid.UUID
    owner_id: uuid.UUID


class ItemsPublic(SQLModel):
    data: list[ItemPublic]
    count: int


# Generic message
class Message(SQLModel):
    message: str


# JSON payload containing access token
class Token(SQLModel):
    access_token: str
    token_type: str = "bearer"


# Contents of JWT token
class TokenPayload(SQLModel):
    sub: str | None = None


class NewPassword(SQLModel):
    token: str
    new_password: str = Field(min_length=8, max_length=40)


# Stripe Subscription Models
class StripeProductBase(SQLModel):
    name: str = Field(max_length=255)
    description: str | None = Field(default=None, max_length=1000)
    active: bool = True
    stripe_product_id: str = Field(max_length=255, unique=True)


class StripeProductCreate(StripeProductBase):
    pass


class StripeProductUpdate(StripeProductBase):
    name: str | None = Field(default=None, max_length=255)
    description: str | None = Field(default=None, max_length=1000)
    active: bool | None = None
    stripe_product_id: str | None = Field(default=None, max_length=255)


class StripeProduct(StripeProductBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    prices: list["StripePrice"] = Relationship(back_populates="product")


class StripeProductPublic(StripeProductBase):
    id: uuid.UUID


class StripePriceBase(SQLModel):
    unit_amount: int  # Amount in cents
    currency: str = Field(max_length=3, default="usd")
    recurring_interval: str = Field(max_length=10, default="month")  # month, year, etc.
    stripe_price_id: str = Field(max_length=255, unique=True)
    active: bool = True
    product_id: uuid.UUID = Field(foreign_key="stripeproduct.id")


class StripePriceCreate(StripePriceBase):
    pass


class StripePriceUpdate(StripePriceBase):
    unit_amount: int | None = None
    currency: str | None = Field(default=None, max_length=3)
    recurring_interval: str | None = Field(default=None, max_length=10)
    stripe_price_id: str | None = Field(default=None, max_length=255)
    active: bool | None = None
    product_id: uuid.UUID | None = None


class StripePrice(StripePriceBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    product: StripeProduct = Relationship(back_populates="prices")
    subscriptions: list["StripeSubscription"] = Relationship(back_populates="price")


class StripePricePublic(StripePriceBase):
    id: uuid.UUID
    product: StripeProductPublic


class StripeSubscriptionBase(SQLModel):
    status: str = Field(max_length=50)  # active, canceled, past_due, etc.
    current_period_start: int  # Unix timestamp
    current_period_end: int  # Unix timestamp
    cancel_at_period_end: bool = False
    stripe_subscription_id: str = Field(max_length=255, unique=True)
    user_id: uuid.UUID = Field(foreign_key="user.id")
    price_id: uuid.UUID = Field(foreign_key="stripeprice.id")


class StripeSubscriptionCreate(StripeSubscriptionBase):
    pass


class StripeSubscriptionUpdate(StripeSubscriptionBase):
    status: str | None = Field(default=None, max_length=50)
    current_period_start: int | None = None
    current_period_end: int | None = None
    cancel_at_period_end: bool | None = None
    stripe_subscription_id: str | None = Field(default=None, max_length=255)
    user_id: uuid.UUID | None = None
    price_id: uuid.UUID | None = None


class StripeSubscription(StripeSubscriptionBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user: User = Relationship(back_populates="subscriptions")
    price: StripePrice = Relationship(back_populates="subscriptions")


class StripeSubscriptionPublic(StripeSubscriptionBase):
    id: uuid.UUID
    price: StripePricePublic


class StripeSubscriptionsPublic(SQLModel):
    data: list[StripeSubscriptionPublic]
    count: int


# Stripe Checkout and Customer Portal
class CreateCheckoutSessionRequest(SQLModel):
    price_id: str
    success_url: str
    cancel_url: str


class CreateCustomerPortalSessionRequest(SQLModel):
    return_url: str


class StripeSessionResponse(SQLModel):
    url: str
