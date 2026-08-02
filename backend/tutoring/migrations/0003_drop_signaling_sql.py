from django.db import migrations

class Migration(migrations.Migration):
    dependencies = [
        ("tutoring", "0002_tutoringsession_background_image"),
    ]
    operations = [
        migrations.RunSQL(
            sql='ALTER TABLE tutoring_tutoringsession DROP COLUMN IF EXISTS signaling;',
            reverse_sql='ALTER TABLE tutoring_tutoringsession ADD COLUMN signaling JSONB NULL;'
        ),
    ]