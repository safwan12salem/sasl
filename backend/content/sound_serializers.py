from rest_framework import serializers
from .models import Sound

class SoundSerializer(serializers.ModelSerializer):
    uploader_name = serializers.CharField(source='uploader.username', read_only=True)
    audio_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Sound
        fields = ['id', 'title', 'artist', 'audio_file', 'audio_url', 'duration',
                  'start_time', 'end_time', 'is_public', 'usage_count', 
                  'uploader_name', 'created_at']
        read_only_fields = ['uploader', 'usage_count']
    
    def get_audio_url(self, obj):
        if obj.audio_file:
            return obj.audio_file.url
        return None
