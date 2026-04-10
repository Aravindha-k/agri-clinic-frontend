# Admin Dashboard Components Guide
## React Components for Employee Tracking & Issue Management

---

## 📊 Overview

This guide provides ready-to-use React components for the admin dashboard to monitor employees, track field visits, manage issues, and view analytics.

---

## 🗺️ 1. Employee Tracking Map Component

### File: `src/pages/EmployeeTracking.jsx`

```jsx
import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import { trackingApi } from '../api/tracking.api';
import '../styles/map.css';

// Custom icons
const createEmployeeIcon = (status) => {
  const colors = {
    active: '#84c225',
    break: '#f39c12',
    ended: '#95a5a6'
  };
  
  return L.circleMarker(undefined, {
    radius: 8,
    fillColor: colors[status] || '#2d5016',
    color: '#fff',
    weight: 3,
    opacity: 1,
    fillOpacity: 0.8
  });
};

export default function EmployeeTracking() {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mapCenter, setMapCenter] = useState([20.5937, 78.9629]); // India center
  const [zoomLevel, setZoomLevel] = useState(5);

  useEffect(() => {
    fetchEmployeeLocations();
    // Refresh every 30 seconds
    const interval = setInterval(fetchEmployeeLocations, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchEmployeeLocations = async () => {
    try {
      const response = await trackingApi.getEmployeesGeoJSONRealtime();
      setEmployees(response.data.features || []);
    } catch (error) {
      console.error('Failed to fetch locations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEmployeeClick = (employee) => {
    setSelectedEmployee(employee);
    const [lng, lat] = employee.geometry.coordinates;
    setMapCenter([lat, lng]);
    setZoomLevel(12);
  };

  return (
    <div className="employee-tracking">
      <div className="tracking-container">
        {/* Map */}
        <div className="map-section">
          <MapContainer
            center={mapCenter}
            zoom={zoomLevel}
            style={{ width: '100%', height: '600px' }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; OpenStreetMap contributors'
            />
            
            {employees.map((emp) => (
              <Marker
                key={emp.properties.employee_id}
                position={[
                  emp.geometry.coordinates[1],
                  emp.geometry.coordinates[0]
                ]}
                icon={createEmployeeIcon(emp.properties.status)}
                onClick={() => handleEmployeeClick(emp)}
              >
                <Popup>
                  <div className="marker-popup">
                    <p><strong>{emp.properties.employee_name}</strong></p>
                    <p>Status: {emp.properties.status}</p>
                    <p>Accuracy: {emp.properties.accuracy}m</p>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

        {/* Employee List Sidebar */}
        <div className="list-section">
          <h3>Active Employees ({employees.length})</h3>
          <div className="employee-list">
            {loading ? (
              <p>Loading...</p>
            ) : employees.length === 0 ? (
              <p className="no-data">No active employees</p>
            ) : (
              employees.map((emp) => (
                <div
                  key={emp.properties.employee_id}
                  className={`employee-item ${selectedEmployee?.properties.employee_id === emp.properties.employee_id ? 'active' : ''}`}
                  onClick={() => handleEmployeeClick(emp)}
                >
                  <div className="emp-header">
                    <h4>{emp.properties.employee_name}</h4>
                    <span className={`status-badge ${emp.properties.status}`}>
                      {emp.properties.status}
                    </span>
                  </div>
                  <p><small>Phone: {emp.properties.phone}</small></p>
                  <p><small>Area: {emp.properties.village}</small></p>
                  <p><small>Last Update: {new Date(emp.properties.last_update).toLocaleTimeString()}</small></p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Detail Panel */}
      {selectedEmployee && (
        <EmployeeDetailPanel employee={selectedEmployee} />
      )}
    </div>
  );
}

function EmployeeDetailPanel({ employee }) {
  return (
    <div className="detail-panel">
      <div className="detail-header">
        <h3>{employee.properties.employee_name}</h3>
        <button className="close-btn">✕</button>
      </div>
      
      <div className="detail-grid">
        <div className="detail-item">
          <label>Phone</label>
          <p>{employee.properties.phone}</p>
        </div>
        <div className="detail-item">
          <label>Status</label>
          <p>{employee.properties.status}</p>
        </div>
        <div className="detail-item">
          <label>Location</label>
          <p>{employee.properties.village}</p>
        </div>
        <div className="detail-item">
          <label>Visits Today</label>
          <p>{employee.properties.visits_count}</p>
        </div>
        <div className="detail-item">
          <label>Distance Covered</label>
          <p>{employee.properties.distance}km</p>
        </div>
        <div className="detail-item">
          <label>Accuracy</label>
          <p>{employee.properties.accuracy}m</p>
        </div>
      </div>

      <button className="btn btn-primary">View Full Route</button>
    </div>
  );
}
```

### CSS Styles: `src/styles/map.css`

```css
.employee-tracking {
  display: flex;
  height: calc(100vh - 200px);
  gap: 20px;
}

.tracking-container {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 20px;
  flex: 1;
}

.map-section {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.list-section {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  overflow-y: auto;
}

.list-section h3 {
  color: #2d5016;
  margin-bottom: 15px;
  font-size: 16px;
}

.employee-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.employee-item {
  padding: 12px;
  border: 2px solid transparent;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
  background: #f9f9f9;
}

.employee-item:hover,
.employee-item.active {
  border-color: #84c225;
  background: #f0f9e8;
}

.emp-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.emp-header h4 {
  margin: 0;
  font-size: 14px;
  color: #2d5016;
}

.status-badge {
  font-size: 11px;
  padding: 4px 8px;
  border-radius: 4px;
  font-weight: 600;
}

.status-badge.active {
  background: #d4edda;
  color: #155724;
}

.status-badge.break {
  background: #fff3cd;
  color: #856404;
}

.status-badge.ended {
  background: #e2e3e5;
  color: #383d41;
}

.marker-popup {
  font-size: 12px;
}

.marker-popup p {
  margin: 5px 0;
}

.detail-panel {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  border-bottom: 2px solid #e0e0e0;
  padding-bottom: 15px;
}

.detail-header h3 {
  margin: 0;
  color: #2d5016;
}

.close-btn {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: #666;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 15px;
  margin-bottom: 20px;
}

.detail-item {
  display: flex;
  flex-direction: column;
}

.detail-item label {
  font-size: 12px;
  color: #666;
  text-transform: uppercase;
  margin-bottom: 5px;
  font-weight: 600;
}

.detail-item p {
  margin: 0;
  font-size: 14px;
  color: #333;
}

@media (max-width: 1024px) {
  .tracking-container {
    grid-template-columns: 1fr;
  }

  .detail-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .employee-tracking {
    flex-direction: column;
  }

  .detail-grid {
    grid-template-columns: 1fr;
  }
}
```

---

## 📋 2. Issue Management Dashboard

### File: `src/pages/IssueManagement.jsx`

```jsx
import React, { useState, useEffect } from 'react';
import { issueApi } from '../api/issue.api';
import { AlertCircle, CheckCircle, Clock, Eye } from 'lucide-react';

export default function IssueManagement() {
  const [issues, setIssues] = useState([]);
  const [filteredIssues, setFilteredIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [filters, setFilters] = useState({
    severity: 'all',
    status: 'all',
    search: '',
  });

  useEffect(() => {
    fetchIssues();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [issues, filters]);

  const fetchIssues = async () => {
    try {
      setLoading(true);
      const response = await issueApi.getIssues();
      setIssues(response.data);
    } catch (error) {
      console.error('Failed to fetch issues:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = issues;

    if (filters.severity !== 'all') {
      filtered = filtered.filter(i => i.severity === filters.severity);
    }

    if (filters.status !== 'all') {
      filtered = filtered.filter(i => i.status === filters.status);
    }

    if (filters.search) {
      filtered = filtered.filter(i =>
        i.title.toLowerCase().includes(filters.search.toLowerCase()) ||
        i.farmer_name.toLowerCase().includes(filters.search.toLowerCase())
      );
    }

    setFilteredIssues(filtered);
  };

  const handleStatusChange = async (issueId, newStatus) => {
    try {
      await issueApi.updateIssueStatus(issueId, newStatus);
      fetchIssues();
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const severityColor = {
    high: '#e74c3c',
    medium: '#f39c12',
    low: '#27ae60'
  };

  return (
    <div className="issue-management">
      {/* Header */}
      <div className="page-header">
        <div>
          <h2>Issue Management</h2>
          <p className="text-gray-600">Total Issues: {issues.length}</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <StatCard
          icon={<AlertCircle className="text-red-500" />}
          label="High Priority"
          value={issues.filter(i => i.severity === 'high').length}
          color="bg-red-50"
        />
        <StatCard
          icon={<Clock className="text-yellow-500" />}
          label="In Progress"
          value={issues.filter(i => i.status === 'in_progress').length}
          color="bg-yellow-50"
        />
        <StatCard
          icon={<CheckCircle className="text-green-500" />}
          label="Resolved"
          value={issues.filter(i => i.status === 'resolved').length}
          color="bg-green-50"
        />
      </div>

      {/* Filters */}
      <div className="filter-section">
        <input
          type="text"
          placeholder="Search by issue or farmer name..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          className="filter-input"
        />

        <select
          value={filters.severity}
          onChange={(e) => setFilters({ ...filters, severity: e.target.value })}
          className="filter-select"
        >
          <option value="all">All Severities</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>

        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className="filter-select"
        >
          <option value="all">All Status</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      {/* Main Content */}
      <div className="issue-content">
        {/* Issue List */}
        <div className="issue-list">
          {loading ? (
            <div className="loading">Loading issues...</div>
          ) : filteredIssues.length === 0 ? (
            <div className="no-data">No issues found</div>
          ) : (
            filteredIssues.map(issue => (
              <div
                key={issue.id}
                className={`issue-card ${selectedIssue?.id === issue.id ? 'active' : ''}`}
                onClick={() => setSelectedIssue(issue)}
              >
                <div className="issue-card-header">
                  <div>
                    <h4>{issue.title}</h4>
                    <p className="text-sm text-gray-500">{issue.farmer_name} - {issue.village}</p>
                  </div>
                  <div
                    className="severity-badge"
                    style={{ backgroundColor: severityColor[issue.severity] }}
                  >
                    {issue.severity.toUpperCase()}
                  </div>
                </div>

                <div className="issue-meta">
                  <span className="status-badge" style={{ backgroundColor: getStatusColor(issue.status) }}>
                    {issue.status.replace('_', ' ').toUpperCase()}
                  </span>
                  <span className="date-text">{new Date(issue.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Issue Detail */}
        {selectedIssue && (
          <IssueDetailView
            issue={selectedIssue}
            onStatusChange={handleStatusChange}
          />
        )}
      </div>
    </div>
  );
}

function IssueDetailView({ issue, onStatusChange }) {
  return (
    <div className="issue-detail">
      <div className="detail-header">
        <h3>{issue.title}</h3>
        <Eye size={20} />
      </div>

      <div className="detail-section">
        <h4>Farmer Information</h4>
        <div className="detail-grid">
          <div>
            <label>Name</label>
            <p>{issue.farmer_name}</p>
          </div>
          <div>
            <label>Phone</label>
            <p>{issue.farmer_phone}</p>
          </div>
          <div>
            <label>Village</label>
            <p>{issue.village}</p>
          </div>
          <div>
            <label>Crop</label>
            <p>{issue.crop}</p>
          </div>
        </div>
      </div>

      <div className="detail-section">
        <h4>Issue Details</h4>
        <div className="detail-text">
          <p>{issue.description}</p>
        </div>
      </div>

      {issue.recommended_solution && (
        <div className="detail-section">
          <h4>Recommended Solution</h4>
          <div className="solution-box">
            <p>{issue.recommended_solution}</p>
          </div>
        </div>
      )}

      {issue.images && issue.images.length > 0 && (
        <div className="detail-section">
          <h4>Images ({issue.images.length})</h4>
          <div className="image-gallery">
            {issue.images.map((img, idx) => (
              <img key={idx} src={img.url} alt="Issue" className="gallery-image" />
            ))}
          </div>
        </div>
      )}

      <div className="detail-section">
        <h4>Status & Actions</h4>
        <select
          value={issue.status}
          onChange={(e) => onStatusChange(issue.id, e.target.value)}
          className="status-select"
        >
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }) {
  return (
    <div className={`stat-card ${color}`}>
      <div className="stat-icon">{icon}</div>
      <div className="stat-content">
        <p className="stat-label">{label}</p>
        <p className="stat-value">{value}</p>
      </div>
    </div>
  );
}

function getStatusColor(status) {
  const colors = {
    open: '#3498db',
    in_progress: '#f39c12',
    resolved: '#27ae60',
    closed: '#95a5a6'
  };
  return colors[status] || '#3498db';
}
```

### Styles for Issue Management:

```css
.issue-management {
  padding: 20px;
}

.issue-content {
  display: grid;
  grid-template-columns: 1fr 1.2fr;
  gap: 20px;
  margin-top: 20px;
}

.issue-list {
  background: white;
  border-radius: 12px;
  overflow-y: auto;
  max-height: 600px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.issue-card {
  padding: 15px;
  border-left: 4px solid #ddd;
  cursor: pointer;
  transition: all 0.3s;
  border-bottom: 1px solid #eee;
}

.issue-card:hover,
.issue-card.active {
  background: #f9f9f9;
  border-left-color: #2d5016;
}

.issue-card-header {
  display: flex;
  justify-content: space-between;
  align-items: start;
  gap: 10px;
}

.issue-card-header h4 {
  margin: 0 0 5px 0;
  color: #2d5016;
  font-size: 14px;
}

.severity-badge {
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
}

.issue-meta {
  display: flex;
  gap: 10px;
  margin-top: 10px;
  font-size: 12px;
}

.status-badge {
  padding: 4px 8px;
  border-radius: 4px;
  color: white;
  font-size: 11px;
  font-weight: 600;
}

.issue-detail {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  overflow-y: auto;
  max-height: 600px;
}

.detail-section {
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #eee;
}

.detail-section:last-child {
  border-bottom: none;
}

.detail-section h4 {
  color: #2d5016;
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 15px;
}

.detail-grid > div label {
  display: block;
  font-size: 12px;
  color: #666;
  margin-bottom: 5px;
  font-weight: 600;
}

.detail-grid > div p {
  margin: 0;
  font-size: 14px;
  color: #333;
}

.image-gallery {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.gallery-image {
  width: 100%;
  height: 120px;
  object-fit: cover;
  border-radius: 8px;
  cursor: pointer;
}

.filter-section {
  display: flex;
  gap: 10px;
  background: white;
  padding: 15px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.filter-input,
.filter-select {
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 14px;
}

.filter-input {
  flex: 1;
}

@media (max-width: 1024px) {
  .issue-content {
    grid-template-columns: 1fr;
  }
}
```

---

## 📈 3. Visit Analytics Dashboard

### File: `src/pages/VisitAnalytics.jsx`

```jsx
import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { visitApi } from '../api/visit.api';

export default function VisitAnalytics() {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('7days'); // 7days, 30days, 90days

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await visitApi.getVisitStatistics({ range: dateRange });
      setAnalyticsData(response.data);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">Loading analytics...</div>;

  return (
    <div className="analytics-dashboard">
      <div className="page-header">
        <h2>Visit Analytics</h2>
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          className="date-range-select"
        >
          <option value="7days">Last 7 Days</option>
          <option value="30days">Last 30 Days</option>
          <option value="90days">Last 90 Days</option>
        </select>
      </div>

      {/* Summary Stats */}
      <div className="stats-grid">
        <StatCard
          label="Total Visits"
          value={analyticsData.total_visits}
          change={analyticsData.visits_change}
        />
        <StatCard
          label="Avg. Visits/Day"
          value={analyticsData.avg_visits_per_day}
        />
        <StatCard
          label="Issues Found"
          value={analyticsData.total_issues}
          color="orange"
        />
        <StatCard
          label="Resolution Rate"
          value={`${analyticsData.resolution_rate}%`}
          color="green"
        />
      </div>

      {/* Charts */}
      <div className="charts-grid">
        {/* Visits Trend */}
        <div className="chart-container">
          <h3>Visits Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analyticsData.visits_trend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="visits" stroke="#84c225" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Visits by Crop */}
        <div className="chart-container">
          <h3>Visits by Crop</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analyticsData.visits_by_crop}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="crop" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#2d5016" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Issues by Type */}
        <div className="chart-container">
          <h3>Issues by Type</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analyticsData.issues_by_type}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="type" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#e74c3c" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Employee Performance */}
        <div className="chart-container">
          <h3>Top Performers</h3>
          <div className="top-performers">
            {analyticsData.top_performers.map((emp, idx) => (
              <div key={idx} className="performer-row">
                <span>{idx + 1}</span>
                <span>{emp.name}</span>
                <span className="visits-badge">{emp.visits} visits</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, change, color = 'blue' }) {
  return (
    <div className={`stat-card stat-${color}`}>
      <p className="stat-label">{label}</p>
      <p className="stat-value">{value}</p>
      {change && <p className="stat-change">{change > 0 ? '↑' : '↓'} {Math.abs(change)}%</p>}
    </div>
  );
}
```

---

## ✅ Component Checklist

- [x] Employee Tracking Map
- [x] Issue Management Dashboard
- [x] Visit Analytics
- [ ] Heatmap Visualization
- [ ] Real-time Notifications
- [ ] Export Reports
- [ ] Farmer Database Viewer
- [ ] Workday Reports
- [ ] Performance Metrics
- [ ] Settings & Configuration

---

**Status:** Ready for Frontend Integration
