"""
Sasl - Social Asynchronous Sharing Layer
Marketplace: Advanced filtering, wishlist, seller reviews, nearby mesh discovery
"""
from django.shortcuts import get_object_or_404
from marketplace.models import MarketplaceChatMessage
from rest_framework import viewsets, permissions, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from django.db.models import Q, Avg, Count, F
from .models import Product, Order, ProductCategory, ProductReview, Wishlist, ProductImage
from .serializers import (
    ProductSerializer, OrderSerializer, CategorySerializer,
    ProductReviewSerializer, WishlistSerializer
)
from users.models import Wallet
from monetization.services import process_marketplace_purchase
from notifications.services import create_notification
from django.contrib.auth import get_user_model
from django.utils import timezone

from datetime import timedelta
from monetization.transaction_validator import validate_marketplace_purchase

from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
import json as json_lib

User = get_user_model()


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.filter(is_active=True).select_related(
        'seller', 'category'
    ).prefetch_related('reviews')
    serializer_class = ProductSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'description', 'seller__username']
    ordering_fields = ['price', 'created_at', 'average_rating', 'sales_count']
    ordering = ['-created_at']

    def get_queryset(self):
        qs = super().get_queryset()
        
        # Category filter
        category = self.request.query_params.get('category')
        if category:
            qs = qs.filter(category__slug=category)
        
        # Price range
        min_price = self.request.query_params.get('min_price')
        max_price = self.request.query_params.get('max_price')
        if min_price:
            qs = qs.filter(price__gte=min_price)
        if max_price:
            qs = qs.filter(price__lte=max_price)
        
        # Seller filter
        seller = self.request.query_params.get('seller')
        if seller:
            qs = qs.filter(seller__username=seller)
        
        # In stock only
        in_stock = self.request.query_params.get('in_stock')
        if in_stock == 'true':
            qs = qs.filter(stock__gt=0)

        country = self.request.query_params.get('country', '')
        if country and country != 'default':
            qs = qs.filter(country=country)
        
        return qs

    def perform_create(self, serializer):
       product = serializer.save(seller=self.request.user)
    # Handle additional images
       additional_images = self.request.FILES.getlist('additional_images')
       for idx, img in enumerate(additional_images):
         ProductImage.objects.create(product=product, image=img, order=idx + 1)

    @action(detail=False, methods=['get'])
    def my_products(self, request):
        products = Product.objects.filter(seller=request.user).select_related('category')
        return Response(ProductSerializer(products, many=True, context={'request': request}).data)

    @action(detail=True, methods=['post'])
    def purchase(self, request, pk=None):
        product = self.get_object()
        if product.seller == request.user:
            return Response({'error': 'Cannot buy your own product'}, status=400)
        if product.stock < 1:
            return Response({'error': 'Out of stock'}, status=400)
        
        quantity = int(request.data.get('quantity', 1))
        if quantity > product.stock:
            return Response({'error': 'Not enough stock'}, status=400)

        total = product.price * quantity
        
        # Anti-fraud validation
        valid, error_response = validate_marketplace_purchase(
            request.user, product.seller, total, product.title
        )
        if not valid:
            return error_response
        
        success = process_marketplace_purchase(request.user, product.seller, total, product.title)
        if not success:
            return Response({'error': 'Insufficient wallet balance'}, status=402)

        with transaction.atomic():
            product.stock -= quantity
            product.sales_count = (product.sales_count or 0) + quantity
            if product.stock == 0:
                product.is_active = False
            product.save()
            
            order = Order.objects.create(
                buyer=request.user,
                product=product,
                quantity=quantity,
                total_price=total,
                status='paid',  # Paid but in escrow
                escrow_held=True,
                auto_release_at=timezone.now() + timedelta(days=7)
            )
        
        create_notification(
            recipient=product.seller,
            actor=request.user,
            notification_type='purchase',
            message=f'{request.user.username} purchased {quantity}x {product.title} for ${total} (held in escrow)'
        )
        
        return Response({'status': 'purchased', 'order_id': str(order.id), 'message': 'Funds held in escrow until delivery confirmation'})
    

    @action(detail=True, methods=['post'])
    def request_purchase(self, request, pk=None):
        """Buyer requests to buy — seller must approve."""
        product = self.get_object()
        if product.seller == request.user:
            return Response({'error': 'Cannot buy your own product'}, status=400)
        

        existing = Order.objects.filter(buyer=request.user, product=product, status='pending').exists()
        if existing:
            return Response({'error': 'You already have a pending request for this product'}, status=400)
        # Create order with pending status
        order = Order.objects.create(
            buyer=request.user,
            product=product,
            quantity=1,
            total_price=product.price,
            status='pending'
        )
        create_notification(
            recipient=product.seller,
            actor=request.user,
            notification_type='purchase_request',
            message=f'{request.user.username} wants to buy "{product.title}" for ${product.price}'
        )
        return Response({'status': 'requested', 'order_id': order.id})

    @action(detail=True, methods=['post'])
    def approve_purchase(self, request, pk=None):
        """Seller approves purchase — payment processed."""
        product = self.get_object()
        if product.seller != request.user:
            return Response({'error': 'Only seller can approve'}, status=403)
        
        order_id = request.data.get('order_id')
        order = Order.objects.get(id=order_id, product=product, status='pending')
        
        total = order.total_price
        # Hold funds from buyer (escrow)
        success = process_marketplace_purchase(order.buyer, product.seller, float(total), product.title)
        if not success:
            order.status = 'cancelled'
            order.save()
            return Response({'error': 'Insufficient buyer balance'}, status=402)

        # Release escrow to seller immediately (seller approved = delivery confirmed)
        from monetization.services import release_marketplace_escrow
        release_marketplace_escrow(str(order.id))
        
        order.status = 'paid'
        order.save()
        product.stock -= order.quantity
        product.save()
        return Response({'status': 'approved'})

    
    @action(detail=True, methods=['post'])
    def confirm_delivery(self, request, pk=None):
        """Buyer confirms delivery — releases escrow to seller."""
        order = get_object_or_404(Order, id=pk, buyer=request.user)
        if order.status != 'paid':
            return Response({'error': 'Order not in escrow'}, status=400)
        
        from monetization.services import release_marketplace_escrow
        success = release_marketplace_escrow(pk)
        
        if success:
            create_notification(
                recipient=order.product.seller,
                actor=request.user,
                notification_type='escrow_released',
                message=f'💰 Escrow released for {order.product.title} — ${order.total_price}'
            )
            return Response({'status': 'delivered', 'message': 'Escrow released to seller'})
        return Response({'error': 'Release failed'}, status=500)

    @action(detail=True, methods=['post'])
    def review(self, request, pk=None):
        product = self.get_object()
        if ProductReview.objects.filter(product=product, reviewer=request.user).exists():
            return Response({'error': 'Already reviewed this product'}, status=400)
        
        review = ProductReview.objects.create(
            product=product,
            reviewer=request.user,
            rating=request.data.get('rating', 5),
            comment=request.data.get('comment', '')
        )
        
        # Update product average rating
        product.update_average_rating()
        
        return Response(ProductReviewSerializer(review).data, status=201)

    @action(detail=False, methods=['get'])
    def trending(self, request):
        """Products trending this week based on sales"""
        week_ago = timezone.now() - timezone.timedelta(days=7)
        qs = self.get_queryset().filter(
            orders__created_at__gte=week_ago
        ).annotate(
            recent_sales=Count('orders')
        ).order_by('-recent_sales')[:20]
        return Response(ProductSerializer(qs, many=True, context={'request': request}).data)

    @action(detail=False, methods=['get'])
    def nearby(self, request):
        """Products from nearby users via mesh (placeholder for geolocation)"""
        # In production, would filter by geolocation from mesh network
        qs = self.get_queryset().order_by('?')[:10]
        return Response(ProductSerializer(qs, many=True, context={'request': request}).data)

    @action(detail=False, methods=['get'])
    def recommended(self, request):
        """AI-recommended products based on purchase history"""
        user = request.user
        # Get categories user bought from
        bought_categories = Order.objects.filter(
            buyer=user
        ).values_list('product__category', flat=True).distinct()
        
        if bought_categories:
            qs = self.get_queryset().filter(
                category__in=bought_categories
            ).exclude(seller=user).order_by('-average_rating')[:12]
        else:
            qs = self.get_queryset().order_by('-average_rating')[:12]
        
        return Response(ProductSerializer(qs, many=True, context={'request': request}).data)

    @action(detail=True, methods=['post'])
    def toggle_wishlist(self, request, pk=None):
     product = self.get_object()
     wishlist_item, created = Wishlist.objects.get_or_create(
        user=request.user, product=product
     )
     if not created:
        wishlist_item.delete()
        return Response({'status': 'removed'})
     return Response({'status': 'added'})


    @action(detail=True, methods=['post'])
    def increment_view(self, request, pk=None):
        product = self.get_object()
        product.views_count = (product.views_count or 0) + 1
        product.save(update_fields=['views_count'])
        return Response({'views_count': product.views_count})
    
class WishlistViewSet(viewsets.ModelViewSet):
    serializer_class = WishlistSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Wishlist.objects.filter(user=self.request.user).select_related('product')

    def perform_create(self, serializer):
       product = serializer.save(seller=self.request.user)
    # Handle additional images
       additional_images = self.request.FILES.getlist('additional_images')
       for idx, img in enumerate(additional_images):
         ProductImage.objects.create(product=product, image=img, order=idx + 1)
    @action(detail=False, methods=['post'])
    def toggle(self, request):
        product_id = request.data.get('product_id')
        if not product_id:
            return Response({'error': 'product_id required'}, status=400)
        
        wishlist_item = Wishlist.objects.filter(
            user=request.user, product_id=product_id
        ).first()
        
        if wishlist_item:
            wishlist_item.delete()
            return Response({'status': 'removed'})
        else:
            Wishlist.objects.create(user=request.user, product_id=product_id)
            return Response({'status': 'added'}, status=201)


class OrderViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = Order.objects.filter(
            Q(buyer=user) | Q(product__seller=user)
        ).select_related('product', 'buyer', 'product__seller').order_by('-created_at')
        
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        
        return qs

    @action(detail=True, methods=['post'])
    def mark_shipped(self, request, pk=None):
        order = self.get_object()
        if order.product.seller != request.user:
            return Response({'error': 'Not your product'}, status=403)
        order.status = 'shipped'
        order.shipped_at = timezone.now()
        order.save()
        
        create_notification(
            recipient=order.buyer,
            actor=request.user,
            notification_type='order_shipped',
            message=f'Your order of "{order.product.title}" has been shipped!'
        )
        return Response({'status': 'shipped'})

    @action(detail=True, methods=['post'])
    def mark_delivered(self, request, pk=None):
        order = self.get_object()
        if order.buyer != request.user:
            return Response({'error': 'Not your order'}, status=403)
        order.status = 'delivered'
        order.delivered_at = timezone.now()
        order.save()
        return Response({'status': 'delivered'})




class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ProductCategory.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [permissions.AllowAny]
    
    def get_queryset(self):
        return ProductCategory.objects.annotate(
            product_count=Count('products', filter=Q(products__is_active=True))
        )
    





class MarketplaceChatViewSet(viewsets.ViewSet):
    """Dedicated marketplace chat - isolated from WaveMesh"""
    permission_classes = [permissions.IsAuthenticated]
    
    def list(self, request, room_id=None):
        messages = MarketplaceChatMessage.objects.filter(
            room_id=room_id
        ).order_by('created_at')[:100]
        return Response([{
            'id': str(m.id),
            'sender_name': m.sender.username,
            'text': m.text,
            'file_url': m.file_url or None,
            'file_name': m.file_name or None,
            'is_edited': m.is_edited or False,
            'created_at': m.created_at.isoformat(),
        } for m in messages])
  
    def create(self, request, room_id=None):
        text = request.data.get('text', '')
        file_url = request.data.get('file_url', '')
        file_name = request.data.get('file_name', '')
        
        if not text.strip() and not file_url:
            return Response({'error': 'Text or file required'}, status=400)
        
        msg = MarketplaceChatMessage.objects.create(
            room_id=room_id,
            sender=request.user,
            text=text,
        )
        
        # If file was uploaded, store the URL
        if file_url:
            msg.file_url = file_url
            msg.file_name = file_name
            msg.save()
        
        return Response({
            'id': str(msg.id),
            'sender_name': msg.sender.username,
            'text': msg.text,
            'file_url': file_url or None,
            'file_name': file_name or None,
            'created_at': msg.created_at.isoformat(),
        }, status=201)

    def partial_update(self, request, room_id=None):
        from .models import MarketplaceChatMessage
        message_id = request.data.get('message_id')
        text = request.data.get('text', '')
        if not message_id or not text.strip():
            return Response({'error': 'message_id and text required'}, status=400)
        try:
            msg = MarketplaceChatMessage.objects.get(id=message_id, sender=request.user)
            msg.text = text
            msg.is_edited = True
            msg.save()
            return Response({'id': str(msg.id), 'text': msg.text, 'is_edited': True})
        except MarketplaceChatMessage.DoesNotExist:
            return Response({'error': 'Message not found or not yours'}, status=404)

    def destroy(self, request, room_id=None):
        from .models import MarketplaceChatMessage
        message_id = request.data.get('message_id')
        if not message_id:
            return Response({'error': 'message_id required'}, status=400)
        try:
            msg = MarketplaceChatMessage.objects.get(id=message_id, sender=request.user)
            msg.delete()
            return Response({'status': 'deleted'})
        except MarketplaceChatMessage.DoesNotExist:
            return Response({'error': 'Message not found or not yours'}, status=404)    