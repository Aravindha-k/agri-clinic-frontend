# Kavya Agri Clinic - Employee Tracking & Field Visit System
## Complete Technical Requirements Document

**Version:** 1.0  
**Date:** February 2026  
**Project Scope:** Real-time employee tracking, field visit documentation, issue reporting with image uploads

---

## 🎯 Business Overview

Kavya Agri Clinic supplies & trades:
- Bio-fertilizers
- Tomato seeds
- Agro-chemicals & fertilizers

**Primary Use Case:** Field agents visit farmer locations to:
1. ✅ Check crop health issues
2. ✅ Document problems with images & notes
3. ✅ Track real-time location & movements
4. ✅ Record field inspection data
5. ✅ Admin monitors all employees on live map
6. ✅ Generate reports on visits & issues

---

## 📱 FRONTEND REQUIREMENTS

### 1. Employee Mobile App / Web App
**Tech Stack:** React Native / React Web+PWA  
**Target Users:** Field agents/employees

#### 1.1 Core Features Required

##### A. **Workday Management**
```
✅ START workday (with GPS location)
✅ END workday (with final GPS location)
✅ Display: Current workday status
✅ Show: Time worked, distance covered
```

##### B. **Real-time GPS Tracking**
```
✅ Background location tracking (every 30-60 seconds)
✅ Send GPS coordinates + accuracy to server
✅ Heartbeat signal to keep session alive
✅ Battery optimization for location services
✅ Show: Live map with current location
✅ Show: Route traveled during workday
```

##### C. **Visit Creation & Management**
```
Interface Components:
├── Visit Form
│   ├── Farmer Name (search/autocomplete)
│   ├── Village/Location  
│   ├── Crop Type (dropdown)
│   ├── Notes/Observations
│   ├── Auto-capture GPS location
│   ├── Timestamp
│   └── Status (Visited/Issue Found/Resolved)
│
├── Image Capture & Upload
│   ├── Camera integration
│   ├── Multiple images per visit (3-5 photos)
│   ├── Image compression (500KB per image max)
│   ├── Progress indicator for upload
│   └── Offline queue (upload when connected)
│
├── Issue Documentation
│   ├── Issue Type (dropdown)
│   │   ├── Leaf Disease
│   │   ├── Pest Infestation
│   │   ├── Nutrient Deficiency
│   │   ├── Water Management
│   │   ├── Soil Quality
│   │   └── Other
│   ├── Severity Level (Low/Medium/High)
│   ├── Detailed Description
│   ├── Recommended Solution (optional)
│   └── Images (evidence of issue)
│
└── Submit Visit
    ├── Local validation
    ├── Sync when online
    ├── Show success/error message
    └── Clear form
```

##### D. **Visit History & Management**
```
✅ List all visits (today/this week/all)
✅ Filter by status, crop type, date
✅ View visit details on demand
✅ Edit incomplete visits
✅ Delete visits (with confirmation)
✅ Show sync status (synced/pending/failed)
```

##### E. **Map View**
```
✅ Show current location
✅ Display route traveled (GPS trail)
✅ Mark all visited farmer locations
✅ Show workday boundaries
✅ Distance and time display
```

##### F. **Offline Support**
```
✅ Queue visits when offline
✅ Store images locally
✅ Sync when network available
✅ Show pending sync count
✅ Retry failed syncs
```

---

### 2. Admin Dashboard (Web Panel)
**Tech Stack:** React + Tailwind CSS (already in place)  
**Target Users:** Managers, supervisors, admins

#### 2.1 Features Required

##### A. **Live Employee Tracking Map**
```
Map Features:
├── Real-time Employee Markers
│   ├── Current location of each employee
│   ├── Employee name & ID
│   ├── Current status (Active/Idle/Offline)
│   ├── Last update timestamp
│   └── Click for detailed view
│
├── Tracking Controls
│   ├── Filter by: Active/All/Offline employees
│   ├── Date range selector
│   ├── Refresh rate control (auto-update)
│   ├── Zoom & pan controls
│   └── Full-screen map option
│
└── Employee Information Panel
    ├── Name, ID, Phone
    ├── Current status
    ├── Today's visits count
    ├── Distance traveled
    ├── Time worked
    └── Last GPS update (relative time)
```

**Map Technology:**
- Leaflet.js + OpenStreetMap (free, open-source)
- OR: Google Maps API (requires API key)
- Real-time updates via WebSocket or polling (5-10 sec intervals)

##### B. **Individual Employee Tracking**
```
Per-Employee View:
├── Profile Card
│   ├── Photo
│   ├── Name, ID, Phone
│   ├── Current location (address)
│   ├── Status badge
│   ├── Today's stats
│   └── Actions (call, message)
│
├── Live Tracking
│   ├── Real-time location on map
│   ├── Zoom to current location
│   ├── Show last 4 hours of route
│   ├── Speed & accuracy display
│   └── Elevation profile
│
├── Workday Summary
│   ├── Start time & location
│   ├── Current time worked
│   ├── Distance covered (km)
│   ├── Visits completed
│   └── Break times logged
│
└── Actions
    ├── View detailed route
    ├── Download route (GPX/KML)
    ├── Message employee
    ├── Force stop workday (emergency)
    └── Generate report
```

##### C. **Issue/Problem Tracking Dashboard**
```
Issue Management:
├── Issue List View
│   ├── All reported issues from field
│   ├── Filter by: Status, Severity, Type, Date
│   ├── Sort by: Latest, Severity, Farmer
│   ├── Columns: ID, Type, Severity, Farmer, Date, Agent, Status
│   └── Pagination
│
├── Issue Details
│   ├── Issue type & description
│   ├── Farmer name & location
│   ├── GPS coordinates (on map)
│   ├── Crop type affected
│   ├── Image gallery (thumbnails)
│   ├── Recommended solution
│   ├── Agent who reported
│   ├── Timestamp
│   └── Status & history
│
├── Image Viewer
│   ├── Full-size image modal
│   ├── Lightbox/carousel view
│   ├── Download image option
│   └── Image metadata (GPS, timestamp)
│
└── Issue Actions
    ├── Update status (Open/In Review/Resolved/Closed)
    ├── Add internal notes
    ├── Assign to expert/manager
    ├── Email farmer with solution
    ├── Create task/follow-up
    └── Export as PDF report
```

##### D. **Analytics & Reports**
```
Dashboard Widgets:
├── KPIs
│   ├── Total employees active today
│   ├── Total visits completed
│   ├── Total issues reported
│   ├── Average coverage per employee
│   └── Issues resolution rate
│
├── Charts
│   ├── Visits over time (line chart)
│   ├── Issues by type (pie chart)
│   ├── Issues by severity (bar chart)
│   ├── Employee productivity (bar chart)
│   └── Issue resolution time (trend line)
│
├── Reports (Downloadable)
│   ├── Daily activity report
│   ├── Weekly coverage summary
│   ├── Issue analysis report
│   ├── Employee performance report
│   └── Geographic coverage heat map
│
└── Export Options
    ├── CSV export
    ├── PDF report
    ├── Excel workbook
    └── Email scheduling
```

##### E. **Employee Management (Admin)**
```
Employee Admin Panel:
├── List all employees
├── Add/Edit/Delete employees
├── Assign to zones/areas
├── View tracking history
├── Enable/disable tracking
├── Reset passwords
└── Activity logs
```

---

## 🔧 BACKEND REQUIREMENTS

### Tech Stack
- **Framework:** Django / Django REST Framework
- **Database:** PostgreSQL (with PostGIS for geographic data)
- **Caching:** Redis (for real-time tracking data)
- **Storage:** S3 or Local file storage (for images)
- **Real-time:** Django Channels for WebSocket support

### 1. Core Backend APIs

#### 1.1 Authentication & Authorization
```
POST   /api/auth/login/           - Login (username, password)
POST   /api/auth/logout/          - Logout
POST   /api/auth/refresh-token/   - Refresh JWT token
GET    /api/auth/profile/         - Get current user profile
PUT    /api/auth/profile/update/  - Update profile
POST   /api/auth/change-password/ - Change password
```

#### 1.2 Workday Management (Already Partially Implemented)
```
POST   /api/tracking/workday/start/       - Start workday (+ GPS)
POST   /api/tracking/workday/end/         - End workday (+ GPS)
GET    /api/tracking/workday/current/     - Get current workday status
GET    /api/tracking/workdays/history/    - Get workday history (paginated)
GET    /api/tracking/workday/{id}/        - Get specific workday details
GET    /api/tracking/workday/{id}/summary - Get workday summary stats
```

**Workday Model (Database Schema):**
```python
class Workday(models.Model):
    employee = ForeignKey(Employee)
    start_time = DateTimeField()
    end_time = DateTimeField(null=True)
    start_location = GeoPointField()
    end_location = GeoPointField(null=True)
    total_distance = FloatField(default=0)
    total_time = DurationField()
    status = CharField(choices=['active', 'completed', 'paused'])
    notes = TextField(blank=True)
    created_at = DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.employee} - {self.start_time.date()}"
```

#### 1.3 GPS Location Tracking
```
POST   /api/tracking/location/push/              - Push GPS location
GET    /api/tracking/workday/{id}/locations/    - Get locations for workday
GET    /api/tracking/locations/current/         - Get current location
POST   /api/tracking/heartbeat/                 - Keep session alive
GET    /api/tracking/route/{workday_id}/        - Get route as GeoJSON
```

**LocationPoint Model:**
```python
class LocationPoint(models.Model):
    workday = ForeignKey(Workday)
    employee = ForeignKey(Employee)
    latitude = FloatField()
    longitude = FloatField()
    accuracy = FloatField(null=True)  # GPS accuracy in meters
    speed = FloatField(null=True)     # Speed in km/h
    altitude = FloatField(null=True)
    timestamp = DateTimeField(auto_now_add=True)
    
    class Meta:
        indexes = [GeoIndex(fields=['latitude', 'longitude'])]
    
    def __str__(self):
        return f"{self.employee} @ {self.timestamp}"
```

#### 1.4 Visit Management (Needs Extension)
```
POST   /api/visits/create/                  - Create new visit
GET    /api/visits/list/                    - List visits (with filters)
GET    /api/visits/{id}/                    - Get visit details
PUT    /api/visits/{id}/update/             - Update visit
DELETE /api/visits/{id}/                    - Delete visit
GET    /api/visits/farmer/{farmer_id}/       - Get visits for farmer
GET    /api/visits/date-range/              - Filter by date range
POST   /api/visits/{id}/attachments/        - Upload images
GET    /api/visits/{id}/attachments/        - List attachments
DELETE /api/visits/{id}/attachments/{att_id}/ - Delete attachment
```

**Enhanced Visit Model:**
```python
class Visit(models.Model):
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
    
    employee = ForeignKey(Employee)
    farmer_name = CharField(max_length=255)
    farmer_phone = CharField(max_length=20, blank=True)
    farmer_id = ForeignKey(Farmer, null=True, blank=True)
    
    village = CharField(max_length=255)
    crop = CharField(max_length=100)
    latitude = FloatField()
    longitude = FloatField()
    location = GeoPointField()
    
    issue_type = CharField(max_length=50, choices=ISSUE_TYPES, blank=True)
    issue_description = TextField(blank=True)
    severity = CharField(max_length=20, choices=SEVERITY_CHOICES, blank=True)
    recommended_solution = TextField(blank=True)
    
    notes = TextField(blank=True)
    status = CharField(max_length=20, choices=STATUS_CHOICES, default='visited')
    
    workday = ForeignKey(Workday, null=True, blank=True)
    timestamp = DateTimeField(auto_now_add=True)
    updated_at = DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Visit: {self.farmer_name} - {self.crop}"
```

**VisitAttachment Model:**
```python
class VisitAttachment(models.Model):
    visit = ForeignKey(Visit, related_name='attachments')
    image = ImageField(upload_to='visits/%Y/%m/%d/')
    description = CharField(max_length=255, blank=True)
    file_size = BigIntegerField()
    image_width = IntegerField(null=True)
    image_height = IntegerField(null=True)
    latitude = FloatField(null=True)  # GPS when photo taken
    longitude = FloatField(null=True)
    timestamp = DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Attachment: {self.visit.id} - {self.image.name}"
```

#### 1.5 Issue Management APIs
```
POST   /api/issues/create/                 - Report new issue
GET    /api/issues/list/                   - List all issues
GET    /api/issues/{id}/                   - Get issue details
PUT    /api/issues/{id}/update/            - Update issue
PATCH  /api/issues/{id}/status/            - Update issue status
GET    /api/issues/filter/                 - Advanced filtering
PUT    /api/issues/{id}/assign/            - Assign to expert
POST   /api/issues/{id}/notes/             - Add internal notes
GET    /api/issues/statistics/             - Get issue stats
```

**Issue Model:**
```python
class Issue(models.Model):
    STATUS_CHOICES = [
        ('open', 'Open'),
        ('in_review', 'In Review'),
        ('resolved', 'Resolved'),
        ('closed', 'Closed'),
    ]
    
    visit = ForeignKey(Visit, related_name='issues')
    issue_type = CharField(max_length=50)
    description = TextField()
    severity = CharField(max_length=20)
    images = ManyToMany(VisitAttachment)
    
    reported_by = ForeignKey(Employee)  # field agent
    assigned_to = ForeignKey(User, null=True, blank=True)  # expert/manager
    
    status = CharField(max_length=20, choices=STATUS_CHOICES, default='open')
    resolution_notes = TextField(blank=True)
    
    created_at = DateTimeField(auto_now_add=True)
    resolved_at = DateTimeField(null=True, blank=True)
    
    def __str__(self):
        return f"Issue #{self.id} - {self.issue_type}"
```

#### 1.6 Admin Tracking APIs
```
GET    /api/tracking/admin/status/           - All employees real-time status
GET    /api/tracking/admin/geo/employees/    - GeoJSON of all employee locations
GET    /api/tracking/admin/geo/routes/{emp_id}/ - Employee route (GeoJSON)
GET    /api/tracking/admin/employee/{id}/    - Individual employee tracking
GET    /api/tracking/admin/statistics/       - Tracking statistics
GET    /api/tracking/admin/heatmap/          - Coverage heatmap data
```

**Response Format (GeoJSON):**
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [73.9125, 18.5204]
      },
      "properties": {
        "employee_id": 1,
        "name": "Raj Kumar",
        "status": "active",
        "last_update": "2026-02-21T14:30:00Z",
        "visits_today": 5,
        "distance_km": 12.5
      }
    }
  ]
}
```

#### 1.7 Analytics & Reports APIs
```
GET    /api/reports/daily/               - Daily report
GET    /api/reports/weekly/              - Weekly report
GET    /api/reports/employee/{id}/       - Employee report
GET    /api/reports/productivity/        - Productivity metrics
GET    /api/reports/issues/analysis/     - Issue analytics
GET    /api/reports/coverage/heatmap/    - Coverage heatmap
POST   /api/reports/export/              - Export report
```

---

### 2. Database Schema & Migrations

**Key Models to Create/Modify:**
```
1. Workday (GPS tracking)
   - Location points per workday
   - Distance calculation
   - Time tracking

2. Visit (Enhanced)
   - Issue type, severity
   - Images & attachments
   - GPS coordinates

3. VisitAttachment (New)
   - Image storage
   - Metadata (size, dimensions)

4. Issue (New)
   - Issue reporting & tracking
   - Assignment & resolution

5. LocationPoint (New)
   - Real-time GPS data
   - Route reconstruction
```

**PostGIS Configuration (PostgreSQL):**
```sql
-- Enable PostGIS extension
CREATE EXTENSION postgis;

-- Create spatial index for performance
CREATE INDEX idx_location_point_location ON location_location_point 
USING GIST (location);

-- Create index for tracking queries
CREATE INDEX idx_workday_employee_date ON tracking_workday 
(employee_id, start_time DESC);
```

### 3. File Storage Configuration

**Image Upload Settings:**
```python
# settings.py
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# or AWS S3
AWS_STORAGE_BUCKET_NAME = 'kavya-agri-clinic'
AWS_S3_REGION_NAME = 'us-east-1'
DEFAULT_FILE_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'

# Image processing
THUMBNAIL_DEBUG = True
THUMBNAIL_ENGINE = 'easy_thumbnails.engines.sorl_thumbnail_engine'

# File size limits
DATA_UPLOAD_MAX_MEMORY_SIZE = 5242880  # 5MB
FILE_UPLOAD_MAX_MEMORY_SIZE = 5242880  # 5MB
MAX_UPLOAD_SIZE = 5242880
```

### 4. Real-time Updates (WebSocket)

**Django Channels Configuration:**
```python
# asgi.py
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from django.urls import path

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": AuthMiddlewareStack(
        URLRouter([
            path("ws/tracking/", TrackingConsumer.as_asgi()),
        ])
    ),
})

# Consumer for real-time tracking
class TrackingConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # Subscribe to tracking updates
        await self.channel_layer.group_add("tracking_updates", self.channel_name)
        await self.accept()
    
    async def tracking_update(self, event):
        # Broadcast location updates
        await self.send(text_data=json.dumps({
            'employee': event['employee'],
            'latitude': event['latitude'],
            'longitude': event['longitude'],
            'timestamp': event['timestamp']
        }))
```

---

## 📱 MOBILE APP REQUIREMENTS

### Tech Stack Options:
1. **React Native** (Cross-platform: iOS + Android)
2. **Flutter** (Cross-platform: iOS + Android)
3. **React Native + Expo** (Rapid development)

### Key Libraries:
```
React Native / Flutter:
├── React Native Maps / Google Maps Flutter
├── react-native-geolocation / geolocator
├── react-native-camera / image_picker
├── react-native-sqlite-storage (offline DB)
├── axios / http (API calls)
├── Redux / Provider (state management)
├── react-native-background-task (background tracking)
└── react-native-netinfo (connectivity)
```

### 1. Core Features

#### 1.1 Location Tracking Background Service
```
Features:
✅ Background location tracking
✅ Runs even when app is closed
✅ Battery-optimized (30-60 sec interval)
✅ Pause/resume on user action
✅ Works offline (queue + sync)
✅ Geofencing (optional)
✅ Heartbeat signal
```

**Android Permissions:**
```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
```

**iOS Info.plist:**
```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>We need your location to track field visits</string>
<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>We need your location even when app is closed for field tracking</string>
<key>NSCameraUsageDescription</key>
<string>We need camera access to capture field photos</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>We need access to your photos</string>
```

#### 1.2 Visit Workflow
```
Step 1: Create Visit
   ↓
Step 2: Capture Location (auto)
   ↓
Step 3: Select Farmer (autocomplete)
   ↓
Step 4: Select Crop Type
   ↓
Step 5: Take Photos (1-5 images)
   ↓
Step 6: Add Issue Details (if any)
   ↓
Step 7: Submit (sync to server)
```

#### 1.3 Offline Capabilities
```
SQLite Local Database:
├── Visits (queued for sync)
├── Images (stored locally + upload when online)
├── Location points (cached)
├── Farmers (master data)
└── Crops (master data)

Sync Strategy:
├── Auto-sync when connected
├── Manual sync button
├── Conflict resolution
├── Retry logic (exponential backoff)
└── Progress indicator
```

---

## 🔐 Security & Compliance

### 1. Authentication
```
✅ JWT token-based auth
✅ Refresh token mechanism
✅ Token expiration (15 min access, 7 day refresh)
✅ Secure token storage (iOS Keychain, Android Keystore)
```

### 2. Data Protection
```
✅ HTTPS/TLS 1.2+ for all API calls
✅ Encrypt sensitive data at rest
✅ Image compression before upload
✅ Location data access logs
✅ User consent for tracking
```

### 3. Image Security
```
✅ Virus scanning on upload
✅ Image watermarking (optional)
✅ CDN delivery with signed URLs
✅ EXIF data removal/retention policy
✅ Backup & redundancy
```

### 4. Privacy
```
✅ GDPR compliant (if applicable)
✅ Data retention policy
✅ User data export capability
✅ Right to be forgotten
✅ Consent management
```

---

## 📊 Performance & Scalability

### 1. Backend Optimization
```
Database:
├── Indexing on frequently queried fields
├── Connection pooling
├── Query optimization (select_related, prefetch_related)
├── Caching strategy (Redis)
└── Database replication (for HA)

API:
├── Pagination (page size: 20-50)
├── Response compression (gzip)
├── Rate limiting per user
├── Async tasks (Celery) for image processing
└── CDN for static content
```

### 2. Frontend Optimization
```
Web:
├── Code splitting
├── Lazy loading components
├── Image optimization (compression, webp)
├── Service worker for offline caching
└── Virtual scrolling for long lists

Mobile:
├── Minimize network requests
├── Local caching (SQLite)
├── Image compression before upload
├── Batch API calls
└── Progressive image loading
```

### 3. Real-time Data
```
├── WebSocket for live updates (optional)
├── Polling fallback (10-30 sec intervals)
├── Delta updates (only changed data)
├── Message queuing (RabbitMQ/Kafka)
└── Load balancing across servers
```

---

## 🚀 Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)
```
✅ Database schema design & migrations
✅ Enhanced Visit & Issue models
✅ Basic API endpoints (CRUD)
✅ Image upload endpoint
✅ Authentication & authorization
```

### Phase 2: Tracking (Weeks 3-4)
```
✅ GPS location tracking API
✅ Workday start/end endpoints
✅ Route calculation & storage
✅ Location point model & queries
✅ Background job for location updates
```

### Phase 3: Frontend Web Panel (Weeks 5-6)
```
✅ Live map with Leaflet.js
✅ Employee tracking dashboard
✅ Issue management interface
✅ Visit creation form
✅ Image upload & viewer
```

### Phase 4: Mobile App (Weeks 7-9)
```
✅ React Native setup
✅ Background location tracking
✅ Visit creation workflow
✅ Photo capture & upload
✅ Offline sync mechanism
✅ Testing & optimization
```

### Phase 5: Admin Features (Weeks 10-11)
```
✅ Analytics dashboard
✅ Report generation
✅ Employee performance tracking
✅ Issue resolution workflow
✅ Export functionality
```

### Phase 6: Deployment & QA (Week 12+)
```
✅ Server setup & configuration
✅ Database backup & recovery
✅ Load testing
✅ Security audit
✅ User training
✅ Production deployment
```

---

## 📋 API Integration Checklist

### Frontend Needs to Implement:
```
POST   /api/tracking/location/push/          ✅ Send GPS
POST   /api/tracking/heartbeat/              ✅ Keep alive
POST   /api/visits/create/                   ✅ Create visit
POST   /api/visits/{id}/attachments/         ✅ Upload images
GET    /api/tracking/admin/geo/employees/    ✅ Get all employees
GET    /api/tracking/admin/geo/routes/{id}/  ✅ Get individual route
GET    /api/issues/list/                     ✅ Get issues
PATCH  /api/issues/{id}/status/              ✅ Update issue status
GET    /api/reports/daily/                   ✅ Get reports
```

---

## 🎯 Success Metrics

### KPIs to Track:
```
1. Field Coverage
   - % of area covered per day
   - Visits per employee per day
   - Distance covered (km)

2. Issue Reporting
   - Issues reported per visit
   - Resolution time (avg)
   - Open vs closed issues ratio

3. System Performance
   - Uptime (target: 99.5%)
   - API response time (< 200ms)
   - Image upload success rate (> 99%)

4. User Adoption
   - Daily active employees
   - Average session duration
   - Feature usage rates
```

---

## 📞 Support & Documentation

### Documentation Deliverables:
```
✅ API documentation (Swagger/OpenAPI)
✅ Database schema diagram (ERD)
✅ Architecture documentation
✅ Deployment guide
✅ User guides (admin & field agents)
✅ Mobile app setup guide
✅ Troubleshooting guide
```

---

## ✅ Summary: What's Needed

| Component | What's Needed | Priority |
|-----------|--------------|----------|
| **Backend Images** | VisitAttachment model, S3/file storage | 🔴 CRITICAL |
| **Visit Issues** | Issue model, type/severity fields | 🔴 CRITICAL |
| **GPS Tracking** | LocationPoint model, route APIs | 🔴 CRITICAL |
| **Admin Map** | Leaflet.js integration, GeoJSON API | 🔴 CRITICAL |
| **Image Upload API** | Multipart endpoint, compression | 🔴 CRITICAL |
| **Employee Tracking Page** | React component, WebSocket connection | 🟠 HIGH |
| **Mobile App** | React Native, background tracking | 🟠 HIGH |
| **Real-time Updates** | Django Channels, WebSocket | 🟠 HIGH |
| **Issue Dashboard** | Severity filter, image viewer | 🟠 HIGH |
| **Export Reports** | PDF/CSV generation | 🟡 MEDIUM |
| **Analytics** | Charts, KPI widgets | 🟡 MEDIUM |
| **Offline Sync** | Conflict resolution, retry logic | 🟡 MEDIUM |

---

**Last Updated:** February 2026  
**Status:** Requirements Document - Ready for Development
