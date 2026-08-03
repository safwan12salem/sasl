from django.core.management.base import BaseCommand
from users.models import User

class Command(BaseCommand):
    help = 'Creates superuser owner account'

    def handle(self, *args, **options):
        email = 'safwan123salem@gmail.com'
        password = 'Sasl2026Owner!'
        
        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                'username': 'safwan',
                'is_superuser': True,
                'is_staff': True,
                'is_active': True,
            }
        )
        
        if not created:
            user.is_superuser = True
            user.is_staff = True
        
        user.set_password(password)
        user.save()
        
        self.stdout.write(self.style.SUCCESS(f'Owner ready: {email} / {password}'))