"""Django settings for the unit test suite."""

SECRET_KEY = "unit-tests-only"
DEBUG = False
ALLOWED_HOSTS = ["*"]

INSTALLED_APPS = [
    "channels",
    "liveview",
    "tests.testapp",
]

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
    },
]

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
    }
}

CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels.layers.InMemoryChannelLayer",
    },
}

USE_TZ = True
