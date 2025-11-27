# Token Refresh API Documentation

## Overview

The token refresh system implements automatic token renewal to provide a seamless user experience. It uses short-lived access tokens (15 minutes) paired with longer-lived refresh tokens (7 days) for enhanced security.

## Endpoint

### POST /api/auth/refresh

Refreshes an expired or expiring access token using a valid refresh token.

#### Request

```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "string"
}
```

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| refreshToken | string | Yes | The refresh token obtained during login |

#### Response

##### Success (200 OK)

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "a1b2c3d4e5f6...",
    "expiresAt": "2024-01-15T10:30:00.000Z"
  },
  "timestamp": "2024-01-15T10:00:00.000Z"
}
```

##### Error Responses

**400 Bad Request - Missing Refresh Token**
```json
{
  "success": false,
  "error": {
    "code": "MISSING_REFRESH_TOKEN",
    "message": "Token de rafraîchissement requis"
  },
  "timestamp": "2024-01-15T10:00:00.000Z"
}
```

**401 Unauthorized - Invalid Refresh Token**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_REFRESH_TOKEN",
    "message": "Token de rafraîchissement invalide"
  },
  "timestamp": "2024-01-15T10:00:00.000Z"
}
```

**401 Unauthorized - Expired Refresh Token**
```json
{
  "success": false,
  "error": {
    "code": "REFRESH_TOKEN_EXPIRED",
    "message": "Token de rafraîchissement expiré"
  },
  "timestamp": "2024-01-15T10:00:00.000Z"
}
```

**401 Unauthorized - Account Disabled**
```json
{
  "success": false,
  "error": {
    "code": "ACCOUNT_DISABLED",
    "message": "Compte désactivé"
  },
  "timestamp": "2024-01-15T10:00:00.000Z"
}
```

## Security Features

### Token Rotation
- Each refresh request generates a new access token AND a new refresh token
- The old refresh token is immediately invalidated
- This prevents token replay attacks

### Session Extension
- Successful refresh extends both access token and refresh token expiration
- Access tokens expire in 15 minutes
- Refresh tokens expire in 7 days

### Security Logging
All token refresh attempts are logged with the following information:
- User ID and email
- IP address and user agent
- Timestamp
- Success/failure status
- Error details for failed attempts

### Rate Limiting
The refresh endpoint is protected by the same rate limiting as other auth endpoints to prevent abuse.

## Usage Examples

### JavaScript/TypeScript

```javascript
async function refreshAccessToken(refreshToken) {
  try {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });

    if (response.ok) {
      const data = await response.json();
      return {
        accessToken: data.data.token,
        refreshToken: data.data.refreshToken,
        expiresAt: new Date(data.data.expiresAt),
      };
    } else {
      const error = await response.json();
      throw new Error(error.error.message);
    }
  } catch (error) {
    console.error('Token refresh failed:', error);
    throw error;
  }
}
```

### cURL

```bash
curl -X POST http://localhost:3001/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"your-refresh-token-here"}'
```

## Integration with Frontend

The refresh endpoint is designed to work with automatic token refresh interceptors:

1. **Detect expired tokens**: Monitor 401 responses from API calls
2. **Attempt refresh**: Call the refresh endpoint with stored refresh token
3. **Retry original request**: Use new access token to retry the failed request
4. **Handle refresh failure**: Redirect to login if refresh fails

## Database Schema

The refresh token system uses the following session structure:

```sql
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,           -- Access token
  refresh_token TEXT UNIQUE NOT NULL,   -- Refresh token
  expires_at TIMESTAMP NOT NULL,        -- Access token expiration
  refresh_expires_at TIMESTAMP NOT NULL, -- Refresh token expiration
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

## Error Handling

The refresh endpoint handles various error scenarios:

1. **Network errors**: Implement retry logic with exponential backoff
2. **Invalid tokens**: Clear stored tokens and redirect to login
3. **Expired refresh tokens**: Remove from storage and redirect to login
4. **Account disabled**: Clear tokens and show appropriate message
5. **Server errors**: Retry with backoff, fallback to login

## Testing

Comprehensive test coverage includes:

- Valid refresh token scenarios
- Invalid/expired token handling
- Account disabled scenarios
- Concurrent refresh requests
- Token rotation verification
- Security logging validation
- Session extension verification

Run tests with:
```bash
npm test -- --testPathPatterns=token-refresh
```