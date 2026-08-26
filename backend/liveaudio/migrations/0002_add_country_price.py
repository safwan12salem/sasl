from django.db import migrations, models

class Migration(migrations.Migration):
    dependencies = [
        ('liveaudio', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='audioroom',
            name='country',
            field=models.CharField(blank=True, default='', max_length=2),
        ),
        migrations.AddField(
            model_name='audioroom',
            name='price',
            field=models.DecimalField(blank=True, decimal_places=2, default=0, max_digits=10),
        ),
    ]