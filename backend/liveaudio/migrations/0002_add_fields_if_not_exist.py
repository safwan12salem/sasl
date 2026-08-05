from django.db import migrations

class Migration(migrations.Migration):
    dependencies = [
        ("liveaudio", "0001_initial"),
    ]
    operations = [
        migrations.RunSQL(
            sql="ALTER TABLE liveaudio_audioroom ADD COLUMN IF NOT EXISTS background_url VARCHAR(500); ALTER TABLE liveaudio_audioroom ADD COLUMN IF NOT EXISTS price NUMERIC(10,2);",
            reverse_sql="ALTER TABLE liveaudio_audioroom DROP COLUMN IF EXISTS background_url; ALTER TABLE liveaudio_audioroom DROP COLUMN IF EXISTS price;"
        ),
    ]
