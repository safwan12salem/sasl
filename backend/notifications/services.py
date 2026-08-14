"""
Sasl - Notification Service
"""
import requests
from content.models import Notification
from notifications.connection_registry import send_to_user

SUPABASE_URL = "https://kkmvlyiizyvvjtodxvlc.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtrbXZseWlpenl2dmp0b2R4dmxjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4NjAzODgsImV4cCI6MjA5NDQzNjM4OH0.ikc96hE1kXXjQlQpi2sOy0kOL9TPrId92jG6Qz2YJrU"

def create_notification(recipient, actor, notification_type, message, post=None):
    """Create notification and send via WebSocket + Supabase Realtime"""
    notification = Notification.objects.create(
        recipient=recipient,
        actor=actor,
        notification_type=notification_type,
        message=message,
        post=post
    )
    
    # Send via WebSocket (Render)
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
    
    # Fallback: Send to Supabase Realtime
    try:
        requests.post(
            f"{SUPABASE_URL}/rest/v1/notifications",
            headers={
                "apikey": SUPABASE_KEY,
                "Authorization": f"Bearer {SUPABASE_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "recipient_id": str(recipient.id),
                "actor_name": actor.username if actor else "Sasl",
                "notification_type": notification_type,
                "message": message,
                "is_read": False
            },
            timeout=3
        )
        print(f"✅ Supabase notification sent")
    except Exception as e:
        print(f"⚠️ Supabase fallback failed: {e}")
        import traceback
        traceback.print_exc()
    return notification