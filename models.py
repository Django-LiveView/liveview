from django.db import models
from django.contrib.auth.models import User
from django.conf import settings
from django.utils.text import slugify


class Client(models.Model):
    """
    Each client who is connected to the website
    """

    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True)
    channel_name = models.CharField(max_length=200, blank=True, null=True, default=None)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.user.username if self.user else self.channel_name
