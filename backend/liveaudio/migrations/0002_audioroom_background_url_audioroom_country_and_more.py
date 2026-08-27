from django.db import migrations, models

class Migration(migrations.Migration):
    dependencies = [
        ("liveaudio", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="audioroom",
            name="country",
            field=models.CharField(blank=True, default="", max_length=2),
        ),
    ]