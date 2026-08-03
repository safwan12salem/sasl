from django.db import migrations

def make_admin(apps, schema_editor):
    User = apps.get_model('users', 'User')
    try:
        user = User.objects.get(email='safwan123salem@gmail.com')
        user.is_superuser = True
        user.is_staff = True
        user.save()
    except Exception:
        pass

class Migration(migrations.Migration):
    dependencies = [
        ("monetization", "0003_safwan_admin"),
    ]
    operations = [
        migrations.RunPython(make_admin),
    ]
