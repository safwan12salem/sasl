from django.db import migrations, models

class Migration(migrations.Migration):
    dependencies = [
        ('liveaudio', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='audioroom',
            name='country',
            field=models.CharField(max_length=2, blank=True, default=''),
        ),
        migrations.AddField(
            model_name='audioroom',
            name='price',
            field=models.DecimalField(max_digits=10, decimal_places=2, default='0.00'),
        ),
    ]