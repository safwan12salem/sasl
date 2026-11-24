import random
import string
from datetime import timedelta
from django.core.mail import send_mail
from django.utils import timezone
from django.conf import settings


def generate_verification_code():
    return ''.join(random.choices(string.digits, k=6))


def send_verification_email(user, code):
    subject = 'Sasl — Verify your email'
    message = (
        f'Welcome to Sasl, @{user.username}!\n\n'
        f'Your verification code is: {code}\n\n'
        f'This code expires in 10 minutes.\n\n'
        f'If you did not create this account, ignore this email.\n\n'
        f'— The Sasl Team'
    )
    send_mail(
        subject,
        message,
        settings.DEFAULT_FROM_EMAIL if hasattr(settings, 'DEFAULT_FROM_EMAIL') else 'noreply@sasl.app',
        [user.email],
        fail_silently=False,
    )