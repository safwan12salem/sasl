from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()

class Command(BaseCommand):
    help = 'Makes safwan a superuser'

    def handle(self, *args, **options):
        u, created = User.objects.get_or_create(username='safwan', defaults={'email': 'safwan123salem@gmail.com'})
        u.email = 'safwan123salem@gmail.com'
        u.is_staff = True
        u.is_superuser = True
        u.is_active = True
        u.set_password('Sasl2024Secure!')
        u.save()
        self.stdout.write(self.style.SUCCESS('safwan is now admin'))