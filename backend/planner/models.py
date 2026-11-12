"""Data models for stored trip plans."""

import uuid

from django.db import models


class Plan(models.Model):
    """Persisted trip plan with input parameters and calculated route evaluations."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    payload = models.JSONField()

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"Plan {self.id} ({self.created_at.isoformat()})"
