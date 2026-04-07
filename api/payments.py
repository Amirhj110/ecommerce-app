import stripe
from django.conf import settings
from django.views.decorators.csrf import csrf_exempt
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Order

stripe.api_key = settings.STRIPE_SECRET_KEY


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_payment_intent(request):
    """
    Creates a Stripe PaymentIntent for a given order.
    Expects: { "order_id": <int> }
    Returns: { "client_secret": "...", "publishable_key": "..." }
    """
    order_id = request.data.get('order_id')
    if not order_id:
        return Response({'error': 'order_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        order = Order.objects.get(id=order_id, user=request.user)
    except Order.DoesNotExist:
        return Response({'error': 'Order not found.'}, status=status.HTTP_404_NOT_FOUND)

    if order.status != 'pending':
        return Response(
            {'error': f'Order is already {order.status}. Cannot create a payment intent.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        # Convert total to cents (Stripe requires integer amounts)
        amount_cents = int(order.total * 100)

        intent = stripe.PaymentIntent.create(
            amount=amount_cents,
            currency='usd',
            metadata={
                'order_id': order.id,
                'order_number': order.order_number,
                'user_id': request.user.id,
            },
            description=f"Order {order.order_number}",
        )

        # Store the payment intent ID on the order
        order.stripe_payment_intent_id = intent['id']
        order.save(update_fields=['stripe_payment_intent_id'])

        return Response({
            'client_secret': intent['client_secret'],
            'publishable_key': settings.STRIPE_PUBLISHABLE_KEY,
            'amount': amount_cents,
            'currency': 'usd',
            'order_id': order.id,
            'order_number': order.order_number,
        })

    except stripe.error.StripeError as e:
        return Response({'error': str(e.user_message)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response({'error': 'Payment setup failed. Please try again.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@csrf_exempt
def stripe_webhook(request):
    """
    Handles Stripe webhook events.
    On payment_intent.succeeded → marks the order as paid.
    """
    payload = request.body
    sig_header = request.META.get('HTTP_STRIPE_SIGNATURE')
    webhook_secret = settings.STRIPE_WEBHOOK_SECRET

    try:
        event = stripe.Webhook.construct_event(payload, sig_header, webhook_secret)
    except ValueError:
        return HttpResponse(status=400)
    except stripe.error.SignatureVerificationError:
        return HttpResponse(status=400)

    if event['type'] == 'payment_intent.succeeded':
        intent = event['data']['object']
        order_id = intent.get('metadata', {}).get('order_id')
        try:
            order = Order.objects.get(id=order_id)
            if order.status == 'pending':
                order.status = 'paid'
                order.paid_at = timezone.now()
                order.save(update_fields=['status', 'paid_at'])
        except Order.DoesNotExist:
            pass

    elif event['type'] == 'payment_intent.payment_failed':
        intent = event['data']['object']
        order_id = intent.get('metadata', {}).get('order_id')
        # Log or notify — order remains 'pending' so user can retry
        print(f"[Stripe] Payment failed for order {order_id}")

    return HttpResponse(status=200)
