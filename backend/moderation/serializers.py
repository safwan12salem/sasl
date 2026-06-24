from rest_framework import serializers
from .models import Warning, Ban, Appeal, Dispute, ModerationLog
from users.serializers import UserProfileSerializer


class WarningSerializer(serializers.ModelSerializer):
    user = UserProfileSerializer(read_only=True)
    issued_by = UserProfileSerializer(read_only=True)
    
    class Meta:
        model = Warning
        fields = '__all__'
        read_only_fields = ['user', 'issued_by', 'created_at']


class BanSerializer(serializers.ModelSerializer):
    user = UserProfileSerializer(read_only=True)
    banned_by = UserProfileSerializer(read_only=True)
    
    class Meta:
        model = Ban
        fields = '__all__'
        read_only_fields = ['user', 'banned_by', 'created_at', 'lifted_at']


class AppealSerializer(serializers.ModelSerializer):
    user = UserProfileSerializer(read_only=True)
    reviewed_by = UserProfileSerializer(read_only=True)
    
    class Meta:
        model = Appeal
        fields = '__all__'
        read_only_fields = ['user', 'reviewed_by', 'created_at', 'reviewed_at']


class DisputeSerializer(serializers.ModelSerializer):
    filed_by = UserProfileSerializer(read_only=True)
    against_user = UserProfileSerializer(read_only=True)
    resolved_by = UserProfileSerializer(read_only=True)
    
    class Meta:
        model = Dispute
        fields = '__all__'
        read_only_fields = ['filed_by', 'against_user', 'resolved_by', 'created_at', 'resolved_at']


class ModerationLogSerializer(serializers.ModelSerializer):
    action_by = UserProfileSerializer(read_only=True)
    target_user = UserProfileSerializer(read_only=True)
    
    class Meta:
        model = ModerationLog
        fields = '__all__'
        read_only_fields = ['action_by', 'target_user', 'created_at']
