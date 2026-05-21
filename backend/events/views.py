from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Event, EventAttendee
from .serializers import EventSerializer, EventAttendeeSerializer
from notifications.services import create_notification

class EventViewSet(viewsets.ModelViewSet):
    queryset = Event.objects.all()
    serializer_class = EventSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def perform_create(self, serializer):
        event = serializer.save(creator=self.request.user)
        EventAttendee.objects.create(event=event, user=self.request.user, status='going')

    @action(detail=True, methods=['post'])
    def rsvp(self, request, pk=None):
        event = self.get_object()
        status_choice = request.data.get('status', 'going')
        attendee, created = EventAttendee.objects.update_or_create(
            event=event, user=request.user,
            defaults={'status': status_choice}
        )
        if created:
            create_notification(
                recipient=event.creator,
                actor=request.user,
                notification_type='event',
                message=f'{request.user.username} is attending your event "{event.title}"'
            )
        return Response({'status': attendee.status})

    @action(detail=True, methods=['get'])
    def attendees(self, request, pk=None):
        event = self.get_object()
        going = event.attendees.filter(status='going')
        return Response(EventAttendeeSerializer(going, many=True).data)

    @action(detail=False, methods=['get'])
    def my_events(self, request):
        events = Event.objects.filter(creator=request.user)
        return Response(EventSerializer(events, many=True).data)

    @action(detail=False, methods=['get'])
    def upcoming(self, request):
        from django.utils import timezone
        events = Event.objects.filter(date__gte=timezone.now().date()).order_by('date', 'time')
        return Response(EventSerializer(events, many=True).data)