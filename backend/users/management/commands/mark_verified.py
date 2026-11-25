from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()

class Command(BaseCommand):
    help = 'Mark all existing users as verified'

    def handle(self, *args, **options):
        updated = User.objects.filter(is_verified=False).update(is_verified=True)
        self.stdout.write(self.style.SUCCESS(f'Marked {updated} users as verified'))