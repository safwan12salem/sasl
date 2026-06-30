from django.apps import AppConfig
from django.db.models.signals import post_migrate


def create_default_categories(sender, **kwargs):
    from marketplace.models import ProductCategory
    from django.utils.text import slugify
    defaults = [
        'Electronics', 'Clothing', 'Home & Garden', 'Sports', 'Books',
        'Art', 'Music', 'Food', 'Services', 'Vehicles', 'Other'
    ]
    for name in defaults:
        ProductCategory.objects.get_or_create(
            name=name,
            defaults={'slug': slugify(name)}
        )


class MarketplaceConfig(AppConfig):
    name = "marketplace"

    def ready(self):
        post_migrate.connect(create_default_categories, sender=self)