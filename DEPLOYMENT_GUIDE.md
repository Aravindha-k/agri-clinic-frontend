# Deployment & DevOps Guide
## Production Setup for Kavya Agri Clinic

---

## 🚀 Production Checklist

### Phase 1: Environment Setup
- [ ] AWS/Azure/DigitalOcean account created
- [ ] Domain registered
- [ ] SSL certificates generated
- [ ] Database backups configured
- [ ] CDN setup for static assets

### Phase 2: Backend Deployment
- [ ] Production Django settings
- [ ] PostgreSQL with PostGIS
- [ ] Redis cache configured
- [ ] Django Channels WebSocket
- [ ] Celery task queue
- [ ] Email service setup

### Phase 3: Frontend Deployment
- [ ] Production build optimized
- [ ] S3/Cloud storage configured
- [ ] CDN distribution
- [ ] Analytics tracking
- [ ] Error monitoring

### Phase 4: Mobile Deployment
- [ ] iOS build (.ipa)
- [ ] Android build (.apk/.aab)
- [ ] TestFlight distribution
- [ ] Google Play beta testing
- [ ] App Store submission

### Phase 5: Monitoring & Maintenance
- [ ] Server monitoring (CPU, RAM, disk)
- [ ] Application performance monitoring (APM)
- [ ] Log aggregation
- [ ] Error tracking (Sentry)
- [ ] Uptime monitoring

---

## 1. Backend Deployment (Django + PostgreSQL)

### Option A: AWS EC2 + RDS

#### Step 1: Launch EC2 Instance

```bash
# AWS Recommended Specs for Production:
# - Instance: t3.medium or t3.large
# - Storage: 100GB EBS (gp3)
# - OS: Ubuntu 22.04 LTS
# - Security Group: SSH(22), HTTP(80), HTTPS(443)
```

#### Step 2: Install Dependencies

```bash
#!/bin/bash
# SSH into your instance first
ssh -i your-key.pem ubuntu@your-instance-ip

# Update system
sudo apt update && sudo apt upgrade -y

# Install Python & dependencies
sudo apt install -y python3.10 python3-pip python3-venv
sudo apt install -y postgresql-client libpq-dev
sudo apt install -y redis-server
sudo apt install -y nginx supervisor

# Create application directory
sudo mkdir -p /var/www/kavya-agri
sudo chown ubuntu:ubuntu /var/www/kavya-agri
cd /var/www/kavya-agri

# Setup virtual environment
python3 -m venv venv
source venv/bin/activate

# Clone your Django project
git clone your-django-repo .

# Install Python packages
pip install -r requirements.txt

# Collect static files
python manage.py collectstatic --noinput
```

#### Step 3: Create RDS PostgreSQL Database

```bash
# Via AWS Console:
# - Engine: PostgreSQL 14+
# - Instance: db.t3.medium
# - Storage: 100GB, gp3
# - Multi-AZ: Yes (for high availability)
# - Backup: 30 days retention
# - Create PostGIS extension

# Connect to database
psql -h your-rds-endpoint.amazonaws.com -U postgres

# Create database and extension
CREATE DATABASE kavya_agri;
CREATE EXTENSION postgis;
CREATE EXTENSION postgis_topology;

# Create Django user
CREATE USER django WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE kavya_agri TO django;
```

#### Step 4: Configure Django Settings

```python
# settings/production.py

import os
from pathlib import Path

ALLOWED_HOSTS = ['yourdomain.com', 'www.yourdomain.com', 'api.yourdomain.com']

# Database
DATABASES = {
    'default': {
        'ENGINE': 'django.contrib.gis.db.backends.postgis',
        'NAME': os.getenv('DB_NAME', 'kavya_agri'),
        'USER': os.getenv('DB_USER', 'django'),
        'PASSWORD': os.getenv('DB_PASSWORD'),
        'HOST': os.getenv('DB_HOST'),
        'PORT': os.getenv('DB_PORT', '5432'),
    }
}

# Cache
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': os.getenv('REDIS_URL', 'redis://127.0.0.1:6379/1'),
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        }
    }
}

# Security
DEBUG = False
SECRET_KEY = os.getenv('SECRET_KEY')
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# API Config
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
}

# CORS
CORS_ALLOWED_ORIGINS = [
    'https://yourdomain.com',
    'https://www.yourdomain.com',
]

# Email Configuration (for password resets, notifications)
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.gmail.com'  # or SendGrid, AWS SES
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER')
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD')

# File Storage (S3)
DEFAULT_FILE_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'
AWS_STORAGE_BUCKET_NAME = os.getenv('AWS_STORAGE_BUCKET_NAME')
AWS_S3_REGION_NAME = 'ap-south-1'
AWS_S3_CUSTOM_DOMAIN = f'{AWS_STORAGE_BUCKET_NAME}.s3.amazonaws.com'
STATIC_URL = f'https://{AWS_S3_CUSTOM_DOMAIN}/static/'
MEDIA_URL = f'https://{AWS_S3_CUSTOM_DOMAIN}/media/'

# Logging
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'file': {
            'level': 'ERROR',
            'class': 'logging.FileHandler',
            'filename': '/var/log/django/error.log',
        },
        'sentry': {
            'level': 'ERROR',
            'class': 'sentry_sdk.integrations.logging.EventHandler',
        },
    },
    'root': {
        'handlers': ['file', 'sentry'],
        'level': 'INFO',
    },
}

# Sentry (Error Tracking)
import sentry_sdk
from sentry_sdk.integrations.django import DjangoIntegration

sentry_sdk.init(
    dsn=os.getenv('SENTRY_DSN'),
    integrations=[DjangoIntegration()],
    traces_sample_rate=0.1,
    send_default_pii=False,
)
```

#### Step 5: Gunicorn Setup

```bash
# Create gunicorn config
cat > /var/www/kavya-agri/gunicorn_config.py << EOF
import multiprocessing

workers = multiprocessing.cpu_count() * 2 + 1
worker_class = 'sync'
worker_connections = 1000
timeout = 30
keepalive = 2
max_requests = 1000
max_requests_jitter = 100
EOF

# Create systemd service
sudo tee /etc/systemd/system/kavya-gunicorn.service > /dev/null << EOF
[Unit]
Description=Kavya Agri Gunicorn Service
After=network.target

[Service]
Type=notify
User=ubuntu
WorkingDirectory=/var/www/kavya-agri
ExecStart=/var/www/kavya-agri/venv/bin/gunicorn \
    --config gunicorn_config.py \
    --bind 127.0.0.1:8000 \
    config.wsgi:application
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable kavya-gunicorn
sudo systemctl start kavya-gunicorn
```

#### Step 6: Nginx Configuration

```nginx
# /etc/nginx/sites-available/kavya-agri

upstream gunicorn {
    server 127.0.0.1:8000;
}

server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com api.yourdomain.com;
    
    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com api.yourdomain.com;
    
    # SSL Certificates
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    # SSL Settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Gzip
    gzip on;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json;
    
    # Client limits
    client_max_body_size 100M;
    
    # Static files
    location /static/ {
        alias /var/www/kavya-agri/staticfiles/;
        expires 30d;
    }
    
    # Proxy to Gunicorn
    location / {
        proxy_pass http://gunicorn;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_redirect off;
        
        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/kavya-agri /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Setup SSL with Let's Encrypt
sudo apt install certbot python3-certbot-nginx -y
sudo certbot certonly --nginx -d yourdomain.com -d www.yourdomain.com -d api.yourdomain.com
```

#### Step 7: Environment Variables

```bash
# Create .env file
cat > /var/www/kavya-agri/.env << EOF
DEBUG=False
SECRET_KEY=your-very-secure-secret-key-here-min-50-chars

# Database
DB_ENGINE=django.contrib.gis.db.backends.postgis
DB_NAME=kavya_agri
DB_USER=django
DB_PASSWORD=your-secure-password
DB_HOST=your-rds-endpoint.amazonaws.com
DB_PORT=5432

# Redis
REDIS_URL=redis://127.0.0.1:6379/1

# AWS S3
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
AWS_STORAGE_BUCKET_NAME=kavya-agri-media
AWS_S3_REGION_NAME=ap-south-1

# Email
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password

# Sentry
SENTRY_DSN=your-sentry-dsn

# JWT
JWT_SECRET_KEY=your-jwt-secret-key
EOF

sudo chown ubuntu:ubuntu /var/www/kavya-agri/.env
sudo chmod 600 /var/www/kavya-agri/.env
```

---

## 2. Frontend Deployment (React + Vite)

### Build and Deploy to AWS S3 + CloudFront

```bash
# Build production bundle
npm run build

# Upload to S3
aws s3 sync dist/ s3://kavya-agri-web/ --delete --cache-control "max-age=31536000"

# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/*"
```

### Environment Configuration

```bash
# .env.production
VITE_API_URL=https://api.yourdomain.com
VITE_APP_NAME=Kavya Agri Clinic
VITE_SENTRY_DSN=your-sentry-dsn
```

### Nginx Configuration for SPA

```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;
    
    location / {
        root /var/www/kavya-agri-web;
        try_files $uri $uri/ /index.html;
        
        # Cache busting for JS/CSS
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
}
```

---

## 3. Mobile App Deployment

### iOS (App Store)

```bash
# Prerequisites
# - Apple Developer Account
# - TestFlight setup
# - Certificate, profile, provisioning

# Build release
npx react-native run-ios --configuration Release

# Archive
xcodebuild -workspace ios/KavyaAgriFarmVisit.xcworkspace \
  -scheme KavyaAgriFarmVisit \
  -configuration Release \
  -archivePath build/KavyaAgriFarmVisit.xcarchive \
  archive

# Export IPA
xcodebuild -exportArchive \
  -archivePath build/KavyaAgriFarmVisit.xcarchive \
  -exportOptionsPlist ios/ExportOptions.plist \
  -exportPath build/

# Upload to TestFlight via Transporter
# Then submit to App Store
```

### Android (Play Store)

```bash
# Generate signing key
keytool -genkey -v -keystore ~/kavya-agri-key.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias kavya-agri

# Build signed APK
cd android
./gradlew bundleRelease

# Upload bundle to Google Play Console
# - Internal testing → Beta → Production
```

---

## 4. Monitoring & Maintenance

### Server Health Monitoring

```bash
# Install monitoring tools
sudo apt install -y htop iotop nethogs glances

# Setup log rotation
sudo tee /etc/logrotate.d/django > /dev/null << EOF
/var/log/django/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
    postrotate
        systemctl restart kavya-gunicorn > /dev/null 2>&1 || true
    endscript
}
EOF
```

### Application Performance Monitoring

```python
# Add New Relic APM
pip install newrelic

# settings.py
import newrelic.agent
newrelic.agent.initialize(os.getenv('NEW_RELIC_CONFIG_FILE'))

# wsgi.py
application = newrelic.agent.wsgi_application()(application)
```

### Database Backups

```bash
# Automated daily backup
cat > /usr/local/bin/backup-db.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/backups/postgres"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR
pg_dump -h your-rds-endpoint.amazonaws.com \
  -U django \
  -d kavya_agri | gzip > $BACKUP_DIR/kavya_agri_$DATE.sql.gz

# Keep only last 30 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete

# Upload to S3
aws s3 cp $BACKUP_DIR/kavya_agri_$DATE.sql.gz s3://kavya-backups/
EOF

chmod +x /usr/local/bin/backup-db.sh

# Add to crontab
0 2 * * * /usr/local/bin/backup-db.sh >> /var/log/backup.log 2>&1
```

### Uptime Monitoring

```bash
# Using Pingdom API
curl -X POST https://api.pingdom.com/api/3.1/checks \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"name":"Kavya API","host":"api.yourdomain.com","type":"http"}'
```

---

## 5. Performance Optimization

### Database Query Optimization

```python
# profiles/models.py
from django.db.models import Prefetch

# Use select_related for ForeignKey
visits = Visit.objects.select_related('employee', 'farmer').all()

# Use prefetch_related for ManyToMany
crops = Crop.objects.prefetch_related('farms').all()

# Use Prefetch for complex queries
employees = Employee.objects.prefetch_related(
    Prefetch('visits', queryset=Visit.objects.filter(status='completed'))
).all()
```

### Caching Strategy

```python
# views.py
from django.views.decorators.cache import cache_page
from django.core.cache import cache

@cache_page(60 * 5)  # 5 minutes
def get_statistics(request):
    # Uses cache
    pass

# Manual caching
def get_employee_locations():
    cached = cache.get('employee_locations')
    if not cached:
        data = LocationPoint.objects.all()
        cache.set('employee_locations', data, 60)  # 1 minute
    return cached
```

### API Response Optimization

```python
# pagination & filtering
from rest_framework.pagination import PageNumberPagination

class OptimizedPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100

# Only return required fields
class EmployeeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Employee
        fields = ['id', 'name', 'phone', 'location']  # Not all fields
```

---

## Environment Setup Summary

```bash
Production Stack:
├── Frontend
│   ├── React 18 (Vite build)
│   ├── AWS S3 + CloudFront
│   └── Nginx reverse proxy
├── Backend
│   ├── Django 4.2+
│   ├── Gunicorn WSGI
│   ├── PostgreSQL 14 + PostGIS
│   ├── Redis cache
│   └── Celery task queue
└── Infrastructure
    ├── AWS EC2 (t3.large)
    ├── AWS RDS (db.t3.large)
    ├── AWS ElastiCache (redis)
    ├── CloudFront CDN
    ├── Route 53 DNS
    └── Certificate Manager SSL
```

---

**Estimated Deployment Timeline: 3-5 Business Days**
**Estimated Monthly Cost: $800-1200 USD**
