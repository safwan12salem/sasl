"""
Sasl Snap serializers — Enhanced with tips, challenges, groups
"""
from rest_framework import serializers
from .models import Snap, SnapStreak, SnapStory, SnapChallenge, SnapChallengeEntry, GroupSnapStreak, SnapTip
from users.serializers import UserProfileSerializer


class SnapSerializer(serializers.ModelSerializer):
    sender_name = serializers.ReadOnlyField(source='sender.username')
    receiver_name = serializers.ReadOnlyField(source='receiver.username')
    video_url = serializers.SerializerMethodField()
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = Snap
        fields = [
            'id','sender_name','receiver_name',
            'video', 'video_url', 'image', 'media_url','image_url',
            'caption', 'duration', 'viewed', 'viewed_at',
            'is_challenge', 'challenge_name', 'is_draft',
            'scheduled_for', 'tip_amount', 'screenshot_count', 'replay_count',
            'created_at'
        ]
        
    read_only_fields = ['sender', 'receiver', 'viewed', 'tip_amount', 'screenshot_count', 'replay_count']
    def get_video_url(self, obj):
        if obj.video and (request := self.context.get('request')):
            return obj.video.url if obj.video else None
        return obj.video.url if obj.video else None

    def get_image_url(self, obj):
        if obj.image and (request := self.context.get('request')):
            return obj.image.url if obj.image else None
        return obj.image.url if obj.image else None


class SnapStreakSerializer(serializers.ModelSerializer):
    other_user = serializers.SerializerMethodField()
    
    class Meta:
        model = SnapStreak
        fields = ['id', 'other_user', 'current_streak', 'longest_streak', 'last_snap_date', 'total_reward_earned']
    
    def get_other_user(self, obj):
        request = self.context.get('request')
        if request and request.user:
            other = obj.user2 if obj.user1 == request.user else obj.user1
            return other.username
        return None


class SnapStorySerializer(serializers.ModelSerializer):
    user = UserProfileSerializer(read_only=True)
    media_url = serializers.URLField(required=False, allow_blank=True)
    class Meta:
        model = SnapStory
        fields = ['id', 'user', 'media', 'media_url', 'caption', 'sound_track', 'sound_url', 'views_count', 'tip_total', 'expires_at', 'created_at']
        read_only_fields = ['user', 'views_count', 'tip_total']
    
    def get_media_url(self, obj):
      return obj.media_url if obj.media_url else (obj.media.url if obj.media else None)

class SnapChallengeSerializer(serializers.ModelSerializer):
    entries_count = serializers.SerializerMethodField()
    
    class Meta:
        model = SnapChallenge
        fields = ['id', 'name', 'description', 'prize_pool', 'starts_at', 'ends_at', 'min_participants', 'entries_count', 'created_at']
    
    def get_entries_count(self, obj):
        return obj.entries.count()


class GroupSnapStreakSerializer(serializers.ModelSerializer):
    member_count = serializers.SerializerMethodField()
    
    class Meta:
        model = GroupSnapStreak
        fields = ['id', 'name', 'member_count', 'current_streak', 'longest_streak', 'last_snap_date', 'total_reward_earned', 'created_at']
    
    def get_member_count(self, obj):
        return obj.members.count()


class SnapTipSerializer(serializers.ModelSerializer):
    sender_name = serializers.ReadOnlyField(source='sender.username')
    
    class Meta:
        model = SnapTip
        fields = ['id', 'sender', 'sender_name', 'snap', 'story', 'amount', 'message', 'created_at']