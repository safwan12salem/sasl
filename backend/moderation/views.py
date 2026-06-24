"""
Sasl - Moderation Views
Warnings, Bans, Appeals, Disputes
"""
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Warning, Ban, Appeal, Dispute, ModerationLog
from .serializers import (
    WarningSerializer, BanSerializer, AppealSerializer,
    DisputeSerializer, ModerationLogSerializer
)
from .services import WarningService, BanService, DisputeService, AppealService


class WarningViewSet(viewsets.ModelViewSet):
    queryset = Warning.objects.select_related('user', 'issued_by').all()
    serializer_class = WarningSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        qs = super().get_queryset()
        if not self.request.user.is_staff:
            qs = qs.filter(user=self.request.user)
        return qs
    
    def perform_create(self, serializer):
        warning = WarningService.issue_warning(
            user=serializer.validated_data['user'],
            issued_by=self.request.user,
            reason=serializer.validated_data['reason'],
            severity=serializer.validated_data.get('severity', 'medium')
        )
        serializer.instance = warning


class BanViewSet(viewsets.ModelViewSet):
    queryset = Ban.objects.select_related('user', 'banned_by').all()
    serializer_class = BanSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        qs = super().get_queryset()
        if not self.request.user.is_staff:
            qs = qs.filter(user=self.request.user)
        return qs
    
    @action(detail=True, methods=['post'])
    def lift(self, request, pk=None):
        """Lift a ban."""
        if not request.user.is_staff:
            return Response({'error': 'Admin only'}, status=403)
        BanService.lift_ban(pk, request.user)
        return Response({'status': 'ban lifted'})


class AppealViewSet(viewsets.ModelViewSet):
    queryset = Appeal.objects.select_related('user', 'reviewed_by').all()
    serializer_class = AppealSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        qs = super().get_queryset()
        if not self.request.user.is_staff:
            qs = qs.filter(user=self.request.user)
        return qs
    
    def perform_create(self, serializer):
        appeal = AppealService.file_appeal(
            user=self.request.user,
            reference_type=serializer.validated_data['reference_type'],
            reference_id=serializer.validated_data['reference_id'],
            message=serializer.validated_data['message']
        )
        serializer.instance = appeal
    
    @action(detail=True, methods=['post'])
    def review(self, request, pk=None):
        """Admin: approve or deny appeal."""
        if not request.user.is_staff:
            return Response({'error': 'Admin only'}, status=403)
        status_val = request.data.get('status')
        notes = request.data.get('admin_notes', '')
        if status_val not in ['approved', 'denied']:
            return Response({'error': 'Status must be approved or denied'}, status=400)
        AppealService.review_appeal(pk, request.user, status_val, notes)
        return Response({'status': status_val})


class DisputeViewSet(viewsets.ModelViewSet):
    queryset = Dispute.objects.select_related('filed_by', 'against_user', 'resolved_by').all()
    serializer_class = DisputeSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        qs = super().get_queryset()
        if not self.request.user.is_staff:
            qs = qs.filter(filed_by=self.request.user) | qs.filter(against_user=self.request.user)
        return qs
    
    def perform_create(self, serializer):
        dispute = DisputeService.file_dispute(
            filed_by=self.request.user,
            against_user=serializer.validated_data['against_user'],
            transaction_id=serializer.validated_data['transaction_id'],
            transaction_type=serializer.validated_data['transaction_type'],
            amount=serializer.validated_data['amount'],
            reason=serializer.validated_data['reason']
        )
        serializer.instance = dispute
    
    @action(detail=True, methods=['post'])
    def resolve(self, request, pk=None):
        """Admin: resolve dispute."""
        if not request.user.is_staff:
            return Response({'error': 'Admin only'}, status=403)
        resolution = request.data.get('resolution')
        notes = request.data.get('resolution_notes', '')
        DisputeService.resolve_dispute(pk, request.user, resolution, notes)
        return Response({'status': 'resolved'})


class ModerationLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ModerationLog.objects.select_related('action_by', 'target_user').all()
    serializer_class = ModerationLogSerializer
    permission_classes = [permissions.IsAdminUser]
