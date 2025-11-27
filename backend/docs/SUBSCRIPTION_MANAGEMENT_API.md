# Subscription Management API

This document describes the enhanced subscription management API endpoints for SaaS user management.

## Base URL
All endpoints are prefixed with `/api/admin/subscriptions`

## Authentication
All endpoints require admin authentication with appropriate permissions.

## Endpoints

### Plan Management

#### Change Subscription Plan
```http
POST /api/admin/subscriptions/:id/change-plan
```

**Request Body:**
```json
{
  "planId": "string",
  "immediate": true,
  "scheduledDate": "2025-09-01T00:00:00.000Z", // Optional, for scheduled changes
  "prorated": true,
  "reason": "admin_upgrade"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "subscription_id",
    "userId": "user_id",
    "planId": "new_plan_id",
    "status": "active",
    "plan": {
      "name": "premium",
      "displayName": "Premium Plan"
    }
  },
  "message": "Plan changé avec succès"
}
```

### Billing Credits

#### Add Billing Credits
```http
POST /api/admin/subscriptions/:id/credits
```

**Request Body:**
```json
{
  "amount": 50.00,
  "reason": "Customer satisfaction credit",
  "expiresAt": "2025-12-31T23:59:59.000Z" // Optional
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "credit_id",
    "amount": 50.00,
    "reason": "Customer satisfaction credit",
    "isActive": true,
    "createdBy": "admin@example.com"
  },
  "message": "Crédit ajouté avec succès"
}
```

### Refund Processing

#### Process Refund
```http
POST /api/admin/subscriptions/:id/refund
```

**Request Body:**
```json
{
  "amount": 25.00,
  "reason": "Service not as expected",
  "refundType": "partial" // "full", "partial", "prorated"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "refund": {
      "id": "refund_id",
      "refund_type": "partial"
    },
    "amount": 25.00,
    "stripeRefund": {
      "id": "re_stripe_id"
    }
  },
  "message": "Remboursement traité avec succès"
}
```

### Usage Management

#### Get Usage Metrics
```http
GET /api/admin/subscriptions/:id/usage?period=2025-08
```

**Response:**
```json
{
  "success": true,
  "data": {
    "subscriptionId": "subscription_id",
    "period": "2025-08",
    "invoices": 15,
    "clients": 25,
    "products": 8,
    "storage": 150,
    "apiCalls": 1250,
    "lastUpdated": "2025-08-25T10:30:00.000Z"
  }
}
```

#### Reset Usage Limits
```http
POST /api/admin/subscriptions/:id/reset-usage
```

**Request Body:**
```json
{
  "resourceType": "invoices" // Optional: "invoices", "clients", "products", "storage", "api_calls"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Limite d'utilisation réinitialisée pour invoices"
}
```

### Payment Methods

#### Get Payment Methods
```http
GET /api/admin/subscriptions/:id/payment-methods
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "pm_stripe_id",
      "type": "card",
      "last4": "4242",
      "brand": "visa",
      "expiryMonth": 12,
      "expiryYear": 2027,
      "isDefault": true
    }
  ]
}
```

#### Update Payment Method
```http
PUT /api/admin/subscriptions/:id/payment-method
```

**Request Body:**
```json
{
  "paymentMethodId": "pm_new_stripe_id"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Méthode de paiement mise à jour avec succès"
}
```

### Subscription Control

#### Pause Subscription
```http
POST /api/admin/subscriptions/:id/pause
```

**Request Body:**
```json
{
  "resumeDate": "2025-09-15T00:00:00.000Z" // Optional, for scheduled resume
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "subscription_id",
    "status": "paused"
  },
  "message": "Abonnement mis en pause"
}
```

#### Resume Subscription
```http
POST /api/admin/subscriptions/:id/resume
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "subscription_id",
    "status": "active"
  },
  "message": "Abonnement repris avec succès"
}
```

### Billing History

#### Get Billing History
```http
GET /api/admin/subscriptions/:id/billing-history?page=1&limit=20
```

**Response:**
```json
{
  "success": true,
  "data": {
    "billingLogs": [
      {
        "id": "log_id",
        "eventType": "payment_succeeded",
        "amount": 29.99,
        "currency": "CHF",
        "status": "success",
        "createdAt": "2025-08-25T10:00:00.000Z",
        "metadata": {
          "planName": "premium"
        }
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "totalCount": 45,
      "hasNextPage": true,
      "hasPrevPage": false,
      "limit": 20
    }
  }
}
```

### Comprehensive Details

#### Get Subscription Details
```http
GET /api/admin/subscriptions/:id/details
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "subscription_id",
    "userId": "user_id",
    "status": "active",
    "currentPeriodStart": "2025-08-01T00:00:00.000Z",
    "currentPeriodEnd": "2025-09-01T00:00:00.000Z",
    "plan": {
      "name": "premium",
      "displayName": "Premium Plan",
      "price": 29.99
    },
    "user": {
      "email": "user@example.com",
      "companyName": "Example Corp"
    },
    "credits": [
      {
        "id": "credit_id",
        "amount": 25.00,
        "reason": "Customer satisfaction",
        "isActive": true,
        "expiresAt": "2025-12-31T23:59:59.000Z"
      }
    ],
    "paymentMethods": [
      {
        "id": "pm_stripe_id",
        "type": "card",
        "last4": "4242",
        "brand": "visa",
        "isDefault": true
      }
    ],
    "nextBillingAmount": 4.99,
    "usageRecords": [
      {
        "resourceType": "invoices",
        "quantity": 15,
        "period": "2025-08"
      }
    ],
    "billingLogs": [
      {
        "eventType": "payment_succeeded",
        "amount": 29.99,
        "status": "success",
        "createdAt": "2025-08-25T10:00:00.000Z"
      }
    ]
  }
}
```

## Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": [] // Optional validation details
  }
}
```

### Common Error Codes

- `VALIDATION_ERROR`: Invalid request data
- `SUBSCRIPTION_NOT_FOUND`: Subscription does not exist
- `PLAN_NOT_FOUND`: Plan does not exist
- `ALREADY_CANCELLED`: Subscription is already cancelled
- `ALREADY_PAUSED`: Subscription is already paused
- `NOT_PAUSED`: Subscription is not paused (for resume operations)
- `INTERNAL_ERROR`: Server error

## Permissions Required

All endpoints require the admin to have `subscriptions` permission with appropriate access level:
- `read`: For GET endpoints
- `write`: For POST, PUT endpoints

## Audit Logging

All write operations are automatically logged with:
- Admin user who performed the action
- Timestamp
- Action type
- Resource affected
- Changes made

## Rate Limiting

API endpoints are subject to rate limiting:
- 100 requests per minute per admin user
- 1000 requests per hour per admin user

## Webhook Events

The following webhook events are triggered:
- `subscription.plan_changed`
- `subscription.paused`
- `subscription.resumed`
- `billing.credit_added`
- `billing.refund_processed`
- `usage.limit_reset`

## Examples

### Complete Plan Upgrade Flow

1. **Check current subscription:**
   ```http
   GET /api/admin/subscriptions/sub_123/details
   ```

2. **Change plan immediately:**
   ```http
   POST /api/admin/subscriptions/sub_123/change-plan
   {
     "planId": "plan_premium",
     "immediate": true,
     "prorated": true,
     "reason": "customer_request"
   }
   ```

3. **Add promotional credit:**
   ```http
   POST /api/admin/subscriptions/sub_123/credits
   {
     "amount": 10.00,
     "reason": "Upgrade promotion",
     "expiresAt": "2025-12-31T23:59:59.000Z"
   }
   ```

### Customer Support Refund Flow

1. **Process partial refund:**
   ```http
   POST /api/admin/subscriptions/sub_123/refund
   {
     "amount": 15.00,
     "reason": "Service interruption compensation",
     "refundType": "partial"
   }
   ```

2. **Add service credit:**
   ```http
   POST /api/admin/subscriptions/sub_123/credits
   {
     "amount": 15.00,
     "reason": "Service interruption credit"
   }
   ```

### Usage Management Flow

1. **Check current usage:**
   ```http
   GET /api/admin/subscriptions/sub_123/usage
   ```

2. **Reset specific usage limit:**
   ```http
   POST /api/admin/subscriptions/sub_123/reset-usage
   {
     "resourceType": "invoices"
   }
   ```

This API provides comprehensive subscription management capabilities for SaaS administrators, enabling efficient handling of plan changes, billing adjustments, usage management, and customer support scenarios.