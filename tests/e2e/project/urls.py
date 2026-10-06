from demo import views
from django.urls import path

urlpatterns = [
    path("", views.page_view, {"page": "home"}, name="home"),
    path("about/", views.page_view, {"page": "about"}, name="about"),
    path("contact/", views.page_view, {"page": "contact"}, name="contact"),
    path("products/", views.page_view, {"page": "products"}, name="products"),
    path("blog/", views.page_view, {"page": "blog"}, name="blog"),
]
