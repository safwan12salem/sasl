"""
Sasl - Notification Service
"""
from content.models import Notification
from notifications.connection_registry import send_to_user


def create_notification(recipient, actor, notification_type, message, post=None):
    """Create notification and send via WebSocket"""
    notification = Notification.objects.create(
        recipient=recipient,
        actor=actor,
        notification_type=notification_type,
        message=message,
        post=post
    )
    
    # Send real-time notification directly to connected WebSocket clients
    print(f"🔔 NOTIFICATION CREATED: {notification.id} for {recipient.username}")
    send_to_user(str(recipient.id), {
        'type': 'new_notification',
        'notification': {
            'id': str(notification.id),
            'type': notification_type,
            'message': message,
            'actor': actor.username if actor else 'Sasl',
            'post_id': str(post.id) if post else None,
            'created_at': notification.created_at.isoformat(),
            'is_read': False
        }
    })
    print(f"📤 DIRECT SENT to user {recipient.username}")
    return notification