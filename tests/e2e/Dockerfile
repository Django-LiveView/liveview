FROM python:3.12-slim

RUN pip install --no-cache-dir "django>=4.2" "channels>=4.0" "channels-redis>=4.0" daphne

# The django-liveview package is mounted at /package
ENV PYTHONPATH=/package
ENV PYTHONUNBUFFERED=1

WORKDIR /app

CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
