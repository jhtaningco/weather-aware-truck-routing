"""DRF serializers for plan request validation and serialization."""

from datetime import UTC, datetime, timedelta

from rest_framework import serializers

from .services.geometry import haversine_distance_miles


class CoordinateSerializer(serializers.Serializer):
    label = serializers.CharField(max_length=255, default="")
    lat = serializers.FloatField(min_value=-90.0, max_value=90.0)
    lon = serializers.FloatField(min_value=-180.0, max_value=180.0)


class PlanRequestSerializer(serializers.Serializer):
    origin = CoordinateSerializer()
    destination = CoordinateSerializer()
    depart_at = serializers.DateTimeField()
    load_lb = serializers.IntegerField(min_value=0, max_value=120000, default=0)
    interval_mi = serializers.ChoiceField(choices=[10, 25, 50], default=25)

    def validate_depart_at(self, value: datetime) -> datetime:
        # Normalize to UTC
        if value.tzinfo is None:
            value = value.replace(tzinfo=UTC)
        now_utc = datetime.now(UTC)

        # Allow up to 2 hours in the past to account for browser clocks
        if value < now_utc - timedelta(hours=2):
            raise serializers.ValidationError("Departure time cannot be in the past.")

        # Open-Meteo forecast horizon is 16 days
        if value > now_utc + timedelta(days=16):
            raise serializers.ValidationError(
                "Departure time exceeds forecast horizon (maximum 16 days ahead)."
            )
        return value

    def validate(self, data: dict) -> dict:
        origin_coord = (data["origin"]["lat"], data["origin"]["lon"])
        dest_coord = (data["destination"]["lat"], data["destination"]["lon"])

        distance = haversine_distance_miles(origin_coord, dest_coord)
        if distance < 0.1:
            raise serializers.ValidationError(
                {"destination": "Origin and destination must be distinct locations."}
            )
        return data
