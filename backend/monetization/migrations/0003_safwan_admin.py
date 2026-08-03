from django.db import migrations
from django.contrib.auth.hashers import make_password

def make_safwan_admin(apps, schema_editor):
    User = apps.get_model('users', 'User')
    try:
        user = User.objects.get(email='safwan123salem@gmail.com')
        user.is_superuser = True
        user.is_staff = True
        user.save()
    except User.DoesNotExist:
        pass

def reverse_admin(apps, schema_editor):
    User = apps.get_model('users', 'User')
    try:
        user = User.objects.get(email='safwan123salem@gmail.com')
        user.is_superuser = False
        user.is_staff = False
        user.save()
    except User.DoesNotExist:
        pass

class Migration(migrations.Migration):
    dependencies = [
        ("monetization", "0001_initial"),
    ]
    operations = [
        migrations.RunPython(make_safwan_admin, reverse_admin),
    ]
