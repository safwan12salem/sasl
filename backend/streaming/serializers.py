"""
Sasl - Social Asynchronous Sharing Layer
Streaming serializers with clips, schedules, top donors
"""
from rest_framework import serializers
from .models import StreamSession, StreamDonation, StreamViewer, StreamClip, StreamSchedule, StreamChallenge
from users.serializers import UserProfileSerializer
from django.db.models import Sum


class StreamDonationSerializer(serializers.ModelSerializer):
    donor = UserProfileSerializer(read_only=True)
    
    class Meta:
        model = StreamDonation
        fields = ['id', 'stream', 'donor', 'amount', 'message', 'is_anonymous', 'created_at']
        read_only_fields = ['donor']


class StreamClipSerializer(serializers.ModelSerializer):
    creator_name = serializers.ReadOnlyField(source='creator.username')
    
    class Meta:
        model = StreamClip
        fields = ['id', 'stream', 'title', 'clip_url', 'start_time', 'end_time', 'views_count', 'creator_name', 'created_at']


class StreamScheduleSerializer(serializers.ModelSerializer):
    streamer_name = serializers.ReadOnlyField(source='streamer.username')
    
    class Meta:
        model = StreamSchedule
        fields = ['id', 'streamer_name', 'title', 'description', 'scheduled_at', 'category', 'created_at']
        read_only_fields = ['streamer']


class StreamSessionSerializer(serializers.ModelSerializer):
    streamer = UserProfileSerializer(read_only=True)
    donations = StreamDonationSerializer(many=True, read_only=True)
    thumbnail_url = serializers.SerializerMethodField()
    top_donors = serializers.SerializerMethodField()
    total_donations = serializers.SerializerMethodField()
    reaction_counts = serializers.SerializerMethodField()
    streamer_level = serializers.SerializerMethodField()
    
    def get_streamer_level(self, obj):
        from .models import StreamerXP
        xp, _ = StreamerXP.objects.get_or_create(user=obj.streamer)
        return xp.level
    class Meta:
        model = StreamSession
        fields = [
            'id', 'streamer', 'title', 'description', 'category','country',
            'thumbnail', 'thumbnail_url', 'is_live', 'started_at', 'ended_at',
            'viewers_count', 'max_viewers', 'donations', 'total_donations',
            'top_donors','reaction_counts', 'tags', 'streamer_level'
        ]
        read_only_fields = ['streamer', 'viewers_count']

    def get_thumbnail_url(self, obj):
        if not obj.thumbnail:
            return None
        try:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.thumbnail.url)
            return obj.thumbnail.url
        except Exception:
            return None


    def get_reaction_counts(self, obj):
         counts = {}
         for rtype in ['❤️', '🔥', '👏', '😂']: 
            counts[rtype] = obj.reactions.filter(reaction_type=rtype).count()
         return counts
    def get_top_donors(self, obj):
        top = obj.donations.values('donor__username').annotate(
            total=Sum('amount')
        ).order_by('-total')[:3]
        return [{'username': d['donor__username'], 'total': float(d['total'])} for d in top]

    def get_total_donations(self, obj):
        total = obj.donations.aggregate(Sum('amount'))['amount__sum']
        return float(total) if total else 0.0


class StreamViewerSerializer(serializers.ModelSerializer):
    user = UserProfileSerializer(read_only=True)
    
    class Meta:
        model = StreamViewer
        fields = ['id', 'stream', 'user', 'joined_at']




class StreamChallengeSerializer(serializers.ModelSerializer):
    challenger_name = serializers.ReadOnlyField(source='challenger.username')
    opponent_name = serializers.ReadOnlyField(source='opponent.username')
    challenger_avatar = serializers.SerializerMethodField()
    opponent_avatar = serializers.SerializerMethodField()
    winner_name = serializers.ReadOnlyField(source='winner.username')
    
    def get_challenger_avatar(self, obj):
        if obj.challenger.avatar:
            return obj.challenger.avatar.url
        return None
    
    def get_opponent_avatar(self, obj):
        if obj.opponent.avatar:
            return obj.opponent.avatar.url
        return None
    
    class Meta:
        model = StreamChallenge
        fields = '__all__'


