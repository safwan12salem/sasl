"""
Sasl - Social Asynchronous Sharing Layer
Marketplace serializers with reviews, wishlist, ratings
"""
from rest_framework import serializers
from .models import Product, Order, ProductCategory, ProductReview, Wishlist, ProductImage
from users.serializers import UserProfileSerializer 


class CategorySerializer(serializers.ModelSerializer):
    product_count = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = ProductCategory
        fields = ['id', 'name', 'slug',  'product_count']


class ProductReviewSerializer(serializers.ModelSerializer):
    reviewer_name = serializers.ReadOnlyField(source='reviewer.username')
    reviewer_avatar = serializers.SerializerMethodField()
    
    class Meta:
        model = ProductReview
        fields = ['id', 'reviewer_name', 'reviewer_avatar', 'rating', 'comment', 'created_at']
    
    def get_reviewer_avatar(self, obj):
        if obj.reviewer.avatar and (request := self.context.get('request')):
            return obj.reviewer.avatar.url if obj.reviewer.avatar else None
        return None


class ProductImageSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()
    
    class Meta:
        model = ProductImage
        fields = ['id', 'image', 'image_url', 'order']
    
    def get_image_url(self, obj):
        return obj.image.url if obj.image else None




class ProductSerializer(serializers.ModelSerializer):
    seller_name = serializers.ReadOnlyField(source='seller.username')
    seller_avatar = serializers.SerializerMethodField()
    seller_rating = serializers.ReadOnlyField(source='seller.seller_rating')
    image = serializers.ImageField(required=False, allow_null=True)
    image_url = serializers.SerializerMethodField()
    category_name = serializers.ReadOnlyField(source='category.name')
    reviews = ProductReviewSerializer(many=True, read_only=True)
    average_rating = serializers.DecimalField(max_digits=3, decimal_places=1, read_only=True)
    review_count = serializers.IntegerField(read_only=True)
    images = ProductImageSerializer(many=True, read_only=True)
    is_wishlisted = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            'id', 'seller', 'seller_name', 'seller_avatar', 'seller_rating',
            'title', 'description', 'price', 'currency',
            'category', 'category_name', 'image', 'image_url','images',
            'stock', 'sales_count', 'is_active', 'is_wishlisted',
            'average_rating', 'review_count', 'reviews',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['seller', 'is_active', 'sales_count', 'created_at', 'updated_at']

    def get_image_url(self, obj):
        if obj.image and (request := self.context.get('request')):
            return obj.image.url if obj.image else None
        return obj.image.url if obj.image else None

    def get_seller_avatar(self, obj):
        if obj.seller.avatar and (request := self.context.get('request')):
            return obj.seller.avatar.url if obj.seller.avatar else None
        return None

    def get_is_wishlisted(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return Wishlist.objects.filter(user=request.user, product=obj).exists()
        return False




class OrderSerializer(serializers.ModelSerializer):
    buyer_name = serializers.ReadOnlyField(source='buyer.username')
    product_title = serializers.ReadOnlyField(source='product.title')
    product_image = serializers.SerializerMethodField()
    seller_name = serializers.ReadOnlyField(source='product.seller.username')

    class Meta:
        model = Order
        fields = [
            'id', 'buyer', 'buyer_name', 'product', 'product_title',
            'product_image', 'seller_name', 'quantity', 'total_price',
            'status', 'shipped_at', 'delivered_at', 'created_at'
        ]
        read_only_fields = ['buyer', 'total_price']

    def get_product_image(self, obj):
        if obj.product.image and (request := self.context.get('request')):
            return obj.product.image.url if obj.product.image else None
        return None


class WishlistSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)
    product_id = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.all(), write_only=True, source='product'
    )

    class Meta:
        model = Wishlist
        fields = ['id', 'product', 'product_id', 'added_at']
        read_only_fields = ['user']