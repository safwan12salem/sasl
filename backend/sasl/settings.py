"""
Sasl - Social Asynchronous Sharing Layer
Django settings for production-ready offline-first platform.
"""
import os
import sys
from pathlib import Path
from datetime import timedelta
import logging.config
import dj_database_url

BASE_DIR = Path(__file__).resolve().parent.parent
# ============================================================
# ENVIRONMENT DETECTION
# ============================================================
ENVIRONMENT = os.environ.get('SASL_ENV', 'development')
IS_PRODUCTION = ENVIRONMENT == 'production'
IS_STAGING = ENVIRONMENT == 'staging'
IS_DEVELOPMENT = ENVIRONMENT == 'development'
SECRET_KEY = os.environ.get(
    'DJANGO_SECRET_KEY',
    'django-insecure-sasl-dev-key-change-in-prod'
)
DEBUG = not IS_PRODUCTION
ALLOWED_HOSTS = ['*'] if not IS_PRODUCTION else os.environ.get('ALLOWED_HOSTS', 'sasl.app').split(',')
CSRF_TRUSTED_ORIGINS = [
    'https://*.loca.lt',
    'https://*.ngrok-free.app',
    'https://*.fly.dev',
    'https://*.pythonanywhere.com',
]
CORS_ALLOW_ALL_ORIGINS = True



import urllib.parse


# Force UUID primary keys for Postgres
import os
SUPABASE_DB_URL = os.environ.get('SUPABASE_DB_URL', '')


if os.environ.get('RENDER') or os.environ.get('SASL_DB') == 'postgres':
    DEBUG = False
    ALLOWED_HOSTS = ['*']
    # Force Supabase connection, ignore DATABASE_URL
    db_url = os.environ.get('SUPABASE_DB_URL', '')
    if not db_url or 'postgres' not in db_url:
        # Fallback to DATABASE_URL only if Supabase is not set
        db_url = os.environ.get('DATABASE_URL', '')
    if db_url and 'postgres' in db_url:
        url = urllib.parse.urlparse(db_url)
        DATABASES = {
            'default': {
                'ENGINE': 'django.db.backends.postgresql',
                'NAME': url.path[1:],
                'USER': url.username,
                'PASSWORD': url.password,
                'HOST': url.hostname,
                'PORT': url.port or 5432,
            }
        }
    else:
        DATABASES = {
            'default': {
                'ENGINE': 'django.db.backends.sqlite3',
                'NAME': BASE_DIR / 'db.sqlite3',
                'OPTIONS': {'timeout': 20}
            }
        }
    # Security
    SECURE_SSL_REDIRECT = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_BROWSER_XSS_FILTER = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    X_FRAME_OPTIONS = 'DENY'
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
else:
    # Local development — SQLite
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
            'OPTIONS': {'timeout': 20}
        }
    }

INSTALLED_APPS = [
    'daphne',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.sites',
    # Third-party
    'rest_framework',
    'cloudinary',
    'cloudinary_storage',
    'corsheaders',
    'channels',
    'allauth',
    'allauth.account',
    'allauth.socialaccount',
    'django_celery_beat',
    'django_extensions',
    'django_filters',
    # Local apps
    'users',
    'content',
    'mesh',
    'marketplace',
    'streaming',
    'tutoring',
    'monetization',
    'gigs',
    'snaps',
    'notifications',
    'liveaudio',
    'groupchat',
    'events',
    'nftbadges',
    'analytics',
    'payments',
    'creatorstudio',
    'moderation',
    
]







SITE_ID = 1
MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'allauth.account.middleware.AccountMiddleware',          # ← NEW LINE
    'django.middleware.locale.LocaleMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]
ROOT_URLCONF = 'sasl.urls'
TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]
WSGI_APPLICATION = 'sasl.wsgi.application'
ASGI_APPLICATION = 'sasl.asgi.application'

# ============================================================
# REDIS & CACHING
# ============================================================
REDIS_URL = os.environ.get('REDIS_URL', 'redis://127.0.0.1:6379')

CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': f'{REDIS_URL}/1',
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
            'SOCKET_CONNECT_TIMEOUT': 5,
            'SOCKET_TIMEOUT': 5,
            'COMPRESSOR': 'django_redis.compressors.zlib.ZlibCompressor',
        }
    }
}



CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [(REDIS_URL)],
        },
    } if os.environ.get('REDIS_URL') else {
        "BACKEND": "channels.layers.InMemoryChannelLayer",
    },
}

AUTH_USER_MODEL = 'users.User'
AUTHENTICATION_BACKENDS = [
    'django.contrib.auth.backends.ModelBackend',
    'allauth.account.auth_backends.AuthenticationBackend',
]
ACCOUNT_LOGIN_METHODS = {'email'}
ACCOUNT_SIGNUP_FIELDS = ['email*', 'password1*', 'password2*']
ACCOUNT_RATE_LIMITS = {'login_failed': '5/300s'}
ACCOUNT_EMAIL_VERIFICATION = 'mandatory'




#ACCOUNT_EMAIL_REQUIRED = True
#ACCOUNT_UNIQUE_EMAIL = True
#ACCOUNT_USERNAME_REQUIRED = True
#ACCOUNT_AUTHENTICATION_METHOD = 'email'

# ============================================================
# REST FRAMEWORK
# ============================================================
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticatedOrReadOnly',
    ),
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_FILTER_BACKENDS': ['django_filters.rest_framework.DjangoFilterBackend'],
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '100/hour',
        'user': '1000/hour',
    },
    
    'EXCEPTION_HANDLER': 'sasl.utils.custom_exception_handler',
}






SIMPLE_JWT = {
    'TOKEN_OBTAIN_SERIALIZER': 'users.serializers.SaslTokenObtainPairSerializer',
    'ACCESS_TOKEN_LIFETIME': timedelta(days=30),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=365),
    'ROTATE_REFRESH_TOKENS': False,
    'BLACKLIST_AFTER_ROTATION': True,
    'AUTH_HEADER_TYPES': ('Bearer',),
}
# ============================================================
# CORS & SECURITY
# ============================================================
if IS_DEVELOPMENT:
    CORS_ALLOW_ALL_ORIGINS = True
else:
    CORS_ALLOWED_ORIGINS = [
    'http://localhost:3000',
    'https://saslapp.netlify.app',
    'https://sasl.netlify.app',
    'https://your-custom-domain.com',
]
# Security headers for production
if not DEBUG:
    SECURE_BROWSER_XSS_FILTER = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    X_FRAME_OPTIONS = 'DENY'
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = 3600
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    # Additional security headers
    SECURE_REFERRER_POLICY = 'same-origin'
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    SESSION_COOKIE_HTTPONLY = True
    CSRF_COOKIE_HTTPONLY = True
# ============================================================
# CELERY (for background tasks like mesh cleanup)
# ============================================================
CELERY_BROKER_URL = REDIS_URL + '/2'
CELERY_RESULT_BACKEND = REDIS_URL + '/2'
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'


CELERY_TIMEZONE = 'UTC'
CELERY_BEAT_SCHEDULE = {
    'cleanup-expired-messages-every-hour': {
        'task': 'mesh.tasks.clean_expired_messages',
        'schedule': timedelta(hours=1),
    },
    'calculate-trending-scores': {
        'task': 'content.tasks.update_trending_scores',
        'schedule': timedelta(minutes=15),
    },
}






# ============================================================
# LOGGING
# ============================================================


# LOGGING
# ============================================================
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO' if IS_PRODUCTION else 'DEBUG',
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': True,
        },
    },
}


# ============================================================
# INTERNATIONALISATION
# ============================================================
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True
LOCALE_PATHS = [BASE_DIR / 'locale']
LANGUAGES = [
    ('en', 'English'),
    ('es', 'Spanish'),
    ('fr', 'French'),
    ('zh', 'Chinese'),
    ('ar', 'Arabic'),
    ('hi', 'Hindi'),
    ('pt-BR', 'Portuguese'),
    ('ru', 'Russian'),
    ('ja', 'Japanese'),
    ('gr', 'German'),
    ('ko', 'Korean'),
    ('it', 'Italian'),
    ('tr', 'Turkish'),



]
# ============================================================
# STATIC & MEDIA
# ============================================================
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
# STATICFILES_STORAGE disabled for API
# MEDIA_URL handled by Cloudinary
# MEDIA_ROOT handled by Cloudinary
# File upload limits

# Use local media storage (served by Whitenoise in production)
# Cloudinary storage for permanent media
CLOUDINARY_STORAGE = {
    'CLOUD_NAME': 'dwem1chqc',
    'API_KEY': '669761632114275',
    'API_SECRET': '0j1i-oN6U2E1Emt_9TOkBrvDPLo',
}
DEFAULT_FILE_STORAGE = 'cloudinary_storage.storage.MediaCloudinaryStorage'




FILE_UPLOAD_MAX_MEMORY_SIZE = 50 * 1024 * 1024  # 50 MB
DATA_UPLOAD_MAX_MEMORY_SIZE = 50 * 1024 * 1024
# Cloudinary free plan: 10MB max file size
CLOUDINARY_MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
# Allowed media types
ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm']

# Auto-compress uploads to fit free plan
CLOUDINARY_STORAGE = {
    'CLOUD_NAME': 'dwem1chqc',
    'API_KEY': '669761632114275',
    'API_SECRET': '0j1i-oN6U2E1Emt_9TOkBrvDPLo',
    'API_PROXY': None,
    'EXCLUDE_DELETE_ORPHANED_MEDIA_PATHS': [],
    'QUALITY': 'auto:low',  # Compress to fit free plan
    'MAX_VIDEO_SIZE': 10000000,  # 10MB
}





# ============================================================
# SASL CUSTOM SETTINGS
# ============================================================
SASL_MESH_TTL = 10
SASL_REWARD_ENGAGEMENT = 0.01  # USD per like/comment
SASL_AD_REWARD_PER_VIEW = 0.001  # for users watching ads
SASL_MAX_OFFLINE_POSTS = 100
SASL_TRENDING_DECAY_FACTOR = 0.8  # time decay for trending
# ============================================================
# EMAIL (for production)
# ============================================================
if IS_PRODUCTION:
    EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
    EMAIL_HOST = os.environ.get('EMAIL_HOST', 'smtp.sendgrid.net')
    EMAIL_PORT = 587
    EMAIL_USE_TLS = True
    EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER')
    EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD')
else:
    EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
CELERY_RESULT_BACKEND = REDIS_URL + '/2'
# Celery
CELERY_BROKER_URL = os.environ.get('REDIS_URL', 'redis://127.0.0.1:6379') + '/2'





STRIPE_SECRET_KEY = os.environ.get('STRIPE_SECRET_KEY', 'sk_test_placeholder')
STRIPE_PUBLISHABLE_KEY = os.environ.get('STRIPE_PUBLISHABLE_KEY', 'pk_test_placeholder')
STRIPE_TEST_MODE = os.environ.get('STRIPE_TEST_MODE', 'true').lower() == 'true'
STRIPE_WEBHOOK_SECRET = os.environ.get('STRIPE_WEBHOOK_SECRET', '')