from django.db import models
from django.contrib.auth.models import User
from django.conf import settings
from django.utils.text import slugify


class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    avatar = models.ImageField(upload_to="profile/", blank=True, null=True)

    @property
    def avatar_url(self):
        if self.avatar:
            return settings.DOMAIN_URL + settings.MEDIA_URL + self.avatar.name

    def __str__(self):
        return self.user.username


class Cat(models.Model):
    name = models.CharField(max_length=255)
    age = models.IntegerField()
    biography = models.TextField()
    avatar = models.ImageField(upload_to="avatars/", blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    @property
    def avatar_url(self):
        if self.avatar:
            return settings.DOMAIN_URL + settings.MEDIA_URL + self.avatar.name

    @property
    def slug(self):
        return slugify(self.name)

    def __str__(self):
        return self.name


class Client(models.Model):
    """
    Each client who is connected to the website
    """

    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True)
    channel_name = models.CharField(max_length=200, blank=True, null=True, default=None)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.user.username if self.user else self.channel_name
