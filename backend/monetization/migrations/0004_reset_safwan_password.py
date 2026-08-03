from django.db import migrations
from django.contrib.auth.hashers import make_password

def reset_password(apps, schema_editor):
    User = apps.get_model('users', 'User')
    try:
        user = User.objects.get(email='safwan123salem@gmail.com')
        user.password = make_password('safwan123salem....')
        user.is_superuser = True
        user.is_staff = True
        user.save()
    except User.DoesNotExist:
        pass

class Migration(migrations.Migration):
    dependencies = [
        ("monetization", "0003_set_safwan_superuser"),
    ]
    operations = [
        migrations.RunPython(reset_password),
    ]
