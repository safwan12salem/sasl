from django.db import migrations

class Migration(migrations.Migration):
    dependencies = [
        ('liveaudio', '0001_initial'),
    ]

    operations = [
        # Do nothing. The columns already exist in the database.
        migrations.RunSQL(
            sql='SELECT 1;',
            reverse_sql='SELECT 1;'
        ),
    ]