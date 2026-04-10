# Backend API Structure for Live Data (Admin Panel & Mobile App)

## 1. News
- Endpoint: `GET /api/news?region=tamilnadu`
- Returns: Array of latest Tamil Nadu agri news headlines
- Example Response:
```
[
  { "title": "Heavy rainfall predicted in southern Tamil Nadu districts." },
  { "title": "Tamil Nadu government launches new agri subsidy scheme." },
  ...
]
```

## 2. Weather
- Endpoint: `GET /api/weather?region=tamilnadu`
- Returns: Current temperature, weather code, next hour prediction
- Example Response:
```
{
  "temperature": 32,
  "weathercode": "Sunny",
  "prediction": 33
}
```

## 3. Rainfall
- Endpoint: `GET /api/rainfall?region=tamilnadu`
- Returns: Current and next hour rainfall prediction
- Example Response:
```
{
  "current": 0.5,
  "next_hour": 0.7
}
```

## 4. Crop Prices
- Endpoint: `GET /api/crop-prices?region=tamilnadu`
- Returns: Array of crop prices
- Example Response:
```
[
  { "crop": "Rice", "price": "₹1800/qtl" },
  { "crop": "Wheat", "price": "₹2100/qtl" },
  ...
]
```

## 5. Agent Tracking
- Endpoint: `GET /api/agents?region=tamilnadu`
- Returns: Array of agent locations and stats
- Example Response:
```
[
  { "id": 1, "name": "Agent 1", "lat": 10.85, "lng": 78.70, "visits_today": 5 },
  ...
]
```

---

# Models
- News: { title: String, date: Date, region: String }
- Weather: { temperature: Number, weathercode: String, prediction: Number, region: String }
- Rainfall: { current: Number, next_hour: Number, region: String }
- CropPrice: { crop: String, price: String, region: String }
- Agent: { id: Number, name: String, lat: Number, lng: Number, visits_today: Number, region: String }

---

# Ready for Mobile App
- All endpoints return JSON, easy to consume in web/mobile.
- Extendable for authentication, admin actions, etc.
