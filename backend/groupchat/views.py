from django.utils import timezone
from tokenize import group
from urllib import request

from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from .models import GroupChat, GroupMessage, GroupInvite
from .serializers import GroupChatSerializer, GroupMessageSerializer, GroupInviteSerializer
from notifications.services import create_notification
from django.db.models import Q
User = get_user_model()

class GroupChatViewSet(viewsets.ModelViewSet):
    queryset = GroupChat.objects.all()
    serializer_class = GroupChatSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        group = serializer.save(creator=self.request.user)
        group.members.add(self.request.user)

    def get_queryset(self):
        user = self.request.user
        return GroupChat.objects.filter(
            Q(members=user) | Q(is_private=False) | Q(creator=user)
        ).distinct()

    @action(detail=True, methods=['get'])
    def messages(self, request, pk=None):
        group = self.get_object()
        # Auto-join public groups on first message fetch
        if not group.is_private and request.user not in group.members.all():
            group.members.add(request.user)
        if request.user not in group.members.all():
            return Response({'error': 'Not a member'}, status=403)
        msgs = group.messages.all().order_by('created_at')[:100]
        return Response(GroupMessageSerializer(msgs, many=True).data)
    @action(detail=True, methods=['post'])
    def send_message(self, request, pk=None):
      group = self.get_object()
      if request.user not in group.members.all() and group.is_private:
          return Response({'error': 'Not a member'}, status=403)
    
      text = request.data.get('text', '')
      image = request.FILES.get('image')
      video = request.FILES.get('video')
    
      message = GroupMessage.objects.create(
          group=group,
          sender=request.user,
          text=text,
          image=image,
          message_type='video' if video else ('image' if image else 'text')
      )
      if video:
        message.video = video
        message.save()
    
      return Response(GroupMessageSerializer(message).data, status=201)
    @action(detail=True, methods=['post'])
    def add_member(self, request, pk=None):
        group = self.get_object()
        username = request.data.get('username')
        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=404)
        group.members.add(user)
        create_notification(
            recipient=user,
            actor=request.user,
            notification_type='group_invite',
            message=f'{request.user.username} added you to group "{group.name}"'
        )
        return Response({'status': 'added'})


    @action(detail=True, methods=['post'])
    def request_join(self, request, pk=None):
        group = self.get_object()
        if not group.is_private:
            group.members.add(request.user)
            return Response({'status': 'joined'})
        
        create_notification(
            recipient=group.creator,
            actor=request.user,
            notification_type='group_join_request',
            message=f'{request.user.username} wants to join "{group.name}"'
        )
        return Response({'status': 'request_sent'})

    @action(detail=True, methods=['post'])
    def approve_join(self, request, pk=None):
        group = self.get_object()
        if request.user != group.creator:
            return Response({'error': 'Only group creator can approve'}, status=403)
        username = request.data.get('username')
        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=404)
        group.members.add(user)
        return Response({'status': 'approved'})

      
    @action(detail=True, methods=['post'])
    def leave(self, request, pk=None):
        group = self.get_object()
        group.members.remove(request.user)
        return Response({'status': 'left'})

    @action(detail=True, methods=['post'])
    def invite(self, request, pk=None):
        group = self.get_object()
        username = request.data.get('username')
        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=404)
        invite, created = GroupInvite.objects.get_or_create(
            group=group,
            invited_by=request.user,
            invited_user=user
        )
        if created:
            create_notification(
                recipient=user,
                actor=request.user,
                notification_type='group_invite',
                message=f'{request.user.username} invited you to group "{group.name}"'
            )
        return Response(GroupInviteSerializer(invite).data)
    


    @action(detail=True, methods=['post'])
    def edit_message(self, request, pk=None):
      """Edit a message in the group"""
      group = self.get_object()
      message_id = request.data.get('message_id')
      new_text = request.data.get('text', '')
    
      if not message_id:
          return Response({'error': 'message_id required'}, status=400)
    
      try:
        message = GroupMessage.objects.get(id=message_id, group=group, sender=request.user)
        message.text = new_text
        message.is_edited = True
        message.edited_at = timezone.now()
        message.save()
        return Response(GroupMessageSerializer(message).data)
      except GroupMessage.DoesNotExist:
        return Response({'error': 'Message not found or not yours'}, status=404)


    @action(detail=True, methods=['post'])
    def delete_message(self, request, pk=None):
      """Delete a message from the group"""
      group = self.get_object()
      message_id = request.data.get('message_id')
      delete_for_everyone = request.data.get('for_everyone', False)
    
      if not message_id:
        return Response({'error': 'message_id required'}, status=400)
    
      try:
          message = GroupMessage.objects.get(id=message_id, group=group)
        
          if message.sender != request.user and not delete_for_everyone:
             return Response({'error': 'Can only delete your own messages'}, status=403)
        
          message.delete()
          return Response({'status': 'deleted'})
      except GroupMessage.DoesNotExist:
        return Response({'error': 'Message not found'}, status=404)


    @action(detail=True, methods=['post'])
    def edit_reaction(self, request, pk=None):
      """Edit or remove a reaction on a message"""
      group = self.get_object()
      message_id = request.data.get('message_id')
      reaction = request.data.get('reaction', '')
    
      if not message_id:
        return Response({'error': 'message_id required'}, status=400)
    
      try:
        message = GroupMessage.objects.get(id=message_id, group=group)
        
        # Toggle reaction
        existing = message.reactions.filter(user=request.user, reaction=reaction).first()
        if existing:
            existing.delete()
            return Response({'status': 'removed'})
        else:
            message.reactions.create(user=request.user, reaction=reaction)
            return Response({'status': 'added'})
      except GroupMessage.DoesNotExist:
        return Response({'error': 'Message not found'}, status=404)


    @action(detail=True, methods=['post'])
    def send_voice(self, request, pk=None):
      """Send a voice message to the group"""
      group = self.get_object()
      audio_file = request.FILES.get('audio')
      duration = request.data.get('duration', 0)
    
      if not audio_file:
        return Response({'error': 'Audio file required'}, status=400)
    
      message = GroupMessage.objects.create(
        group=group,
        sender=request.user,
        text='',
        audio=audio_file,
        audio_duration=int(duration) if duration else 0,
        message_type='voice'
    )
    
      return Response(GroupMessageSerializer(message).data, status=201)