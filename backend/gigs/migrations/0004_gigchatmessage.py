from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('gigs', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='GigChatMessage',
            fields=[
                ('id', models.UUIDField(primary_key=True, serialize=False)),
                ('content', models.TextField()),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
        ),
    ]
