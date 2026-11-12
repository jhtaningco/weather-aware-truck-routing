from django.urls import path

from . import views

urlpatterns = [
    path("health", views.health, name="health"),
    path("geocode", views.geocode, name="geocode"),
    path("plans", views.create_plan, name="create_plan"),
    path("plans/<str:plan_id>", views.get_plan, name="get_plan"),
]
