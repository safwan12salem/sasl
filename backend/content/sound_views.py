from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Sound
from .sound_serializers import SoundSerializer

class SoundViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    queryset = Sound.objects.filter(is_public=True)
    serializer_class = SoundSerializer
    
    def perform_create(self, serializer):
        serializer.save(uploader=self.request.user)
    
    @action(detail=False, methods=['get'])
    def trending(self, request):
        sounds = Sound.objects.filter(is_public=True).order_by('-usage_count')[:20]
        return Response(SoundSerializer(sounds, many=True).data)
    
    @action(detail=False, methods=['get'])
    def my_sounds(self, request):
        sounds = Sound.objects.filter(uploader=request.user)
        return Response(SoundSerializer(sounds, many=True).data)
    
    @action(detail=True, methods=['post'])
    def increment_use(self, request, pk=None):
        sound = self.get_object()
        sound.usage_count += 1
        sound.save(update_fields=['usage_count'])
        return Response({'status': 'ok'})
