"""
Sasl - Social Asynchronous Sharing Layer
Tutoring serializers with materials, whiteboard, certificates
"""
from rest_framework import serializers
from .models import TutorProfile, TutoringSession, SessionMaterial, WhiteboardSession, Certificate
from users.serializers import UserProfileSerializer


class TutorProfileSerializer(serializers.ModelSerializer):
    user = UserProfileSerializer(read_only=True)
    
    class Meta:
        model = TutorProfile
        fields = ['id', 'user', 'hourly_rate', 'subjects', 'rating', 'is_available', 'total_sessions', 'total_students']


class SessionMaterialSerializer(serializers.ModelSerializer):
    class Meta:
        model = SessionMaterial
        fields = ['id', 'title', 'description', 'file', 'created_at']


class WhiteboardSerializer(serializers.ModelSerializer):
    class Meta:
        model = WhiteboardSession
        fields = ['id', 'session', 'data', 'updated_at']


class CertificateSerializer(serializers.ModelSerializer):
    tutor_name = serializers.ReadOnlyField(source='tutor.username')
    student_name = serializers.ReadOnlyField(source='student.username')
    
    class Meta:
        model = Certificate
        fields = ['id', 'session', 'tutor_name', 'student_name', 'subject', 'certificate_url', 'completed_at']


class TutoringSessionSerializer(serializers.ModelSerializer):
    tutor = UserProfileSerializer(read_only=True)
    student = UserProfileSerializer(read_only=True)
    materials = SessionMaterialSerializer(many=True, read_only=True)
    students_enrolled = serializers.SerializerMethodField()
    
    class Meta:
        model = TutoringSession
        fields = [
            'id', 'tutor', 'student', 'subject', 'description',
            'is_offline', 'is_group_class', 'max_students',
            'price', 'scheduled_at', 'duration_minutes',
            'status', 'materials', 'students_enrolled', 'created_at'
        ]
        read_only_fields = ['tutor', 'student', 'status']
    
    def get_students_enrolled(self, obj):
        return obj.max_students  # Placeholder — would track actual enrollments