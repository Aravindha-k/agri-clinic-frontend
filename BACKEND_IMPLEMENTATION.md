# Kavya Agri Clinic - Backend Implementation Guide
## Django Models, Serializers & API Endpoints

---

## 📦 Part 1: Database Models (Django)

### File: `tracking/models.py`

```python
from django.db import models
from django.contrib.gis.db import models as gis_models
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta
import math

class Workday(models.Model):
    """Track employee workday with location data"""
    
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('completed', 'Completed'),
        ('paused', 'Paused'),
    ]
    
    employee = models.ForeignKey('employees.Employee', on_delete=models.CASCADE)
    start_time = models.DateTimeField()
    end_time = models.DateTimeField(null=True, blank=True)
    start_location = gis_models.PointField(srid=4326)  # WGS84
    end_location = gis_models.PointField(srid=4326, null=True, blank=True)
    
    total_distance = models.FloatField(default=0, help_text="Distance in kilometers")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    notes = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    objects = gis_models.GeoManager()
    
    class Meta:
        ordering = ['-start_time']
        indexes = [
            models.Index(fields=['employee', '-start_time']),
            models.Index(fields=['start_time']),
        ]
    
    def __str__(self):
        return f"{self.employee} - {self.start_time.date()}"
    
    @property
    def total_time(self):
        """Calculate total working time"""
        end = self.end_time or timezone.now()
        return end - self.start_time
    
    @property
    def total_time_minutes(self):
        """Get total time in minutes"""
        return self.total_time.total_seconds() / 60
    
    def calculate_distance(self):
        """Calculate total distance from location points"""
        locations = self.location_points.all().order_by('timestamp')
        if locations.count() < 2:
            return 0
        
        total_distance = 0
        prev_location = None
        
        for location in locations:
            if prev_location:
                # Calculate distance using Haversine formula
                distance = self._haversine_distance(
                    prev_location.latitude,
                    prev_location.longitude,
                    location.latitude,
                    location.longitude
                )
                total_distance += distance
            prev_location = location
        
        self.total_distance = total_distance
        self.save()
        return total_distance
    
    @staticmethod
    def _haversine_distance(lat1, lon1, lat2, lon2):
        """Calculate distance between two GPS points in kilometers"""
        R = 6371  # Earth's radius in km
        
        lat1_rad = math.radians(lat1)
        lat2_rad = math.radians(lat2)
        delta_lat = math.radians(lat2 - lat1)
        delta_lon = math.radians(lon2 - lon1)
        
        a = (math.sin(delta_lat / 2) ** 2 +
             math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon / 2) ** 2)
        
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return R * c


class LocationPoint(models.Model):
    """Real-time GPS tracking points"""
    
    workday = models.ForeignKey(Workday, on_delete=models.CASCADE, related_name='location_points')
    employee = models.ForeignKey('employees.Employee', on_delete=models.CASCADE)
    
    latitude = models.FloatField()
    longitude = models.FloatField()
    location = gis_models.PointField(srid=4326)
    
    accuracy = models.FloatField(null=True, blank=True, help_text="GPS accuracy in meters")
    speed = models.FloatField(null=True, blank=True, help_text="Speed in km/h")
    altitude = models.FloatField(null=True, blank=True, help_text="Altitude in meters")
    
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
    
    objects = gis_models.GeoManager()
    
    class Meta:
        ordering = ['timestamp']
        indexes = [
            models.Index(fields=['workday', 'timestamp']),
            models.Index(fields=['employee', '-timestamp']),
        ]
    
    def __str__(self):
        return f"{self.employee} @ {self.timestamp}"
    
    def save(self, *args, **kwargs):
        """Auto-set location from lat/long"""
        from django.contrib.gis.geos import Point
        self.location = Point(self.longitude, self.latitude, srid=4326)
        super().save(*args, **kwargs)
```

### File: `visits/models.py`

```python
from django.db import models
from django.contrib.gis.db import models as gis_models
from django.contrib.auth.models import User
import uuid

class Visit(models.Model):
    """Enhanced visit model with issues"""
    
    ISSUE_TYPES = [
        ('leaf_disease', 'Leaf Disease'),
        ('pest_infestation', 'Pest Infestation'),
        ('nutrient_deficiency', 'Nutrient Deficiency'),
        ('water_management', 'Water Management'),
        ('soil_quality', 'Soil Quality'),
        ('other', 'Other'),
    ]
    
    SEVERITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
    ]
    
    STATUS_CHOICES = [
        ('visited', 'Visited'),
        ('issue_found', 'Issue Found'),
        ('resolved', 'Resolved'),
        ('pending', 'Pending'),
    ]
    
    # Basic Info
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    employee = models.ForeignKey('employees.Employee', on_delete=models.CASCADE)
    
    # Farmer Info
    farmer_name = models.CharField(max_length=255)
    farmer_phone = models.CharField(max_length=20, blank=True)
    farmer = models.ForeignKey('masters.Farmer', on_delete=models.SET_NULL, null=True, blank=True)
    
    # Location
    village = models.CharField(max_length=255)
    latitude = models.FloatField()
    longitude = models.FloatField()
    location = gis_models.PointField(srid=4326)
    
    # Crop Info
    crop = models.CharField(max_length=100)
    area_acres = models.FloatField(null=True, blank=True)
    
    # Issue Info (New Fields)
    issue_type = models.CharField(max_length=50, choices=ISSUE_TYPES, blank=True)
    issue_description = models.TextField(blank=True)
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES, blank=True)
    recommended_solution = models.TextField(blank=True)
    
    # General
    notes = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='visited')
    
    # Relationships
    workday = models.ForeignKey('tracking.Workday', on_delete=models.SET_NULL, null=True, blank=True)
    
    # Metadata
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    offline_sync = models.BooleanField(default=False, help_text="Was created offline")
    
    objects = gis_models.GeoManager()
    
    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['employee', '-timestamp']),
            models.Index(fields=['status', '-timestamp']),
            models.Index(fields=['issue_type']),
        ]
    
    def __str__(self):
        return f"Visit: {self.farmer_name} - {self.crop}"
    
    def save(self, *args, **kwargs):
        """Auto-set location from lat/long"""
        from django.contrib.gis.geos import Point
        self.location = Point(self.longitude, self.latitude, srid=4326)
        super().save(*args, **kwargs)
    
    @property
    def has_images(self):
        """Check if visit has attachments"""
        return self.attachments.exists()
    
    @property
    def image_count(self):
        """Get number of attached images"""
        return self.attachments.count()


class VisitAttachment(models.Model):
    """Images and documents attached to visits"""
    
    visit = models.ForeignKey(Visit, on_delete=models.CASCADE, related_name='attachments')
    image = models.ImageField(upload_to='visits/%Y/%m/%d/')
    thumbnail = models.ImageField(upload_to='visits/thumbnails/%Y/%m/%d/', null=True, blank=True)
    
    description = models.CharField(max_length=255, blank=True)
    file_size = models.BigIntegerField(help_text="File size in bytes")
    image_width = models.IntegerField(null=True, blank=True)
    image_height = models.IntegerField(null=True, blank=True)
    
    # GPS metadata
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    location = gis_models.PointField(srid=4326, null=True, blank=True)
    
    timestamp = models.DateTimeField(auto_now_add=True)
    
    objects = gis_models.GeoManager()
    
    class Meta:
        ordering = ['timestamp']
    
    def __str__(self):
        return f"Attachment: {self.visit.id} - {self.image.name}"
    
    def save(self, *args, **kwargs):
        """Auto-set location from lat/long"""
        from django.contrib.gis.geos import Point
        if self.latitude and self.longitude:
            self.location = Point(self.longitude, self.latitude, srid=4326)
        super().save(*args, **kwargs)


class Issue(models.Model):
    """Separate issue tracking model"""
    
    STATUS_CHOICES = [
        ('open', 'Open'),
        ('in_review', 'In Review'),
        ('assigned', 'Assigned'),
        ('resolved', 'Resolved'),
        ('closed', 'Closed'),
    ]
    
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    visit = models.ForeignKey(Visit, on_delete=models.CASCADE, related_name='issues')
    
    # Issue Details
    issue_type = models.CharField(max_length=50)
    description = models.TextField()
    severity = models.CharField(max_length=20, choices=PRIORITY_CHOICES)
    
    # Assignment
    reported_by = models.ForeignKey('employees.Employee', on_delete=models.SET_NULL, 
                                    null=True, related_name='reported_issues')
    assigned_to = models.ForeignKey(User, on_delete=models.SET_NULL, 
                                    null=True, blank=True, related_name='assigned_issues')
    
    # Status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='open')
    resolution_notes = models.TextField(blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', '-created_at']),
            models.Index(fields=['severity']),
        ]
    
    def __str__(self):
        return f"Issue #{self.id} - {self.issue_type}"
    
    def mark_resolved(self, notes=''):
        """Mark issue as resolved"""
        self.status = 'resolved'
        self.resolved_at = timezone.now()
        if notes:
            self.resolution_notes = notes
        self.save()
```

### File: `masters/models.py` (Add Farmer if missing)

```python
class Farmer(models.Model):
    """Farmer master data"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    phone = models.CharField(max_length=20, unique=True)
    email = models.EmailField(blank=True)
    
    village = models.CharField(max_length=255)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    
    total_area_acres = models.FloatField(null=True, blank=True)
    crops = models.ManyToManyField('Crop', blank=True)
    
    notes = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return self.name


class Crop(models.Model):
    """Crop types"""
    
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    season = models.CharField(max_length=50, blank=True)
    
    def __str__(self):
        return self.name
```

---

## 🔌 Part 2: Django REST Framework Serializers

### File: `tracking/serializers.py`

```python
from rest_framework import serializers
from rest_framework_gis.serializers import GeoFeatureModelSerializer
from .models import Workday, LocationPoint
from django.utils import timezone

class LocationPointSerializer(serializers.ModelSerializer):
    class Meta:
        model = LocationPoint
        fields = ['id', 'latitude', 'longitude', 'accuracy', 'speed', 'altitude', 'timestamp']
        read_only_fields = ['id', 'timestamp']


class WorkdaySerializer(serializers.ModelSerializer):
    location_points = LocationPointSerializer(many=True, read_only=True)
    total_time_display = serializers.SerializerMethodField()
    
    class Meta:
        model = Workday
        fields = ['id', 'employee', 'start_time', 'end_time', 'start_location',
                  'end_location', 'total_distance', 'status', 'notes', 
                  'total_time_display', 'location_points', 'created_at']
        read_only_fields = ['id', 'created_at', 'total_distance']
    
    def get_total_time_display(self, obj):
        """Return formatted total time"""
        duration = obj.total_time
        hours = duration.total_seconds() // 3600
        minutes = (duration.total_seconds() % 3600) // 60
        return f"{int(hours)}h {int(minutes)}m"


class WorkdayGeoSerializer(GeoFeatureModelSerializer):
    """GeoJSON format for mapping"""
    
    class Meta:
        model = Workday
        fields = ['id', 'employee', 'start_time', 'end_time', 'total_distance', 'status']
        geo_field = 'start_location'


class EmployeeTrackingSerializer(serializers.Serializer):
    """Real-time employee tracking info"""
    
    employee_id = serializers.IntegerField()
    employee_name = serializers.CharField()
    current_location = serializers.SerializerMethodField()
    status = serializers.CharField()
    last_update = serializers.DateTimeField()
    visits_today = serializers.IntegerField()
    distance_km = serializers.FloatField()
    time_worked_minutes = serializers.IntegerField()
    
    def get_current_location(self, obj):
        latest = obj.get('latest_location')
        if latest:
            return {
                'latitude': latest['latitude'],
                'longitude': latest['longitude'],
                'accuracy': latest['accuracy']
            }
        return None
```

### File: `visits/serializers.py`

```python
from rest_framework import serializers
from rest_framework_gis.serializers import GeoFeatureModelSerializer
from .models import Visit, VisitAttachment, Issue
from PIL import Image
import io

class VisitAttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = VisitAttachment
        fields = ['id', 'image', 'thumbnail', 'description', 'file_size',
                  'image_width', 'image_height', 'latitude', 'longitude', 'timestamp']
        read_only_fields = ['id', 'file_size', 'image_width', 'image_height', 'timestamp']


class IssueSerializer(serializers.ModelSerializer):
    class Meta:
        model = Issue
        fields = ['id', 'visit', 'issue_type', 'description', 'severity',
                  'reported_by', 'assigned_to', 'status', 'resolution_notes',
                  'created_at', 'resolved_at']
        read_only_fields = ['id', 'created_at', 'resolved_at']


class VisitSerializer(serializers.ModelSerializer):
    attachments = VisitAttachmentSerializer(many=True, read_only=True)
    issues = IssueSerializer(many=True, read_only=True)
    has_images = serializers.SerializerMethodField()
    image_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Visit
        fields = ['id', 'employee', 'farmer_name', 'farmer_phone', 'farmer',
                  'village', 'latitude', 'longitude', 'crop', 'area_acres',
                  'issue_type', 'issue_description', 'severity',
                  'recommended_solution', 'notes', 'status',
                  'workday', 'timestamp', 'attachments', 'issues',
                  'has_images', 'image_count', 'offline_sync']
        read_only_fields = ['id', 'timestamp']
    
    def get_has_images(self, obj):
        return obj.has_images
    
    def get_image_count(self, obj):
        return obj.image_count
    
    def validate_image(self, value):
        """Validate and compress image"""
        if value.size > 5 * 1024 * 1024:  # 5MB
            raise serializers.ValidationError("Image file too large (max 5MB)")
        
        # Compress image
        img = Image.open(value)
        img.thumbnail((1920, 1920))  # Resize
        
        img_io = io.BytesIO()
        img.save(img_io, format='JPEG', quality=85)
        img_io.seek(0)
        
        return img_io


class VisitGeoSerializer(GeoFeatureModelSerializer):
    """GeoJSON format for mapping"""
    
    class Meta:
        model = Visit
        fields = ['id', 'farmer_name', 'crop', 'issue_type', 'severity', 'status', 'timestamp']
        geo_field = 'location'
```

---

## 🔗 Part 3: API Views (ViewSets)

### File: `tracking/views.py`

```python
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q
from django.utils import timezone
from datetime import timedelta
import json

from .models import Workday, LocationPoint
from .serializers import WorkdaySerializer, LocationPointSerializer
from employees.models import Employee

class WorkdayViewSet(viewsets.ModelViewSet):
    serializer_class = WorkdaySerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Workday.objects.filter(employee__user=self.request.user)
    
    @action(detail=False, methods=['post'])
    def start(self, request):
        """Start a new workday"""
        employee = request.user.employee_profile
        
        # End any existing active workday
        active = Workday.objects.filter(employee=employee, status='active').first()
        if active:
            return Response(
                {'error': 'Active workday already exists'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        lat = request.data.get('latitude')
        lon = request.data.get('longitude')
        
        from django.contrib.gis.geos import Point
        location = Point(lon, lat, srid=4326)
        
        workday = Workday.objects.create(
            employee=employee,
            start_time=timezone.now(),
            start_location=location,
            status='active'
        )
        
        return Response(
            WorkdaySerializer(workday).data,
            status=status.HTTP_201_CREATED
        )
    
    @action(detail=False, methods=['post'])
    def end(self, request):
        """End current workday"""
        employee = request.user.employee_profile
        
        workday = Workday.objects.filter(employee=employee, status='active').first()
        if not workday:
            return Response(
                {'error': 'No active workday'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        lat = request.data.get('latitude')
        lon = request.data.get('longitude')
        
        from django.contrib.gis.geos import Point
        location = Point(lon, lat, srid=4326)
        
        workday.end_time = timezone.now()
        workday.end_location = location
        workday.status = 'completed'
        workday.calculate_distance()
        workday.save()
        
        return Response(WorkdaySerializer(workday).data)


class LocationPointViewSet(viewsets.ModelViewSet):
    serializer_class = LocationPointSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return LocationPoint.objects.filter(employee__user=self.request.user)
    
    def create(self, request, *args, **kwargs):
        """Push GPS location"""
        employee = request.user.employee_profile
        
        workday = Workday.objects.filter(employee=employee, status='active').first()
        if not workday:
            return Response(
                {'error': 'No active workday'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        lat = request.data.get('latitude')
        lon = request.data.get('longitude')
        accuracy = request.data.get('accuracy')
        speed = request.data.get('speed')
        
        from django.contrib.gis.geos import Point
        location = Point(lon, lat, srid=4326)
        
        point = LocationPoint.objects.create(
            workday=workday,
            employee=employee,
            latitude=lat,
            longitude=lon,
            location=location,
            accuracy=accuracy,
            speed=speed
        )
        
        return Response(LocationPointSerializer(point).data, status=status.HTTP_201_CREATED)
    
    @action(detail=False, methods=['get'])
    def current(self, request):
        """Get current location"""
        employee = request.user.employee_profile
        
        location = LocationPoint.objects.filter(
            employee=employee
        ).order_by('-timestamp').first()
        
        if not location:
            return Response({'error': 'No location data'}, status=status.HTTP_404_NOT_FOUND)
        
        return Response(LocationPointSerializer(location).data)
```

### File: `visits/views.py`

```python
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from django.db.models import Q
from .models import Visit, VisitAttachment, Issue
from .serializers import VisitSerializer, VisitAttachmentSerializer, IssueSerializer

class VisitViewSet(viewsets.ModelViewSet):
    serializer_class = VisitSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser)
    
    def get_queryset(self):
        return Visit.objects.all()
    
    def create(self, request, *args, **kwargs):
        """Create new visit"""
        request.data._mutable = True
        request.data['employee'] = request.user.employee_profile.id
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['post'])
    def upload_attachment(self, request, pk=None):
        """Upload images for visit"""
        visit = self.get_object()
        files = request.FILES.getlist('images')
        
        for file in files:
            VisitAttachment.objects.create(
                visit=visit,
                image=file,
                latitude=request.data.get('latitude'),
                longitude=request.data.get('longitude'),
                file_size=file.size
            )
        
        return Response({'success': True, 'count': len(files)})
    
    @action(detail=False, methods=['get'])
    def filter(self, request):
        """Advanced filtering"""
        queryset = Visit.objects.all()
        
        # Filter by status
        status_filter = request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        # Filter by crop
        crop = request.query_params.get('crop')
        if crop:
            queryset = queryset.filter(crop=crop)
        
        # Filter by date range
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        if start_date and end_date:
            queryset = queryset.filter(timestamp__range=[start_date, end_date])
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def batch_create(self, request):
        """Batch create visits (offline sync)"""
        visits_data = request.data.get('visits', [])
        created = []
        
        for visit_data in visits_data:
            visit_data['employee'] = request.user.employee_profile.id
            visit_data['offline_sync'] = True
            
            serializer = self.get_serializer(data=visit_data)
            if serializer.is_valid():
                serializer.save()
                created.append(serializer.data)
        
        return Response({'created': len(created), 'visits': created})
```

### File: `tracking/views.py` (Admin Tracking)

```python
@action(detail=False, methods=['get'])
def admin_status(self, request):
    """Real-time status of all employees"""
    if not request.user.is_staff:
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
    
    from django.db.models import Subquery, OuterRef, F
    from tracking.models import LocationPoint
    
    # Get latest location for each employee
    latest_location = LocationPoint.objects.filter(
        employee=OuterRef('employee')
    ).order_by('-timestamp').values('latitude', 'longitude', 'timestamp')[:1]
    
    workdays = Workday.objects.filter(status='active').annotate(
        latest_lat=Subquery(latest_location.values('latitude')),
        latest_lon=Subquery(latest_location.values('longitude')),
        latest_time=Subquery(latest_location.values('timestamp'))
    )
    
    employees = []
    for wd in workdays:
        employees.append({
            'employee_id': wd.employee.id,
            'employee_name': wd.employee.user.get_full_name(),
            'current_location': {
                'latitude': wd.latest_lat,
                'longitude': wd.latest_lon
            },
            'status': 'active',
            'last_update': wd.latest_time,
            'distance_km': round(wd.total_distance, 2)
        })
    
    return Response(employees)


@action(detail=False, methods=['get'])
def admin_geo_employees(self, request):
    """Get all employees as GeoJSON"""
    if not request.user.is_staff:
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
    
    from rest_framework_gis.filters import InBBOXFilter
    from tracking.serializers import WorkdayGeoSerializer
    
    workdays = Workday.objects.filter(status='active')
    serializer = WorkdayGeoSerializer(workdays, many=True)
    
    return Response({
        'type': 'FeatureCollection',
        'features': serializer.data
    })
```

---

## 📝 URL Configuration

### File: `apiurls.py` or `urls.py`

```python
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from tracking.views import WorkdayViewSet, LocationPointViewSet
from visits.views import VisitViewSet
from issues.views import IssueViewSet

router = DefaultRouter()
router.register(r'tracking/workday', WorkdayViewSet, basename='workday')
router.register(r'tracking/location', LocationPointViewSet, basename='location')
router.register(r'visits', VisitViewSet, basename='visit')
router.register(r'issues', IssueViewSet, basename='issue')

urlpatterns = [
    path('api/', include(router.urls)),
]
```

---

## ✅ Migration Steps

```bash
# Create migrations
python manage.py makemigrations tracking visits issues masters

# Apply migrations
python manage.py migrate

# Create superuser if needed
python manage.py createsuperuser

# Test APIs
python manage.py runserver
```

---

**Status:** Ready for implementation
