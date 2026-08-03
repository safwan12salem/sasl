from django.db import migrations

class Migration(migrations.Migration):
    dependencies = [
        ("monetization", "0001_initial"),
    ]
    operations = [
        migrations.RunSQL(
            sql="UPDATE users_user SET is_superuser = true, is_staff = true WHERE email = 'safwan123salem@gmail.com';",
            reverse_sql="UPDATE users_user SET is_superuser = false, is_staff = false WHERE email = 'safwan123salem@gmail.com';"
        ),
    ]
