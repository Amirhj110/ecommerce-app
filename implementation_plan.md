# Headless E-Commerce: Full-Stack Architecture Overhaul

## Background

After analyzing the existing Django project, here is the current state:

| Component | Status |
|---|---|
| `api/models.py` | ✅ Well-structured — Category, Product, ProductImage, Cart, CartItem, Order, OrderItem, Review models all exist |
| `api/views.py` | ✅ Good foundation — ViewSets for all resources, register_user endpoint |
| `api/serializers.py` | ✅ Solid — correct nested serializers, custom validation |
| `ecommerce/settings.py` | ✅ `rest_framework_simplejwt` already installed & configured |
| `ecommerce/urls.py` | ✅ JWT token routes already wired |
| `ecommerce/production.py` | ⚠️ Targets PythonAnywhere/MySQL — needs Railway/PostgreSQL overhaul |
| CORS | ❌ Missing — `django-cors-headers` not installed |
| Stripe/Payment | ❌ Missing — no payment intent flow |
| Product Variants | ❌ Missing — no Size/Color variant model |
| Whitenoise | ❌ Missing for Railway static files |
| Procfile | ❌ Missing for Railway |
| Frontend | ❌ Does not exist yet |

---

## User Review Required

> [!IMPORTANT]
> **GitHub Pages URL**: The CORS configuration needs your GitHub username to whitelist `https://<yourname>.github.io`. Provide this once the frontend is deployed, or I will use a placeholder.

> [!WARNING]
> **Stripe Keys**: I will add a Stripe payment intent endpoint. You **must** set `STRIPE_SECRET_KEY` and `STRIPE_PUBLISHABLE_KEY` in your Railway environment variables before going live. Placeholder values will be used in `.env`.

> [!IMPORTANT]
> **Database Migration**: Adding `ProductVariant` requires a new migration. The existing SQLite `db.sqlite3` will need to be migrated. I will generate the migration but **not** auto-apply it so you can verify first.

---

## New API Structure

```
BASE_URL: http://localhost:8000/api/

AUTH
  POST  /api/auth/register/        → Register new user, returns JWT tokens
  POST  /api/auth/login/           → Obtain JWT access + refresh tokens
  POST  /api/auth/token/refresh/   → Refresh access token
  GET   /api/auth/me/              → Get current user profile (IsAuthenticated)

PRODUCTS
  GET   /api/products/             → List all products (filter, search, paginate)
  POST  /api/products/             → Create product (seller only)
  GET   /api/products/{id}/        → Product detail with images, variants, reviews
  PUT   /api/products/{id}/        → Update product (seller only)
  DELETE /api/products/{id}/       → Delete product (seller only)
  GET   /api/products/{id}/variants/ → List variants for a product
  POST  /api/products/{id}/upload_image/ → Upload product image

CATEGORIES
  GET   /api/categories/           → List all categories with product_count
  POST  /api/categories/           → Create category (staff only)

CART
  GET   /api/cart/                 → Get user's cart (IsAuthenticated)
  POST  /api/cart/add_item/        → Add item + validate stock
  POST  /api/cart/remove_item/     → Remove item by product_id
  POST  /api/cart/update_quantity/ → Update item quantity
  DELETE /api/cart/clear/          → Clear entire cart

ORDERS
  GET   /api/orders/               → List user's orders
  POST  /api/orders/               → Create order from cart (validates stock atomically)
  GET   /api/orders/{id}/          → Order detail with items
  POST  /api/orders/{id}/cancel/   → Cancel pending order, restores stock
  POST  /api/orders/{id}/mark_paid/ → Admin: mark order paid

PAYMENTS (Stripe)
  POST  /api/payments/create-intent/  → Create Stripe PaymentIntent, returns client_secret
  POST  /api/payments/webhook/        → Stripe webhook handler

REVIEWS
  GET   /api/reviews/              → List reviews (filter by ?product=ID)
  POST  /api/reviews/              → Create review (IsAuthenticated, 10/hr throttle)
  PATCH /api/reviews/{id}/         → Update own review
  DELETE /api/reviews/{id}/        → Delete own review
```

---

## Proposed Changes

### Backend — Dependency & Config Layer

#### [MODIFY] [requirements.txt](file:///c:/Users/aamer/Desktop/E-Commerce/requirements.txt)
Add: `stripe`, `django-cors-headers`, `whitenoise`, `dj-database-url`, `psycopg2-binary`

#### [MODIFY] [ecommerce/settings.py](file:///c:/Users/aamer/Desktop/E-Commerce/ecommerce/settings.py)
- Add `corsheaders` to `INSTALLED_APPS`
- Add `CorsMiddleware` before `CommonMiddleware`
- Add `CORS_ALLOWED_ORIGINS` list (GitHub Pages + localhost)
- Add `STATIC_ROOT`, `WHITENOISE_USE_FINDERS`
- Add Stripe key reads from env
- Switch DB to use `dj_database_url` with SQLite fallback for dev

#### [MODIFY] [ecommerce/production.py](file:///c:/Users/aamer/Desktop/E-Commerce/ecommerce/production.py)
Completely rewrite to target Railway.com:
- PostgreSQL via `DATABASE_URL` env var
- `ALLOWED_HOSTS` read from env
- `SECURE_SSL_REDIRECT = True`
- Whitenoise middleware for static files
- Remove all PythonAnywhere references

#### [NEW] [Procfile](file:///c:/Users/aamer/Desktop/E-Commerce/Procfile)
```
web: gunicorn ecommerce.wsgi --log-file -
release: python manage.py migrate
```

#### [MODIFY] [runtime.txt](file:///c:/Users/aamer/Desktop/E-Commerce/runtime.txt)
Ensure `python-3.12.x` (Railway compatible)

#### [MODIFY] [.env](file:///c:/Users/aamer/Desktop/E-Commerce/.env)
Add Stripe keys, DATABASE_URL placeholder, CORS origins

---

### Backend — Models Layer

#### [MODIFY] [api/models.py](file:///c:/Users/aamer/Desktop/E-Commerce/api/models.py)
- Add `ProductVariant` model (size, color, sku, stock, price_modifier)
- Add `stripe_payment_intent_id` to `Order`
- Add `country` field to `Order` shipping address
- Keep all existing models intact

---

### Backend — API Layer

#### [MODIFY] [api/serializers.py](file:///c:/Users/aamer/Desktop/E-Commerce/api/serializers.py)
- Add `ProductVariantSerializer`
- Extend `ProductDetailSerializer` to include variants
- Add `MeSerializer` for user profile
- Add `RegisterSerializer` with JWT token response
- Update `OrderCreateSerializer` to accept `variant_id`

#### [MODIFY] [api/views.py](file:///c:/Users/aamer/Desktop/E-Commerce/api/views.py)
- Add `ProductVariantViewSet`
- Add `MeView` (GET/PATCH for current user profile)
- Refactor `register_user` → `RegisterView` (returns tokens on success)
- Add `PaymentIntentView` (creates Stripe PaymentIntent)
- Add `StripeWebhookView` (handles `payment_intent.succeeded`)
- Improve `ProductViewSet.get_queryset()` to filter by `is_active=True`

#### [MODIFY] [ecommerce/urls.py](file:///c:/Users/aamer/Desktop/E-Commerce/ecommerce/urls.py)
- Move auth routes under `/api/auth/` prefix
- Add `/api/auth/me/`, `/api/auth/register/`
- Add `/api/payments/` routes
- Register `ProductVariantViewSet`

#### [NEW] [api/payments.py](file:///c:/Users/aamer/Desktop/E-Commerce/api/payments.py)
Stripe payment intent and webhook logic.

---

### Frontend — Vite + React + TypeScript

#### [NEW] `/frontend/` directory
Initialize with: `npm create vite@latest . -- --template react-ts`

Then install:
- `tailwindcss` + `@tailwindcss/forms`
- `axios`
- `zustand` (for cart + auth state)
- `react-router-dom`
- `react-hot-toast` (notifications)
- `@tanstack/react-query` (data fetching)
- `lucide-react` (icons)

#### Key Frontend Files

| File | Purpose |
|---|---|
| `src/lib/api.ts` | Axios instance with JWT interceptors (auto-refresh) |
| `src/store/authStore.ts` | Zustand auth store (login, logout, persist) |
| `src/store/cartStore.ts` | Zustand cart store (add, remove, sync with API) |
| `src/pages/HomePage.tsx` | Hero + featured products grid |
| `src/pages/ShopPage.tsx` | Filter sidebar + product grid + search |
| `src/pages/ProductPage.tsx` | Images, variants selector, add to cart, reviews |
| `src/pages/CartPage.tsx` | Cart items, totals, proceed to checkout |
| `src/pages/CheckoutPage.tsx` | Multi-step: Shipping → Payment (Stripe Elements) → Confirm |
| `src/pages/AuthPage.tsx` | Login / Register tabs |
| `src/pages/OrdersPage.tsx` | User order history |
| `src/components/Navbar.tsx` | Glassmorphism navbar with cart badge |
| `src/components/ProductCard.tsx` | Animated product card |

**UI Theme**: "Modern Minimalist Luxury"
- Color Palette: Near-black `#0a0a0a` base, `#f5f0eb` warm white, gold accent `#c9a96e`
- Typography: `Cormorant Garamond` (headings) + `Inter` (body)
- Effects: Frosted glass navbar, subtle grain textures, smooth fade-in animations

---

### Deployment — CI/CD

#### [NEW] [.github/workflows/deploy-fe.yml](file:///c:/Users/aamer/Desktop/E-Commerce/.github/workflows/deploy-fe.yml)
GitHub Actions workflow:
1. Checkout code
2. `npm install` in `/frontend`
3. `npm run build` → outputs to `/frontend/dist`
4. Deploy `/frontend/dist` to `gh-pages` branch

---

## Open Questions - UPDATED

> [!IMPORTANT]
> 1. **GitHub Username**: `amirhj110` ✅
> 2. **Stripe or PayPal?**: Stripe ✅
> 3. **Product Variants Migration**: Auto-apply enabled ✅
> 4. **Repo Name**: `ecommerce-app` ✅


---

## Verification Plan

### Automated Checks
- After backend changes: `python manage.py check` — should pass with 0 errors
- After frontend scaffold: `npm run build` — must compile without TypeScript errors

### Manual Verification
- Start Django dev server: `python manage.py runserver`
- Visit `http://localhost:8000/api/` — DRF browsable API should show all routes
- Start frontend: `cd frontend && npm run dev`
- Verify glassmorphism navbar, product grid, and routing between pages
- Test JWT auth flow: Register → Login → `/api/auth/me/` returns user data

