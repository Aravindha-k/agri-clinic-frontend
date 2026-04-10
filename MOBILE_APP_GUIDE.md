# Kavya Agri Clinic - Mobile App Requirements
## React Native / Flutter Implementation Guide

---

## 📱 Tech Stack Decision Guide

### Option 1: React Native (Recommended for your team)
**Pros:**
- Use existing React knowledge
- Single codebase for iOS & Android
- Faster development
- Expo for rapid prototyping
- Familiar JavaScript ecosystem

**Cons:**
- Slightly heavier than Flutter
- Bridge overhead for native code

**Setup:**
```bash
# Using Expo (recommended for quick start)
npx create-expo-app KavyaAgriFarmVisit
cd KavyaAgriFarmVisit

# Or using React Native CLI
npx react-native init KavyaAgriFarmVisit --template
```

### Option 2: Flutter
**Pros:**
- Better performance
- Beautiful UI out-of-box
- Single binary per platform
- Faster compile times

**Cons:**
- New language (Dart)
- Smaller ecosystem
- Learning curve

**Verdict:** **Use React Native** - leverage your existing React experience

---

## 🏗️ Mobile App Architecture

```
KavyaAgriFarmVisit/
├── App.js / App.tsx
├── src/
│   ├── screens/
│   │   ├── LoginScreen.js
│   │   ├── DashboardScreen.js
│   │   ├── WorkdayScreen.js
│   │   ├── VisitCreationScreen.js
│   │   ├── CameraScreen.js
│   │   ├── MapScreen.js
│   │   ├── VisitHistoryScreen.js
│   │   └── SettingsScreen.js
│   │
│   ├── components/
│   │   ├── LocationTracker.js
│   │   ├── ImageUploader.js
│   │   ├── FormInput.js
│   │   ├── LoadingSpinner.js
│   │   ├── GeoMap.js
│   │   └── SyncStatus.js
│   │
│   ├── services/
│   │   ├── api.js (Axios + interceptors)
│   │   ├── trackingService.js (GPS)
│   │   ├── storageService.js (SQLite)
│   │   ├── syncService.js (Offline sync)
│   │   ├── authService.js (JWT)
│   │   └── imageService.js (Compression)
│   │
│   ├── context/
│   │   ├── AuthContext.js
│   │   ├── LocationContext.js
│   │   ├── VisitContext.js
│   │   └── OfflineContext.js
│   │
│   ├── hooks/
│   │   ├── useLocation.js
│   │   ├── useWorkday.js
│   │   ├── useOfflineQueue.js
│   │   └── useImageCompression.js
│   │
│   ├── utils/
│   │   ├── validators.js
│   │   ├── formatters.js
│   │   ├── constants.js
│   │   └── errorHandler.js
│   │
│   ├── database/
│   │   └── sqlite.js (Local SQLite DB)
│   │
│   └── assets/
│       ├── icons/
│       ├── images/
│       └── fonts/
│
├── app.json (Expo config)
├── package.json
└── README.md
```

---

## 📦 Required Dependencies

### Installation:
```bash
npm install

# Navigation
npm install @react-navigation/native @react-navigation/bottom-tabs
npm install react-native-screens react-native-safe-area-context

# API & State Management
npm install axios redux react-redux redux-thunk redux-persist

# Location Services
npm install react-native-geolocation-service
npm install @react-native-camera-roll/camera-roll
npm install react-native-maps

# Database (Offline)
npm install react-native-sqlite-storage

# Images
npm install react-native-image-picker
npm native-image-crop-picker
npm install react-native-image-resizer

# Utils
npm install moment react-native-netinfo
npm install uuid
npm install @react-native-async-storage/async-storage

# UI
npm install react-native-paper
npm install react-native-gesture-handler
npm install lottie-react-native
```

---

## 🔐 Authentication Screen

### File: `src/screens/LoginScreen.js`

```jsx
import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
  SafeAreaView,
} from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Error', 'Please enter username and password');
      return;
    }

    setLoading(true);
    try {
      const success = await login(username, password);
      if (success) {
        navigation.replace('MainApp');
      }
    } catch (error) {
      Alert.alert('Login Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Logo */}
        <Image
          source={require('../assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />

        <Text style={styles.title}>Kavya Agri Clinic</Text>
        <Text style={styles.subtitle}>Farm Visit Tracking</Text>

        {/* Form */}
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Username"
            value={username}
            onChangeText={setUsername}
            editable={!loading}
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            editable={!loading}
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Sign In</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>© 2026 Kavya Agri Clinic</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  logo: {
    width: 80,
    height: 80,
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: '#2d5016',
    textAlign: 'center',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 40,
  },
  form: {
    gap: 15,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#2d5016',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    textAlign: 'center',
    color: '#ccc',
    fontSize: 12,
    marginTop: 40,
  },
});
```

---

## 📍 Workday Management Screen

### File: `src/screens/WorkdayScreen.js`

```jsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocation } from '../hooks/useLocation';
import { trackingService } from '../services/trackingService';

export default function WorkdayScreen() {
  const location = useLocation();
  const [workday, setWorkday] = useState(null);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    distance: '0 km',
    time: '0h 0m',
    visits: 0,
  });

  useEffect(() => {
    // Check if workday is active
    checkWorkday();
    
    // Update stats every minute
    const interval = setInterval(updateStats, 60000);
    return () => clearInterval(interval);
  }, []);

  const checkWorkday = async () => {
    try {
      const current = await trackingService.getCurrentWorkday();
      setWorkday(current);
      if (current) {
        startBackgroundTracking();
      }
    } catch (error) {
      console.log('No active workday');
    }
  };

  const handleStartWorkday = async () => {
    setLoading(true);
    try {
      if (!location) {
        Alert.alert('Error', 'Please enable GPS first');
        return;
      }

      const newWorkday = await trackingService.startWorkday(
        location.latitude,
        location.longitude
      );
      setWorkday(newWorkday);
      startBackgroundTracking();
      Alert.alert('Success', 'Workday started');
    } catch (error) {
      Alert.alert('Error', 'Failed to start workday');
    } finally {
      setLoading(false);
    }
  };

  const handleEndWorkday = async () => {
    Alert.alert('End Workday?', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'End',
        style: 'destructive',
        onPress: async () => {
          setLoading(true);
          try {
            await trackingService.endWorkday(
              location.latitude,
              location.longitude
            );
            setWorkday(null);
            stopBackgroundTracking();
            Alert.alert('Success', 'Workday ended');
          } catch (error) {
            Alert.alert('Error', 'Failed to end workday');
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  const startBackgroundTracking = async () => {
    // Start background location tracking service
    await trackingService.startBackgroundTracking();
  };

  const stopBackgroundTracking = async () => {
    await trackingService.stopBackgroundTracking();
  };

  const updateStats = async () => {
    // Fetch and update stats
    try {
      const data = await trackingService.getWorkdaySummary();
      setStats({
        distance: `${(data.total_distance || 0).toFixed(1)} km`,
        time: formatTime(data.total_time),
        visits: data.visits_count || 0,
      });
    } catch (error) {
      console.error('Failed to update stats');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Status Card */}
      <View style={styles.statusCard}>
        <Text style={styles.statusTitle}>
          {workday ? 'Workday Active' : 'No Active Workday'}
        </Text>
        
        {workday && (
          <>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Distance</Text>
                <Text style={styles.statValue}>{stats.distance}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Time</Text>
                <Text style={styles.statValue}>{stats.time}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Visits</Text>
                <Text style={styles.statValue}>{stats.visits}</Text>
              </View>
            </View>

            {/* GPS Status */}
            <View style={styles.gpsStatus}>
              <View style={[styles.indicator, location && styles.active]} />
              <Text style={styles.gpsText}>
                {location
                  ? `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`
                  : 'GPS: Searching...'}
              </Text>
            </View>
          </>
        )}
      </View>

      {/* Action Button */}
      <View style={styles.actionContainer}>
        {loading ? (
          <ActivityIndicator size="large" color="#2d5016" />
        ) : workday ? (
          <TouchableOpacity
            style={[styles.button, styles.endButton]}
            onPress={handleEndWorkday}
          >
            <Text style={styles.buttonText}>End Workday</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.button, styles.startButton]}
            onPress={handleStartWorkday}
          >
            <Text style={styles.buttonText}>Start Workday</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 15,
  },
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2d5016',
    marginBottom: 15,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2d5016',
  },
  gpsStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 10,
  },
  indicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ccc',
    marginRight: 10,
  },
  active: {
    backgroundColor: '#84c225',
  },
  gpsText: {
    fontSize: 13,
    color: '#666',
  },
  actionContainer: {
    marginTop: 'auto',
  },
  button: {
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
  },
  startButton: {
    backgroundColor: '#84c225',
  },
  endButton: {
    backgroundColor: '#e74c3c',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

function formatTime(seconds) {
  if (!seconds) return '0h 0m';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}
```

---

## 📸 Visit Creation Screen

### File: `src/screens/VisitCreationScreen.js`

```jsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { Picker } from '@react-native-picker/picker';
import { useLocation } from '../hooks/useLocation';
import { useImageCompression } from '../hooks/useImageCompression';
import { useOfflineQueue } from '../hooks/useOfflineQueue';
import { visitService } from '../services/visitService';

const ISSUE_TYPES = [
  { label: 'None', value: '' },
  { label: 'Leaf Disease', value: 'leaf_disease' },
  { label: 'Pest Infestation', value: 'pest_infestation' },
  { label: 'Nutrient Deficiency', value: 'nutrient_deficiency' },
  { label: 'Water Management', value: 'water_management' },
  { label: 'Soil Quality', value: 'soil_quality' },
  { label: 'Other', value: 'other' },
];

const SEVERITY_LEVELS = [
  { label: 'Low', value: 'low' },
  { label: 'Medium', value: 'medium' },
  { label: 'High', value: 'high' },
];

const CROPS = [
  { label: 'Tomato', value: 'Tomato' },
  { label: 'Chili', value: 'Chili' },
  { label: 'Brinjal', value: 'Brinjal' },
  { label: 'Cabbage', value: 'Cabbage' },
  { label: 'Other', value: 'Other' },
];

export default function VisitCreationScreen() {
  const location = useLocation();
  const { compressImage } = useImageCompression();
  const { addToQueue } = useOfflineQueue();

  const [form, setForm] = useState({
    farmer_name: '',
    farmer_phone: '',
    village: '',
    crop: 'Tomato',
    area_acres: '',
    issue_type: '',
    issue_description: '',
    severity: '',
    recommended_solution: '',
    notes: '',
  });

  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleAddPhoto = async (useCamera = true) => {
    const options = {
      mediaType: 'photo',
      quality: 0.8,
      maxWidth: 1920,
      maxHeight: 1920,
    };

    const pickerFunction = useCamera ? launchCamera : launchImageLibrary;

    pickerFunction(options, async (response) => {
      if (response.didCancel) return;
      if (response.errorCode) {
        Alert.alert('Error', response.errorMessage);
        return;
      }

      try {
        const compressed = await compressImage(response.assets[0].uri);
        setImages([...images, compressed]);
      } catch (error) {
        Alert.alert('Error', 'Failed to process image');
      }
    });
  };

  const handleSubmit = async () => {
    // Validation
    if (!form.farmer_name || !form.village || !location) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      const visitData = {
        ...form,
        latitude: location.latitude,
        longitude: location.longitude,
      };

      // If offline, queue the visit
      if (!navigator.onLine) {
        addToQueue('visit', visitData);
        Alert.alert('Saved', 'Visit saved locally. Will sync when online.');
        resetForm();
        return;
      }

      // Create visit
      const visit = await visitService.createVisit(visitData);

      // Upload images
      if (images.length > 0) {
        for (const image of images) {
          await visitService.uploadImage(visit.id, image);
        }
      }

      Alert.alert('Success', 'Visit created successfully');
      resetForm();
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
      farmer_name: '',
      farmer_phone: '',
      village: '',
      crop: 'Tomato',
      area_acres: '',
      issue_type: '',
      issue_description: '',
      severity: '',
      recommended_solution: '',
      notes: '',
    });
    setImages([]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Create Visit</Text>

        {/* Farmer Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Farmer Information</Text>
          
          <TextInput
            style={styles.input}
            placeholder="Farmer Name *"
            value={form.farmer_name}
            onChangeText={(val) => setForm({ ...form, farmer_name: val })}
          />

          <TextInput
            style={styles.input}
            placeholder="Phone Number"
            keyboardType="phone-pad"
            value={form.farmer_phone}
            onChangeText={(val) => setForm({ ...form, farmer_phone: val })}
          />

          <TextInput
            style={styles.input}
            placeholder="Village *"
            value={form.village}
            onChangeText={(val) => setForm({ ...form, village: val })}
          />
        </View>

        {/* Crop Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Crop Details</Text>
          
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={form.crop}
              onValueChange={(val) => setForm({ ...form, crop: val })}
            >
              {CROPS.map((c) => (
                <Picker.Item key={c.value} label={c.label} value={c.value} />
              ))}
            </Picker>
          </View>

          <TextInput
            style={styles.input}
            placeholder="Area (acres)"
            keyboardType="decimal-pad"
            value={form.area_acres}
            onChangeText={(val) => setForm({ ...form, area_acres: val })}
          />
        </View>

        {/* Issue Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Issue (if any)</Text>
          
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={form.issue_type}
              onValueChange={(val) => setForm({ ...form, issue_type: val })}
            >
              {ISSUE_TYPES.map((t) => (
                <Picker.Item key={t.value} label={t.label} value={t.value} />
              ))}
            </Picker>
          </View>

          {form.issue_type && (
            <>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={form.severity}
                  onValueChange={(val) => setForm({ ...form, severity: val })}
                >
                  {SEVERITY_LEVELS.map((s) => (
                    <Picker.Item key={s.value} label={s.label} value={s.value} />
                  ))}
                </Picker>
              </View>

              <TextInput
                style={[styles.input, styles.textarea]}
                placeholder="Issue Description"
                multiline
                numberOfLines={4}
                value={form.issue_description}
                onChangeText={(val) => setForm({ ...form, issue_description: val })}
              />

              <TextInput
                style={[styles.input, styles.textarea]}
                placeholder="Recommended Solution"
                multiline
                numberOfLines={3}
                value={form.recommended_solution}
                onChangeText={(val) => setForm({ ...form, recommended_solution: val })}
              />
            </>
          )}
        </View>

        {/* Photos Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Photos ({images.length})</Text>
          
          <View style={styles.photoGrid}>
            {images.map((img, idx) => (
              <Image key={idx} source={{ uri: img }} style={styles.thumbnail} />
            ))}
          </View>

          <View style={styles.photoButtons}>
            <TouchableOpacity
              style={styles.photoButton}
              onPress={() => handleAddPhoto(true)}
            >
              <Text style={styles.photoButtonText}>📷 Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.photoButton}
              onPress={() => handleAddPhoto(false)}
            >
              <Text style={styles.photoButtonText}>🖼️ Gallery</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <TextInput
            style={[styles.input, styles.textarea]}
            placeholder="Additional Notes"
            multiline
            numberOfLines={3}
            value={form.notes}
            onChangeText={(val) => setForm({ ...form, notes: val })}
          />
        </View>

        {/* Location Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location</Text>
          <Text style={styles.locationText}>
            {location
              ? `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`
              : 'Waiting for GPS...'}
          </Text>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.disabledButton]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Submit Visit</Text>
          )}
        </TouchableOpacity>

        <View style={styles.spacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#2d5016',
    marginBottom: 20,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    marginBottom: 10,
  },
  textarea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 10,
    overflow: 'hidden',
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 15,
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  photoButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  photoButton: {
    flex: 1,
    backgroundColor: '#2d5016',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  photoButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  locationText: {
    fontSize: 14,
    color: '#666',
    padding: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  submitButton: {
    backgroundColor: '#84c225',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  spacer: {
    height: 20,
  },
});
```

---

## 🔄 Offline Sync Service

### File: `src/services/syncService.js`

```javascript
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-netinfo';
import { visitService } from './visitService';

class SyncService {
  constructor() {
    this.syncQueue = [];
    this.isSyncing = false;
    NetInfo.addEventListener(this.handleConnectivityChange);
  }

  async addToQueue(type, data) {
    try {
      let queue = JSON.parse(await AsyncStorage.getItem('syncQueue')) || [];
      queue.push({ type, data, timestamp: Date.now(), id: Math.random() });
      await AsyncStorage.setItem('syncQueue', JSON.stringify(queue));
      this.syncQueue = queue;
    } catch (error) {
      console.error('Failed to add to queue:', error);
    }
  }

  handleConnectivityChange = async (state) => {
    if (state.isConnected && !this.isSyncing) {
      await this.syncAll();
    }
  };

  async syncAll() {
    if (this.isSyncing) return;
    
    this.isSyncing = true;
    try {
      const queue = this.syncQueue;
      
      for (const item of queue) {
        try {
          await this.syncItem(item);
          this.syncQueue = this.syncQueue.filter(q => q.id !== item.id);
        } catch (error) {
          console.error(`Failed to sync ${item.type}:`, error);
        }
      }
      
      await AsyncStorage.setItem('syncQueue', JSON.stringify(this.syncQueue));
    } finally {
      this.isSyncing = false;
    }
  }

  async syncItem(item) {
    switch (item.type) {
      case 'visit':
        return await visitService.createVisit(item.data);
      case 'image':
        return await visitService.uploadImage(item.data.visitId, item.data.uri);
      default:
        throw new Error(`Unknown sync type: ${item.type}`);
    }
  }

  async getQueueSize() {
    return this.syncQueue.length;
  }
}

export const syncService = new SyncService();
```

---

## 📱 App Navigation Setup

### File: `src/navigation/MainNavigator.js`

```javascript
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import LoginScreen from '../screens/LoginScreen';
import DashboardScreen from '../screens/DashboardScreen';
import WorkdayScreen from '../screens/WorkdayScreen';
import VisitCreationScreen from '../screens/VisitCreationScreen';
import VisitHistoryScreen from '../screens/VisitHistoryScreen';
import MapScreen from '../screens/MapScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function AuthNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
    </Stack.Navigator>
  );
}

function AppNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName;
          
          if (route.name === 'Dashboard') {
            iconName = 'home';
          } else if (route.name === 'Workday') {
            iconName = 'clock';
          } else if (route.name === 'NewVisit') {
            iconName = 'plus-circle';
          } else if (route.name === 'History') {
            iconName = 'history';
          } else if (route.name === 'Map') {
            iconName = 'map';
          } else if (route.name === 'Settings') {
            iconName = 'cog';
          }
          
          return <MaterialCommunityIcons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#2d5016',
        tabBarInactiveTintColor: '#999',
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Workday" component={WorkdayScreen} />
      <Tab.Screen name="NewVisit" component={VisitCreationScreen} />
      <Tab.Screen name="History" component={VisitHistoryScreen} />
      <Tab.Screen name="Map" component={MapScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

export function MainNavigator() {
  const { user } = useAuth();
  
  return (
    <NavigationContainer>
      {user ? <AppNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}
```

---

## ✅ Mobile App Checklist

- [ ] Project setup (React Native + Expo)
- [ ] Navigation structure
- [ ] Authentication flow
- [ ] GPS location tracking service
- [ ] Workday management screens
- [ ] Visit creation form
- [ ] Photo capture & compression
- [ ] Offline SQLite database
- [ ] Sync service
- [ ] Map integration
- [ ] Visit history screen
- [ ] Settings & profile management
- [ ] Error handling & logging
- [ ] Testing (unit + integration)
- [ ] Build APK & IPA
- [ ] Play Store & App Store deployment

---

**Status:** Ready for Mobile Development
