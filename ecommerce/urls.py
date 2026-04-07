from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView, TokenBlacklistView

from api import views
from api.payments import create_payment_intent, stripe_webhook

# ─── Router ───────────────────────────────────────────────────────────────────
router = DefaultRouter()
router.register(r'products', views.ProductViewSet, basename='product')
router.register(r'categories', views.CategoryViewSet, basename='category')
router.register(r'cart', views.CartViewSet, basename='cart')
router.register(r'orders', views.OrderViewSet, basename='order')
router.register(r'reviews', views.ReviewViewSet, basename='review')

# Nested variant router: /api/products/{product_pk}/variants/
from rest_framework_nested import routers as nested_routers

products_router = nested_routers.NestedSimpleRouter(router, r'products', lookup='product')
products_router.register(r'variants', views.ProductVariantViewSet, basename='product-variants')

urlpatterns = [
    # Django Admin
    path('admin/', admin.site.urls),

    # ── Auth routes ──────────────────────────────────────────────────────────
    path('api/auth/register/', views.RegisterView.as_view(), name='register'),
    path('api/auth/login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/auth/logout/', TokenBlacklistView.as_view(), name='token_blacklist'),
    path('api/auth/me/', views.MeView.as_view(), name='me'),

    # ── Payment routes ───────────────────────────────────────────────────────
    path('api/payments/create-intent/', create_payment_intent, name='create_payment_intent'),
    path('api/payments/webhook/', stripe_webhook, name='stripe_webhook'),

    # ── API routes ───────────────────────────────────────────────────────────
    path('api/', include(router.urls)),
    path('api/', include(products_router.urls)),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)