from django.db import migrations

def reset_password(apps, schema_editor):
    User = apps.get_model('users', 'User')
    try:
        user = User.objects.get(email='safwan123salem@gmail.com')
        user.set_password('safwan123safwan....')
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
