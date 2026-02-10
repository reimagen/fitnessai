# API Implementation Guide - Phase 2

Comprehensive guide for implementing the REST API layer for FitnessAI, enabling future React Native rebuild while maintaining current web functionality.

## Overview

**Phase 2** converts existing Server Actions into REST API endpoints following these principles:

1. **Zero Impact on Web App:** Web continues using Server Actions
2. **API as Parallel Layer:** APIs wrap existing business logic
3. **Decouple Frontend & Backend:** Enables future mobile apps
4. **Maintain Consistency:** Same validation, logging, auth as web

## Architecture

### Current Architecture (Phase 1)
```
Web Browser
    ↓
Next.js App Router
    ↓
Server Actions
    ↓
Firebase/Firestore
```

### Phase 2 Architecture (API Layer)
```
Web Browser          Mobile App
    ↓                  ↓
Server Actions    ← REST API
    ↓                  ↓
    └─────────────────┬────────┘
                      ↓
         Business Logic (Shared)
                      ↓
         Firebase/Firestore
```

## API Routes Created

### Implemented (✅)

- `POST /api/v1/session` - Create session from ID token
- `DELETE /api/v1/session` - Clear session
- `GET /api/v1/workouts` - List workouts
- `POST /api/v1/workouts` - Create workout
- `GET /api/v1/workouts/:id` - Get specific workout
- `PUT /api/v1/workouts/:id` - Update workout
- `DELETE /api/v1/workouts/:id` - Delete workout
- `GET /api/v1/profile` - Get user profile
- `PUT /api/v1/profile` - Update profile
- `GET /api/v1/goals` - Get fitness goals
- `POST /api/v1/goals` - Save fitness goals

### To Implement (Phase 2 Tier 1)

- `GET /api/v1/prs` - List personal records
- `POST /api/v1/prs` - Create PR
- `PUT /api/v1/prs/:id` - Update PR
- `DELETE /api/v1/prs/:id` - Delete PR
- `GET /api/v1/exercises` - List exercises (public)
- `GET /api/v1/plans` - Get current plan
- `POST /api/v1/plans` - Save plan

### AI Endpoints (Phase 2 Tier 2)

- `POST /api/v1/ai/parse-workout` - Parse workout from photo
- `POST /api/v1/ai/parse-prs` - Parse PRs from photo
- `POST /api/v1/ai/analyze-strength` - Strength analysis
- `POST /api/v1/ai/analyze-progression` - Progression analysis
- `POST /api/v1/ai/analyze-goals` - Goal analysis
- `POST /api/v1/ai/generate-plan` - Generate plan

## Implementation Pattern

All endpoints follow this pattern:

```typescript
// File: src/app/api/v1/{resource}/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuthentication, handleApiError, createSuccessResponse } from '@/lib/api/middleware';
import { someAction } from '@/app/{feature}/actions';

// 1. Define validation schema
const RequestSchema = z.object({
  field: z.string(),
  // ... other fields
});

// 2. Implement endpoint with auth wrapper
export async function POST(request: NextRequest) {
  return withAuthentication(request, async (req) => {
    try {
      const body = await request.json();
      const validatedBody = RequestSchema.safeParse(body);

      if (!validatedBody.success) {
        return NextResponse.json(
          { error: `Validation error: ${validatedBody.error.message}` },
          { status: 400 }
        );
      }

      // 3. Call existing action
      const result = await someAction(req.userId, validatedBody.data);

      // 4. Return standardized response
      return NextResponse.json(
        createSuccessResponse(result),
        { status: 200 }
      );
    } catch (error) {
      return handleApiError(error);
    }
  });
}
```

## Authentication

All endpoints require Firebase ID token in Authorization header:

```bash
curl -H "Authorization: Bearer <id-token>" \
  https://fitnessai.com/api/v1/workouts
```

**Implementation:**

1. Client gets ID token from Firebase Auth SDK
2. Client sends in `Authorization: Bearer {token}` header
3. Middleware verifies token with Firebase Admin SDK
4. Endpoint receives `userId` in authenticated request

### Token Acquisition

**Web App (Current):**
```typescript
const idToken = await currentUser.getIdToken();
// Send to server actions (automatic via cookies)
```

**Mobile App (Future):**
```typescript
const idToken = await auth.currentUser?.getIdToken();
fetch(`/api/v1/workouts`, {
  headers: {
    'Authorization': `Bearer ${idToken}`
  }
});
```

## Response Format

All responses follow this standardized format:

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
}
```

**Success (200):**
```json
{
  "success": true,
  "data": {
    "workouts": [...],
    "count": 5
  },
  "timestamp": 1707123456789
}
```

**Error (400):**
```json
{
  "success": false,
  "error": "Invalid workout data: sets must be non-negative",
  "timestamp": 1707123456789
}
```

## Error Handling

| Error | Status | Middleware | Action |
|-------|--------|-----------|--------|
| Invalid token | 401 | `verifyFirebaseToken` | Re-authenticate |
| Missing auth header | 401 | `verifyFirebaseToken` | Add token |
| Invalid JSON | 400 | Request parsing | Fix request body |
| Validation error | 400 | `validateRequestBody` | Fix data |
| Not found | 404 | Endpoint logic | Check ID |
| Rate limited | 429 | `checkRateLimit` | Wait and retry |
| Server error | 500 | `handleApiError` | Check logs |

## Testing Endpoints

### With curl

```bash
# Get ID token from local dev session
IDTOKEN=$(curl -s https://securetoken.googleapis.com/v1/token?key=$FIREBASE_API_KEY \
  -d grant_type=refresh_token \
  -d refresh_token=$REFRESH_TOKEN | jq -r '.id_token')

# Call API
curl -H "Authorization: Bearer $IDTOKEN" \
  http://localhost:3000/api/v1/workouts
```

### With Postman

1. Create new request
2. Set method to GET/POST/PUT/DELETE
3. Go to Headers tab
4. Add header: `Authorization: Bearer {id-token}`
5. For POST/PUT, add body with JSON

### With Next.js Testing

```typescript
// __tests__/api.test.ts
import { createMocks } from 'node-mocks-http';

describe('GET /api/v1/workouts', () => {
  it('requires authentication', async () => {
    const { req, res } = createMocks({
      method: 'GET',
    });

    await handler(req, res);
    expect(res._getStatusCode()).toBe(401);
  });
});
```

## Migration Timeline

### Week 1: Foundation
- ✅ API middleware & auth
- ✅ Workouts endpoints (GET/POST/PUT/DELETE)
- ✅ Profile endpoints (GET/PUT)
- ✅ Goals endpoints (GET/POST)

### Week 2: Expand
- [ ] PRs endpoints (GET/POST/PUT/DELETE)
- [ ] Exercises endpoints (GET)
- [ ] Plans endpoints (GET/POST)

### Week 3: AI Endpoints
- [ ] Parse workout endpoint
- [ ] Parse PRs endpoint
- [ ] Strength analysis endpoint
- [ ] Progression analysis endpoint
- [ ] Goal analysis endpoint
- [ ] Plan generation endpoint

### Week 4: Integration & Testing
- [ ] Integration tests for all endpoints
- [ ] Performance testing
- [ ] Load testing
- [ ] Documentation

## Deployment Strategy

### Gradual Rollout

**Phase 2a (Week 1-2): API Foundation**
- Deploy API to production
- No users consuming yet
- Available for internal testing

**Phase 2b (Week 3-4): Testing**
- Invite beta testers
- Test with real users
- Fix issues

**Phase 2c (Post-PMF): React Native App**
- React Native app starts consuming APIs
- Web app continues with Server Actions
- Eventually migrate web to APIs if needed

## Future: React Native App

When building React Native app in Phase 3:

```typescript
// React Native example
import { useState } from 'react';
import { useAuth } from '@react-native-firebase/auth';

export function WorkoutList() {
  const [workouts, setWorkouts] = useState([]);
  const auth = useAuth();

  useEffect(() => {
    const loadWorkouts = async () => {
      const user = auth.currentUser;
      const idToken = await user?.getIdToken();

      const response = await fetch('https://api.fitnessai.com/api/v1/workouts', {
        headers: {
          'Authorization': `Bearer ${idToken}`
        }
      });

      const data = await response.json();
      setWorkouts(data.data.workouts);
    };

    loadWorkouts();
  }, []);

  return (
    <FlatList
      data={workouts}
      renderItem={({ item }) => <WorkoutCard workout={item} />}
    />
  );
}
```

## Monitoring & Observability

### Logging

All endpoints log to Cloud Logging:

```typescript
await logger.info('Retrieved workouts', {
  userId: 'user123',
  route: '/api/v1/workouts',
  count: 5,
  duration: 234
});
```

### Metrics to Track

- **Latency:** p50, p95, p99
- **Error Rate:** 4xx, 5xx by endpoint
- **Throughput:** Requests per second
- **Auth Failures:** Invalid tokens, missing headers

### Alerting

Alert on:
- Error rate > 1%
- P95 latency > 2 seconds
- Auth failure spike
- Service unavailability

## Security Considerations

### API Key / Rate Limiting

Currently using server-side rate limiting per user:

```typescript
const { allowed, error } = await checkRateLimit(userId, 'feature');
```

Consider implementing per-client rate limiting for production:

```typescript
// Future: Per-API-key rate limiting
const { allowed } = await checkRateLimit(apiKey, 'feature', {
  maxRequests: 100,
  windowSeconds: 60
});
```

### CORS

For mobile apps to call APIs from different domains:

```typescript
// Add CORS middleware
headers['Access-Control-Allow-Origin'] = process.env.CORS_ALLOWED_ORIGINS;
headers['Access-Control-Allow-Methods'] = 'GET,POST,PUT,DELETE';
headers['Access-Control-Allow-Headers'] = 'Authorization,Content-Type';
```

### Data Validation

All inputs validated with Zod before processing:

```typescript
const schema = z.object({
  weight: z.number().positive('Weight must be positive'),
  exercises: z.array(...).min(1, 'At least one exercise required'),
});

const result = schema.safeParse(input);
if (!result.success) {
  // Return 400 with validation errors
}
```

## Maintenance & Versioning

### API Versioning

Current version: `/api/v1`

When breaking changes needed:
1. Create `/api/v2`
2. Keep `/api/v1` for backwards compatibility
3. Deprecate `/api/v1` after 6 months notice
4. Document migration path

### Backwards Compatibility

Never:
- Remove fields
- Change field types
- Change HTTP methods
- Change status codes

Instead:
- Add new endpoints
- Add new optional fields
- Deprecate old endpoints (6 months)
- Document migration path

## Documentation

Create comprehensive docs:

- [ ] API Reference (endpoints, params, responses)
- [ ] Authentication Guide (get token, header format)
- [ ] Examples (curl, JavaScript, React Native)
- [ ] Error Handling (error codes, retry logic)
- [ ] Rate Limiting (limits per feature)
- [ ] Changelog (new endpoints, breaking changes)

## Success Metrics

By end of Phase 2:

- ✅ All endpoints implemented and tested
- ✅ Zero breaking changes to web app
- ✅ API docs complete and accurate
- ✅ <100ms average latency
- ✅ <0.1% error rate
- ✅ Ready for React Native consumption

## Next Steps

1. **Implement remaining endpoints** (Week 2-3)
2. **Add comprehensive tests** (Week 3-4)
3. **Performance optimization** (Week 4)
4. **Documentation** (Ongoing)
5. **Deploy to production** (End of Phase 2)
6. **Begin Phase 3** (React Native rebuild using APIs)

---

See also:
- [README.md](../mobile/README.md) - Mobile app overview
- [AUTHENTICATION.md](../mobile/AUTHENTICATION.md) - Auth details
- [Plan.md](./PLAN.md) - Overall implementation plan
