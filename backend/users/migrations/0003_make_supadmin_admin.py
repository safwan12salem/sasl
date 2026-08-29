from django.db import migrations
from django.contrib.auth.hashers import make_password

def make_admin(apps, schema_editor):
    User = apps.get_model('users', 'User')
    try:
        user = User.objects.get(username='supadmin')
    except User.DoesNotExist:
        user = User.objects.create(
            username='supadmin',
            email='supadmin@sasl.com',
            password=make_password('Sasl2024Secure!'),
        )
    user.is_staff = True
    user.is_superuser = True
    user.is_active = True
    user.save()

class Migration(migrations.Migration):
    dependencies = [
        ('users', '0001_initial'),  # adjust to latest users migration
    ]

    operations = [
        migrations.RunPython(make_admin),
    ]