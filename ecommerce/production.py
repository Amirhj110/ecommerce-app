from .settings import *
import os
import dj_database_url

# Security settings
DEBUG = False
ALLOWED_HOSTS = ['yourusername.pythonanywhere.com', 'www.yourusername.pythonanywhere.com']

# Database - Use MySQL or PostgreSQL on PythonAnywhere
# For PythonAnywhere, use MySQL
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': 'yourusername$ecommerce',
        'USER': 'yourusername',
        'PASSWORD': 'yourpassword',
        'HOST': 'yourusername.mysql.pythonanywhere-services.com',
        'PORT': '3306',
    }
}

# Static files
STATIC_URL = '/static/'
STATIC_ROOT = '/home/yourusername/E-Commerce/staticfiles'
STATICFILES_DIRS = [
    os.path.join(BASE_DIR, 'static'),
]

# Media files
MEDIA_URL = '/media/'
MEDIA_ROOT = '/home/yourusername/E-Commerce/media'

# Security
SECURE_SSL_REDIRECT = False  # Set to True if using HTTPS
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False

# Logging
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'file': {
            'level': 'DEBUG',
            'class': 'logging.FileHandler',
            'filename': '/home/yourusername/E-Commerce/debug.log',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['file'],
            'level': 'DEBUG',
            'propagate': True,
        },
    },
}