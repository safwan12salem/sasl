"""
Sasl - Social Asynchronous Sharing Layer
Tutoring: Advanced with materials, whiteboard, certificates, group classes
"""
from tutoring.models import TutoringChatMessage
from rest_framework import viewsets, permissions, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from django.db.models import Q, Avg
from django.utils import timezone
from .models import (
    TutorProfile, TutoringSession, SessionMaterial,
    WhiteboardSession, Certificate, TutoringChatMessage, SessionEnrollment
)
from .serializers import (
    TutorProfileSerializer, TutoringSessionSerializer,
    SessionMaterialSerializer, WhiteboardSerializer, CertificateSerializer,TutoringChatMessageSerializer
)
from monetization.services import process_subscription_payment, process_tutoring_payment
from notifications.services import create_notification
from django.contrib.auth import get_user_model
from monetization.transaction_validator import validate_tutoring_payment

User = get_user_model()


class TutorProfileViewSet(viewsets.ModelViewSet):
    queryset = TutorProfile.objects.select_related('user').all()
    serializer_class = TutorProfileSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [filters.SearchFilter]
    search_fields = ['subjects', 'user__username']

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
    
   
    @action(detail=False, methods=['get'])
    def top_rated(self, request):
        tutors = self.get_queryset().filter(
            is_available=True, rating__gte=4.0
        ).order_by('-rating')[:10]
        return Response(TutorProfileSerializer(tutors, many=True, context={'request': request}).data)

     

    @action(detail=False, methods=['patch'])
    def me(self, request):
        profile, created = TutorProfile.objects.get_or_create(user=request.user)
        profile.bio = request.data.get('bio', profile.bio)
        profile.certifications = request.data.get('certifications', profile.certifications)
        profile.linkedin_url = request.data.get('linkedin_url', profile.linkedin_url)
        profile.website_url = request.data.get('website_url', profile.website_url)
        profile.save()
        return Response(TutorProfileSerializer(profile).data)

     
class TutoringSessionViewSet(viewsets.ModelViewSet):
    queryset = TutoringSession.objects.select_related(
        'tutor', 'student'
    ).prefetch_related('materials').all()
    serializer_class = TutoringSessionSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['subject', 'tutor__username', 'student__username']
    ordering_fields = ['scheduled_at', 'price', 'status']

    def get_queryset(self):
        qs = super().get_queryset()
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        
        mine = self.request.query_params.get('mine')
        if mine == 'true':
            qs = qs.filter(Q(tutor=self.request.user) | Q(student=self.request.user))
        
        return qs
    

    @action(detail=True, methods=['post'])
    def request_booking(self, request, pk=None):
        session = self.get_object()
        message = request.data.get('message', '')
        
        if session.tutor == request.user:
            return Response({'error': 'Cannot book your own session'}, status=400)
        
        if session.is_group_class:
            if session.enrollments.filter(status='accepted').count() >= session.max_students:
                return Response({'error': 'Class is full'}, status=400)
            
            enrollment, created = SessionEnrollment.objects.get_or_create(
                session=session, student=request.user,
                defaults={'message': message, 'status': 'pending'}
            )
        else:
            if session.student:
                return Response({'error': 'Session already has a student'}, status=400)
            
            session.student = request.user
            session.status = 'pending_confirmation'
            session.save()
            enrollment = SessionEnrollment.objects.create(
                session=session, student=request.user, message=message, status='pending'
            )
        
        create_notification(
            recipient=session.tutor,
            actor=request.user,
            notification_type='booking_request',
            message=f'{request.user.username} requested to book your session "{session.subject}"'
        )
        return Response({'status': 'pending', 'message': message})

    @action(detail=True, methods=['get'])
    def booking_requests(self, request, pk=None):
        session = self.get_object()
        if session.tutor != request.user:
            return Response({'error': 'Only tutor can view requests'}, status=403)
        
        enrollments = session.enrollments.filter(status='pending')
        return Response([{
            'id': str(e.id),
            'student_username': e.student.username,
            'message': e.message,
            'created_at': e.created_at.isoformat()
        } for e in enrollments])
    
    @action(detail=True, methods=['post'])
    def respond_booking(self, request, pk=None):
        session = self.get_object()
        if session.tutor != request.user:
            return Response({'error': 'Only tutor can respond'}, status=403)
        
        enrollment_id = request.data.get('enrollment_id')
        action = request.data.get('action')
        
        try:
            enrollment = SessionEnrollment.objects.get(id=enrollment_id, session=session)
        except SessionEnrollment.DoesNotExist:
            return Response({'error': 'Request not found'}, status=404)
        
        if action == 'accept':
            enrollment.status = 'accepted'
            enrollment.save()
            
            # For 1-on-1: set student immediately
            if not session.is_group_class:
                session.student = enrollment.student
                session.status = 'ongoing'
            else:
                # For group class: check if full
                accepted_count = session.enrollments.filter(status='accepted').count()
                if accepted_count >= session.max_students:
                    session.status = 'ongoing'
            
            session.save()
            
            # If session is now ongoing, notify ALL accepted students
            if session.status == 'ongoing':
                for e in session.enrollments.filter(status='accepted'):
                    create_notification(
                        recipient=e.student,
                        actor=session.tutor,
                        notification_type='session_starting',
                        message=f'🎉 Your session "{session.subject}" is now LIVE! Join now!'
                    )
            
            return Response({'status': 'accepted', 'session_status': session.status})
        
        elif action == 'reject':
            enrollment.status = 'rejected'
            enrollment.save()
            return Response({'status': 'rejected'})
        
        return Response({'error': 'Invalid action'}, status=400)

    
    def perform_create(self, serializer):
        serializer.save(
            tutor=self.request.user,
            student=None,
            status='open'
        )

    @action(detail=True, methods=['post'])
    def confirm(self, request, pk=None):
        session = self.get_object()
        if session.tutor != request.user:
            return Response({'error': 'Only tutor can confirm'}, status=403)
        session.status = 'ongoing'
        session.save()
        return Response({'status': 'ongoing'})


    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        session = self.get_object()
        if session.tutor != request.user or session.status != 'ongoing':
            return Response({'error': 'Invalid state'}, status=400)
        
        if session.student:
            # Anti-fraud validation
            valid, error_response = validate_tutoring_payment(
                session.student, session.tutor, session.price, session.subject
            )
            if not valid:
                return error_response
            
            success = process_tutoring_payment(session.student, session.tutor, session.price, session.subject)
            if not success:
                return Response({'error': 'Payment failed'}, status=402)
        
        session.status = 'completed'
        session.save()
        
        # Generate certificate
        Certificate.objects.get_or_create(
            session=session,
            student=session.student or request.user,
            defaults={'tutor': session.tutor, 'subject': session.subject}
        )
        
        return Response({'status': 'completed and paid'})
    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        session = self.get_object()
        if session.tutor == request.user or (session.student and session.student == request.user):
            session.status = 'cancelled'
            session.save()
            return Response({'status': 'cancelled'})
        return Response({'error': 'Not authorized'}, status=403)

    @action(detail=True, methods=['post'])
    def upload_material(self, request, pk=None):
        session = self.get_object()
        if session.tutor != request.user:
            return Response({'error': 'Only tutor can upload materials'}, status=403)
        
        material = SessionMaterial.objects.create(
            session=session,
            title=request.data.get('title', 'Material'),
            file=request.FILES.get('file'),
            description=request.data.get('description', '')
        )
        return Response(SessionMaterialSerializer(material).data, status=201)

    @action(detail=True, methods=['get'])
    def materials(self, request, pk=None):
        session = self.get_object()
        materials = session.materials.all()
        return Response(SessionMaterialSerializer(materials, many=True).data)

    @action(detail=True, methods=['get'])
    def whiteboard(self, request, pk=None):
        session = self.get_object()
        whiteboard, created = WhiteboardSession.objects.get_or_create(session=session)
        return Response(WhiteboardSerializer(whiteboard).data)

    @action(detail=True, methods=['post'])
    def update_whiteboard(self, request, pk=None):
        session = self.get_object()
        whiteboard = WhiteboardSession.objects.get(session=session)
        whiteboard.data = request.data.get('data', whiteboard.data)
        whiteboard.save()
        return Response(WhiteboardSerializer(whiteboard).data)

    @action(detail=False, methods=['get'])
    def my_certificates(self, request):
        certificates = Certificate.objects.filter(student=request.user)
        return Response(CertificateSerializer(certificates, many=True).data)
    

    @action(detail=True, methods=['get', 'post'])
    def chat(self, request, pk=None):
        session = self.get_object()
        if request.method == 'GET':
            messages = TutoringChatMessage.objects.filter(session=session).order_by('created_at')[:100]
            return Response(TutoringChatMessageSerializer(messages, many=True).data)
        else:
            text = request.data.get('text', '')
            if not text.strip():
                return Response({'error': 'Text required'}, status=400)
            msg = TutoringChatMessage.objects.create(
                session=session, sender=request.user, text=text
            )
            return Response(TutoringChatMessageSerializer(msg).data, status=201)





    @action(detail=True, methods=['post'])
    def signal(self, request, pk=None):
        """Store WebRTC offer/answer for signaling"""
        session = self.get_object()
        session.signaling = request.data
        session.save()
        return Response({'status': 'stored'})

    @action(detail=True, methods=['get'])
    def get_signal(self, request, pk=None):
        """Retrieve WebRTC signaling data"""
        session = self.get_object()
        return Response(session.signaling or {})


    @action(detail=True, methods=['post'])
    def increment_view(self, request, pk=None):
        session = self.get_object()
        session.views_count = (session.views_count or 0) + 1
        session.save(update_fields=['views_count'])
        return Response({'views_count': session.views_count})

   

class TutoringChatViewSet(viewsets.ViewSet):
    """Dedicated tutoring chat - isolated from WaveMesh"""
    permission_classes = [permissions.IsAuthenticated]
    
    def list(self, request):
        room_id = request.query_params.get('room_id')
        if not room_id:
            return Response({'error': 'room_id required'}, status=400)
        messages = TutoringChatMessage.objects.filter(
            session_id=room_id
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
        
        msg = TutoringChatMessage.objects.create(
            session_id=room_id,
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
        message_id = request.data.get('message_id')
        text = request.data.get('text', '')
        if not message_id or not text.strip():
            return Response({'error': 'message_id and text required'}, status=400)
        try:
            msg = TutoringChatMessage.objects.get(id=message_id, sender=request.user)
            msg.text = text
            msg.is_edited = True
            msg.save()
            return Response({'id': str(msg.id), 'text': msg.text, 'is_edited': True})
        except TutoringChatMessage.DoesNotExist:
            return Response({'error': 'Message not found or not yours'}, status=404)

    def destroy(self, request, room_id=None):
        message_id = request.data.get('message_id')
        if not message_id:
            return Response({'error': 'message_id required'}, status=400)
        try:
            msg = TutoringChatMessage.objects.get(id=message_id, sender=request.user)
            msg.delete()
            return Response({'status': 'deleted'})
        except TutoringChatMessage.DoesNotExist:
            return Response({'error': 'Message not found or not yours'}, status=404)
