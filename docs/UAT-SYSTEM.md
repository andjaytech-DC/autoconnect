# Progressive AutoHub — User Acceptance Testing (UAT) System

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    PROGRESSIVE AUTOHUB                          │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Android App  │  │ Web / Admin  │  │ API Client / SDK     │  │
│  │ (Kotlin)     │  │ (Next.js)    │  │ (TypeScript)         │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘  │
│         │                 │                      │              │
│         └─────────────────┼──────────────────────┘              │
│                           │                                     │
│                    ┌──────▼───────┐                             │
│                    │ NestJS API   │                             │
│                    │ (Backend)    │                             │
│                    └──────┬───────┘                             │
│                           │                                     │
│                    ┌──────▼───────┐                             │
│                    │ PostgreSQL   │                             │
│                    │ (Prisma)     │                             │
│                    └──────────────┘                             │
└─────────────────────────────────────────────────────────────────┘
```

## Business Functionalities

### 1. AUTHENTICATION

**Workflow:**
```
Customer/Register → Email/Phone → Password → Backend Auth → JWT Token → Session
```

**Backend API Contract:**
| Endpoint | Method | Auth | Request | Response |
|----------|--------|------|---------|----------|
| `/auth/register` | POST | No | `{ firstName, lastName, email, phone, password, role? }` | `{ success, data: { user, accessToken, refreshToken } }` |
| `/auth/login` | POST | No | `{ email, password }` | `{ success, data: { user, accessToken, refreshToken } }` |
| `/auth/profile` | GET | JWT | — | `{ success, data: User }` |
| `/auth/fcm-token` | POST | JWT | `{ token: string }` | `{ success }` |

**Android Implementation:**
- File: `feature/authentication/.../AuthViewModel.kt`
- API: `core/network/.../AuthApi.kt`
- Storage: `core/datastore/.../UserPreferences.kt`
- UI: `feature/authentication/.../LoginScreen.kt`, `RegisterScreen.kt`

**Web Implementation:**
- Route: `app/api/auth/...`
- Pages: `app/login/`, `app/register/`

**UAT Test Cases:**
| ID | Test | Expected | Pass/Fail |
|----|------|----------|-----------|
| AUTH-001 | Register with valid data | User created, JWT returned | |
| AUTH-002 | Register with duplicate email | Error: email exists | |
| AUTH-003 | Login with correct credentials | JWT returned, session created | |
| AUTH-004 | Login with wrong password | Error: invalid credentials | |
| AUTH-005 | Access protected route without token | 401 Unauthorized | |
| AUTH-006 | Access protected route with valid JWT | 200 OK, data returned | |
| AUTH-007 | Register as DEALER | Role = DEALER, dealer profile created | |
| AUTH-008 | Register as CUSTOMER | Role = CUSTOMER | |

---

### 2. VEHICLE LISTING (CRUD)

**Workflow:**
```
Dealer → Create Vehicle → Admin Review → Approve/Reject → Published/Customer Sees
```

**Backend API Contract:**
| Endpoint | Method | Auth | Request | Response |
|----------|--------|------|---------|----------|
| `/vehicles` | GET | No | `?brandId=&category=&status=&minPrice=&maxPrice=&city=&page=&limit=` | `{ success, data: { items, total, page, pageSize } }` |
| `/vehicles/:id` | GET | No | — | `{ success, data: Vehicle }` |
| `/vehicles` | POST | DEALER/ADMIN | `{ title, price, year, fuel, transmission, ... }` | `{ success, data: Vehicle }` |
| `/vehicles/:id` | PATCH | DEALER/ADMIN | Partial Vehicle | `{ success, data: Vehicle }` |
| `/vehicles/:id` | DELETE | DEALER/ADMIN | — | `{ success }` |
| `/vehicles/:id/status` | PATCH | ADMIN | `{ status: "AVAILABLE" | "SOLD" | ... }` | `{ success, data: Vehicle }` |

**Android Implementation:**
- API: `core/network/.../VehicleApi.kt`
- UI: `feature/cars/.../CarListScreen.kt`, `CarDetailScreen.kt`
- Dealer: `feature/dealers/.../DealerVehicleScreen.kt`

**Web Implementation:**
- Route: `app/api/vehicles/...`
- Pages: `app/cars/`, `app/portal/dealer/`

**UAT Test Cases:**
| ID | Test | Expected | Pass/Fail |
|----|------|----------|-----------|
| VEH-001 | List vehicles (no filter) | All AVAILABLE vehicles returned | |
| VEH-002 | Filter by brand | Only matching brand returned | |
| VEH-003 | Filter by price range | Only vehicles in range | |
| VEH-004 | Filter by city | Only vehicles in city | |
| VEH-005 | Dealer creates vehicle | Vehicle created with status AVAILABLE | |
| VEH-006 | Dealer updates own vehicle | Vehicle updated | |
| VEH-007 | Dealer tries to update other's vehicle | 403 Forbidden | |
| VEH-008 | Admin changes vehicle status | Status updated | |
| VEH-009 | Get vehicle detail | Full vehicle data returned | |
| VEH-010 | Delete vehicle | Vehicle removed | |

---

### 3. LEAD MANAGEMENT

**Workflow:**
```
Customer → Inquiries Vehicle → Lead Created → Dealer Notified → Dealer Contacts → Status Updated
```

**Backend API Contract:**
| Endpoint | Method | Auth | Request | Response |
|----------|--------|------|---------|----------|
| `/leads` | POST | No | `{ vehicleId, customerName, customerPhone, message? }` | `{ success, data: Lead }` |
| `/leads` | GET | ADMIN | — | `{ success, data: Lead[] }` |
| `/leads/:id` | PATCH | ADMIN | `{ status, notes? }` | `{ success, data: Lead }` |
| `/leads/dealer` | GET | DEALER | — | `{ success, data: Lead[] }` |

**Android Implementation:**
- API: `core/network/.../VehicleApi.kt` (lead submission)
- UI: `feature/cars/.../CarDetailScreen.kt` (inquiry form)

**Web Implementation:**
- Route: `app/api/leads/...`
- Admin: `app/portal/admin/` (LeadManager component)

**UAT Test Cases:**
| ID | Test | Expected | Pass/Fail |
|----|------|----------|-----------|
| LEAD-001 | Submit lead with valid data | Lead created, status = NEW | |
| LEAD-002 | Submit lead without phone | Error: phone required | |
| LEAD-003 | Admin views all leads | All leads returned | |
| LEAD-004 | Admin updates lead status | Status updated | |
| LEAD-005 | Dealer views own leads | Only dealer's vehicle leads | |
| LEAD-006 | Lead creates notification | In-app notification created for dealer | |

---

### 4. TEST DRIVE BOOKING

**Workflow:**
```
Customer → Selects Vehicle → Picks Date/Time → Booking Created → Dealer Confirms → Customer Notified
```

**Backend API Contract:**
| Endpoint | Method | Auth | Request | Response |
|----------|--------|------|---------|----------|
| `/bookings` | POST | CUSTOMER | `{ vehicleId, bookingDate, notes? }` | `{ success, data: Booking }` |
| `/bookings` | GET | CUSTOMER | — | `{ success, data: Booking[] }` |
| `/bookings/:id` | PATCH | DEALER | `{ status: "CONFIRMED" | "CANCELLED" }` | `{ success, data: Booking }` |
| `/bookings/dealer` | GET | DEALER | — | `{ success, data: Booking[] }` |

**Android Implementation:**
- API: (part of VehicleApi or BookingApi)
- UI: `feature/bookings/.../BookingScreen.kt`

**Web Implementation:**
- Route: `app/api/bookings/...`
- Pages: `app/bookings/`

**UAT Test Cases:**
| ID | Test | Expected | Pass/Fail |
|----|------|----------|-----------|
| BOOK-001 | Create booking with valid data | Booking created, status = PENDING | |
| BOOK-002 | Create booking for unavailable vehicle | Error or handled | |
| BOOK-003 | Dealer confirms booking | Status = CONFIRMED | |
| BOOK-004 | Dealer cancels booking | Status = CANCELLED | |
| BOOK-005 | Customer views own bookings | Only customer's bookings | |
| BOOK-006 | Booking triggers notification | Dealer notified of new booking | |

---

### 5. FINANCE APPLICATION

**Workflow:**
```
Customer → Selects Vehicle → Fills Loan Details → Submits Application → Under Review → Approved/Rejected
```

**Backend API Contract:**
| Endpoint | Method | Auth | Request | Response |
|----------|--------|------|---------|----------|
| `/finance/applications` | POST | CUSTOMER | `{ vehicleId, loanAmount, tenureMonths, ... }` | `{ success, data: FinanceApplication }` |
| `/finance/applications` | GET | CUSTOMER | — | `{ success, data: FinanceApplication[] }` |
| `/finance/applications/:id` | PATCH | ADMIN | `{ status, interestRate?, emi? }` | `{ success, data: FinanceApplication }` |

**Android Implementation:**
- API: `core/network/.../FinanceApi.kt`
- UI: `feature/finance/.../FinanceScreen.kt`

**Web Implementation:**
- Route: `app/api/finance-applications/...`
- Pages: `app/finance/`

**UAT Test Cases:**
| ID | Test | Expected | Pass/Fail |
|----|------|----------|-----------|
| FIN-001 | Submit finance application | Application created, status = SUBMITTED | |
| FIN-002 | Submit without required fields | Error: validation failed | |
| FIN-003 | Admin reviews application | Status = UNDER_REVIEW | |
| FIN-004 | Admin approves application | Status = APPROVED, emi calculated | |
| FIN-005 | Admin rejects application | Status = REJECTED | |
| FIN-006 | Customer views own applications | Only customer's applications | |

---

### 6. NOTIFICATION SYSTEM

**Workflow:**
```
Business Event → NotificationsService.dispatch() → Preference Check → Provider → Delivery → Tracking
```

**Backend API Contract:**
| Endpoint | Method | Auth | Request | Response |
|----------|--------|------|---------|----------|
| `/notifications` | GET | JWT | — | `{ success, data: Notification[] }` |
| `/notifications/unread-count` | GET | JWT | — | `{ success, data: number }` |
| `/notifications/:id/read` | PATCH | JWT | — | `{ success, message }` |
| `/notifications/read-all` | PATCH | JWT | — | `{ success, message }` |
| `/notifications/preferences` | GET | JWT | — | `{ success, data: { smsEnabled, emailEnabled, pushEnabled } }` |
| `/notifications/preferences` | PATCH | JWT | `{ smsEnabled?, emailEnabled? }` | `{ success, data: { smsEnabled, emailEnabled } }` |
| `/notifications/provider-status` | GET | ADMIN | — | `{ sms, email, push }` |

**Dispatch Logic:**
```
IN_APP   → Always create
PUSH     → If fcmToken exists
SMS      → If smsEnabled = true AND sendSms = true
EMAIL    → If emailEnabled = true AND sendEmail = true
```

**Android Implementation:**
- API: `core/network/.../NotificationApi.kt`
- Model: `core/model/.../AppNotification.kt`, `NotificationPreferences`
- ViewModel: `feature/notifications/.../NotificationsViewModel.kt`
- UI: `feature/notifications/.../NotificationsScreen.kt`
- Profile: `feature/profile/.../ProfileViewModel.kt` (toggle sync)
- FCM: `app/.../service/FCMService.kt`

**Web Implementation:**
- Route: `app/api/notifications/...`
- Proxy: `app/server/nest-client.ts` → NestJS
- Admin: `app/portal/admin/` (NotificationDashboard, ProviderHealthPanel)

**UAT Test Cases:**
| ID | Test | Expected | Pass/Fail |
|----|------|----------|-----------|
| NOTIF-001 | Customer registers | In-App created, Email/SMS per prefs, Push if token | |
| NOTIF-002 | Disable SMS | No SMS sent, Email/Push unchanged | |
| NOTIF-003 | Disable Email | No Email sent, SMS/Push unchanged | |
| NOTIF-004 | Enable SMS | SMS sent, provider ID recorded | |
| NOTIF-005 | Enable Email | Email sent, provider ID recorded | |
| NOTIF-006 | FCM token exists | Push sent, response tracked | |
| NOTIF-007 | FCM token missing | No crash, In-App still created | |
| NOTIF-008 | SMS provider failure | Business op succeeds, notification = FAILED | |
| NOTIF-009 | Email provider failure | Business op succeeds, notification = FAILED | |
| NOTIF-010 | Rate limit exceeded | 429 Too Many Requests | |
| NOTIF-011 | Admin dashboard | Counts, filters, statuses, details visible | |
| NOTIF-012 | Webhook | Valid → accepted, Invalid → rejected, Duplicate → idempotent | |
| NOTIF-013 | Android toggle sync | Toggle → local + backend PATCH | |
| NOTIF-014 | Backend load sync | GET prefs → update local DataStore | |

---

### 7. INSURANCE

**Workflow:**
```
Customer → Gets Quote → Submits Application → Under Review → Approved/Rejected
```

**Backend API Contract:**
| Endpoint | Method | Auth | Request | Response |
|----------|--------|------|---------|----------|
| `/insurance/quotes/:vehicleId` | GET | No | — | `{ success, data: InsuranceQuote[] }` |
| `/insurance/policies` | POST | CUSTOMER | `{ vehicleId, providerId, planType, ... }` | `{ success, data: InsurancePolicy }` |
| `/insurance/policies` | GET | CUSTOMER | — | `{ success, data: InsurancePolicy[] }` |
| `/insurance-enquiries` | POST | No | `{ customerName, phone, coverType, ... }` | `{ success, data: InsuranceEnquiry }` |

**UAT Test Cases:**
| ID | Test | Expected | Pass/Fail |
|----|------|----------|-----------|
| INS-001 | Get insurance quotes | Quotes returned for vehicle | |
| INS-002 | Submit insurance application | Policy created, status = QUOTE | |
| INS-003 | Submit insurance enquiry | Enquiry created, status = NEW | |
| INS-004 | Customer views own policies | Only customer's policies | |

---

### 8. ORDERS

**Workflow:**
```
Customer → Adds to Cart → Places Order → Confirmed → Processing → Shipped → Delivered
```

**Backend API Contract:**
| Endpoint | Method | Auth | Request | Response |
|----------|--------|------|---------|----------|
| `/orders` | POST | CUSTOMER | `{ itemType, itemId, itemName, unitPrice, ... }` | `{ success, data: Order }` |
| `/orders` | GET | CUSTOMER | — | `{ success, data: Order[] }` |
| `/orders/:id` | PATCH | ADMIN | `{ status }` | `{ success, data: Order }` |

**UAT Test Cases:**
| ID | Test | Expected | Pass/Fail |
|----|------|----------|-----------|
| ORD-001 | Place order | Order created, status = PLACED | |
| ORD-002 | Order triggers notification | Customer notified | |
| ORD-003 | Admin updates order status | Status updated | |
| ORD-004 | Customer views own orders | Only customer's orders | |

---

### 9. SELL CAR (Seller Listing)

**Workflow:**
```
Customer → Submits Vehicle Details → Listing Created (PENDING) → Admin Reviews → Approved/Rejected
```

**Backend API Contract:**
| Endpoint | Method | Auth | Request | Response |
|----------|--------|------|---------|----------|
| `/seller-listings` | POST | No | `{ ownerName, phone, vehicleData, images? }` | `{ success, data: SellerListing }` |
| `/seller-listings` | GET | ADMIN | — | `{ success, data: SellerListing[] }` |
| `/seller-listings/:id` | PATCH | ADMIN | `{ status }` | `{ success, data: SellerListing }` |

**UAT Test Cases:**
| ID | Test | Expected | Pass/Fail |
|----|------|----------|-----------|
| SELL-001 | Submit seller listing | Listing created, status = PENDING | |
| SELL-002 | Admin approves listing | Status = APPROVED | |
| SELL-003 | Admin rejects listing | Status = REJECTED | |

---

### 10. SERVICES (Automotive)

**Workflow:**
```
Customer → Browses Providers → Books Service → Provider Confirms → Completed
```

**Backend API Contract:**
| Endpoint | Method | Auth | Request | Response |
|----------|--------|------|---------|----------|
| `/service-providers` | GET | No | `?city=&service=` | `{ success, data: ServiceProvider[] }` |
| `/service-bookings` | POST | No | `{ providerId, service, preferredDate, ... }` | `{ success, data: ServiceBooking }` |
| `/service-bookings` | GET | No | — | `{ success, data: ServiceBooking[] }` |

**UAT Test Cases:**
| ID | Test | Expected | Pass/Fail |
|----|------|----------|-----------|
| SVC-001 | List service providers | Providers returned | |
| SVC-002 | Book service | Booking created, status = PENDING | |
| SVC-003 | Filter providers by city | Only city providers | |

---

### 11. ADMIN DASHBOARD

**Workflow:**
```
Admin → Views Stats → Manages Vehicles/Leads/Dealers → Monitors Notifications → Provider Health
```

**Backend API Contract:**
| Endpoint | Method | Auth | Request | Response |
|----------|--------|------|---------|----------|
| `/admin/stats` | GET | ADMIN | — | `{ totalVehicles, customers, dealers, ... }` |
| `/admin/notifications/stats` | GET | ADMIN | — | `{ total, sent, delivered, failed, ... }` |
| `/admin/notifications` | GET | ADMIN | `?channel=&status=&provider=&page=` | `{ notifications, total, page }` |
| `/admin/notifications/:id` | GET | ADMIN | — | `{ notification }` |
| `/admin/notifications/provider-health` | GET | ADMIN | — | `{ providers, lastChecked }` |

**Web Implementation:**
- Page: `app/portal/admin/page.tsx`
- Components: `NotificationDashboard.tsx`, `ProviderHealthPanel.tsx`, `AdminPanel.tsx`, `LeadManager.tsx`

**UAT Test Cases:**
| ID | Test | Expected | Pass/Fail |
|----|------|----------|-----------|
| ADMIN-001 | View dashboard stats | Stats displayed | |
| ADMIN-002 | View notification dashboard | Counts, filters, table visible | |
| ADMIN-003 | Filter notifications | Correct filtered results | |
| ADMIN-004 | View notification detail | All fields displayed | |
| ADMIN-005 | View provider health | Health metrics displayed | |
| ADMIN-006 | Non-admin access denied | Redirect to dashboard | |

---

### 12. WISHLIST / FAVORITES

**Workflow:**
```
Customer → Browses Cars → Adds to Wishlist → Views Saved Cars → Removes
```

**Backend API Contract:**
| Endpoint | Method | Auth | Request | Response |
|----------|--------|------|---------|----------|
| `/favorites/:vehicleId` | POST | JWT | — | `{ success }` |
| `/favorites` | GET | JWT | — | `{ success, data: Vehicle[] }` |
| `/favorites/:vehicleId` | DELETE | JWT | — | `{ success }` |

**UAT Test Cases:**
| ID | Test | Expected | Pass/Fail |
|----|------|----------|-----------|
| FAV-001 | Add to favorites | Vehicle added | |
| FAV-002 | View favorites | Saved vehicles listed | |
| FAV-003 | Remove from favorites | Vehicle removed | |
| FAV-004 | Duplicate add | Idempotent (no error) | |

---

## Rate Limiting

| Endpoint | Limit | Window |
|----------|-------|--------|
| OTP Request | 5 | 15 min |
| OTP Verify | 10 | 15 min |
| Password Reset | 5 | 1 hour |
| SMS Send | 10 | 1 hour |
| Email Send | 30 | 1 hour |
| Preference Update | 20 | 1 hour |
| Notification API | 100 | 1 min |
| Webhook | 200 | 1 min |
| Admin Notification | 60 | 1 min |

## Security Checklist

- [ ] No API keys in frontend code
- [ ] No secrets in Git
- [ ] .env files gitignored
- [ ] JWT verification on all protected routes
- [ ] Role-based access control (ADMIN, DEALER, CUSTOMER)
- [ ] Rate limiting on sensitive endpoints
- [ ] Webhook signature verification
- [ ] Input validation on all endpoints
- [ ] User isolation (users can only see their own data)
- [ ] Admin-only monitoring endpoints
