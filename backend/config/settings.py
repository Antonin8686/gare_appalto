import os

from datetime import timedelta

from pathlib import Path



from dotenv import load_dotenv



load_dotenv()



BASE_DIR = Path(__file__).resolve().parent.parent



SECRET_KEY = os.getenv("SECRET_KEY", "django-insecure-dev-key-change-me")

DEBUG = os.getenv("DEBUG", "True").lower() in ("true", "1", "yes")

ALLOWED_HOSTS = [

    host.strip()

    for host in os.getenv("ALLOWED_HOSTS", "localhost,127.0.0.1").split(",")

    if host.strip()

]



INSTALLED_APPS = [

    "django.contrib.admin",

    "django.contrib.auth",

    "django.contrib.contenttypes",

    "django.contrib.sessions",

    "django.contrib.messages",

    "django.contrib.staticfiles",

    "corsheaders",

    "rest_framework",

    "rest_framework_simplejwt",

    "rest_framework_simplejwt.token_blacklist",

    "storages",

    "accounts",

    "api",

    "companies",

    "technical_offers",

    "tenders",

    "participations",

    "rag",

    "ai",

]



AUTH_USER_MODEL = "accounts.User"



MIDDLEWARE = [

    "django.middleware.security.SecurityMiddleware",

    "corsheaders.middleware.CorsMiddleware",

    "django.contrib.sessions.middleware.SessionMiddleware",

    "django.middleware.common.CommonMiddleware",

    "django.middleware.csrf.CsrfViewMiddleware",

    "django.contrib.auth.middleware.AuthenticationMiddleware",

    "django.contrib.messages.middleware.MessageMiddleware",

    "django.middleware.clickjacking.XFrameOptionsMiddleware",

]



ROOT_URLCONF = "config.urls"



TEMPLATES = [

    {

        "BACKEND": "django.template.backends.django.DjangoTemplates",

        "DIRS": [],

        "APP_DIRS": True,

        "OPTIONS": {

            "context_processors": [

                "django.template.context_processors.request",

                "django.contrib.auth.context_processors.auth",

                "django.contrib.messages.context_processors.messages",

            ],

        },

    },

]



WSGI_APPLICATION = "config.wsgi.application"



DATABASES = {

    "default": {

        "ENGINE": "django.db.backends.postgresql",

        "NAME": os.getenv("DB_NAME", "gare_appalto"),

        "USER": os.getenv("DB_USER", "postgres"),

        "PASSWORD": os.getenv("DB_PASSWORD", "postgres"),

        "HOST": os.getenv("DB_HOST", "localhost"),

        "PORT": os.getenv("DB_PORT", "5432"),

    }

}



AUTH_PASSWORD_VALIDATORS = [

    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},

    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},

    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},

    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},

]



LANGUAGE_CODE = "it-it"

TIME_ZONE = "Europe/Rome"

USE_I18N = True

USE_TZ = True



STATIC_URL = "static/"

MEDIA_URL = "/media/"

MEDIA_ROOT = BASE_DIR / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"



CORS_ALLOWED_ORIGINS = [

    origin.strip()

    for origin in os.getenv("CORS_ALLOWED_ORIGINS", "http://localhost:5173").split(",")

    if origin.strip()

]



REST_FRAMEWORK = {

    "DEFAULT_AUTHENTICATION_CLASSES": (

        "rest_framework_simplejwt.authentication.JWTAuthentication",

    ),

    "DEFAULT_PERMISSION_CLASSES": (

        "rest_framework.permissions.IsAuthenticated",

        "accounts.permissions.IsOrganizationMember",

        "accounts.permissions.RBACPermission",

    ),

    "DEFAULT_PAGINATION_CLASS": "api.pagination.StandardPagination",

    "PAGE_SIZE": 25,

}



SIMPLE_JWT = {

    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=60),

    "REFRESH_TOKEN_LIFETIME": timedelta(days=1),

    "ROTATE_REFRESH_TOKENS": True,

    "BLACKLIST_AFTER_ROTATION": True,

    "AUTH_HEADER_TYPES": ("Bearer",),

}



CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0")

CELERY_RESULT_BACKEND = os.getenv("CELERY_RESULT_BACKEND", CELERY_BROKER_URL)

CELERY_ACCEPT_CONTENT = ["json"]

CELERY_TASK_SERIALIZER = "json"

CELERY_RESULT_SERIALIZER = "json"

CELERY_TIMEZONE = TIME_ZONE

CELERY_TASK_ALWAYS_EAGER = os.getenv("CELERY_TASK_ALWAYS_EAGER", "False").lower() in (

    "true",

    "1",

    "yes",

)



USE_S3 = os.getenv("USE_S3", "False").lower() in ("true", "1", "yes")



if USE_S3:

    AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID", "minioadmin")

    AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY", "minioadmin")

    AWS_STORAGE_BUCKET_NAME = os.getenv("AWS_STORAGE_BUCKET_NAME", "gare-appalto")

    AWS_S3_ENDPOINT_URL = os.getenv("AWS_S3_ENDPOINT_URL", "http://localhost:9000")

    AWS_S3_REGION_NAME = os.getenv("AWS_S3_REGION_NAME", "us-east-1")

    AWS_S3_ADDRESSING_STYLE = "path"

    AWS_S3_SIGNATURE_VERSION = "s3v4"

    AWS_DEFAULT_ACL = None

    AWS_QUERYSTRING_AUTH = True

    AWS_S3_FILE_OVERWRITE = False



    STORAGES = {

        "default": {

            "BACKEND": "storages.backends.s3.S3Storage",

        },

        "staticfiles": {

            "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage",

        },

    }



LLM_PROVIDER = os.getenv("LLM_PROVIDER", "openai")

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
OPENAI_BASE_URL = os.getenv("OPENAI_BASE_URL", "")

AZURE_OPENAI_API_KEY = os.getenv("AZURE_OPENAI_API_KEY", "")
AZURE_OPENAI_ENDPOINT = os.getenv("AZURE_OPENAI_ENDPOINT", "")
AZURE_OPENAI_DEPLOYMENT = os.getenv("AZURE_OPENAI_DEPLOYMENT", "")
AZURE_OPENAI_API_VERSION = os.getenv("AZURE_OPENAI_API_VERSION", "2024-02-15-preview")

