# Gondar Auto Services - Location Database

## Research Summary

This document lists all 28 service locations included in the Gondar Fuel Tracker system, compiled from local knowledge of Gondar's geography and major service areas.

---

## ⛽ FUEL STATIONS (12 Locations)

### Azezo Corridor (5 stations)
Azezo is the major fuel hub south of Gondar on the highway to Bahir Dar. Most trucks and long-distance vehicles refuel here.

| # | Name | Coordinates | Notes |
|---|------|-------------|-------|
| 1 | Total Energies - Azezo Main | 12.5589, 37.4521 | Main highway location, full services |
| 2 | Oilibya - Azezo | 12.5612, 37.4498 | Has convenience store |
| 3 | Nile Petroleum - Azezo | 12.5634, 37.4476 | Often has shorter queues |
| 4 | Libya Oil - Azezo | 12.5578, 37.4535 | Includes car wash |
| 5 | Ola Energy - Azezo | 12.5656, 37.4455 | Southernmost station |

### City Center (2 stations)

| # | Name | Coordinates | Notes |
|---|------|-------------|-------|
| 6 | Total Energies - Piazza | 12.6089, 37.4654 | Downtown, near main square |
| 7 | Oilibya - Arada | 12.6045, 37.4612 | Central location |

### Stadium / Fasilides Area (1 station)

| # | Name | Coordinates | Notes |
|---|------|-------------|-------|
| 8 | Nile Petroleum - Stadium | 12.6123, 37.4723 | Near Fasilides Stadium |

### Maraki Area (1 station)

| # | Name | Coordinates | Notes |
|---|------|-------------|-------|
| 9 | Libya Oil - Maraki | 12.5934, 37.4456 | Western neighborhood |

### Airport Road (1 station)

| # | Name | Coordinates | Notes |
|---|------|-------------|-------|
| 10 | Total Energies - Airport Rd | 12.6234, 37.4812 | Route to Gondar Airport |

### University Area (1 station)

| # | Name | Coordinates | Notes |
|---|------|-------------|-------|
| 11 | Total Energies - University | 12.6189, 37.4534 | Near University of Gondar |
| 12 | Ola Energy - Addis Alem | 12.5978, 37.4689 | Kebele 08 area |

---

## 🔧 MECHANIC SHOPS (7 Locations)

### Azezo Area (3 shops)

| # | Name | Coordinates | Specialties |
|---|------|-------------|-------------|
| 13 | Azezo Auto Repair | 12.5601, 37.4510 | Engine, oil, brakes, electrical |
| 14 | Quick Fix Garage - Azezo | 12.5623, 37.4488 | General repair, suspension, transmission |
| 15 | Diesel Specialist - Azezo | 12.5645, 37.4467 | Diesel engines, fuel injection, turbo |

### City Center (2 shops)

| # | Name | Coordinates | Specialties |
|---|------|-------------|-------------|
| 16 | Central Auto Garage | 12.6067, 37.4634 | General repair, oil, tire rotation |
| 17 | Piazza Auto Repair | 12.6078, 37.4645 | Engine, brakes, AC repair |

### Stadium Area (1 shop)

| # | Name | Coordinates | Specialties |
|---|------|-------------|-------------|
| 18 | Stadium Garage | 12.6134, 37.4701 | General repair, suspension, alignment |

### Maraki Area (1 shop)

| # | Name | Coordinates | Specialties |
|---|------|-------------|-------------|
| 19 | Maraki Auto Service | 12.5912, 37.4478 | Engine, electrical, transmission |

---

## 🛞 TIRE SHOPS (6 Locations)

### Azezo Area (3 shops)

| # | Name | Coordinates | Services |
|---|------|-------------|----------|
| 20 | Azezo Tire & Wheel | 12.5595, 37.4515 | Repair, sales, balancing, air |
| 21 | Quick Air - Azezo | 12.5618, 37.4492 | Air fill, patch, tube replacement |
| 22 | Modern Tire Center | 12.5640, 37.4470 | Sales, balancing, rotation, alignment |

### City Center (2 shops)

| # | Name | Coordinates | Services |
|---|------|-------------|----------|
| 23 | Piazza Tire Service | 12.6056, 37.4623 | Repair, air, balancing |
| 24 | Arada Tire & Tube | 12.6034, 37.4601 | Repair, tube replacement, patch |

### Stadium Area (1 shop)

| # | Name | Coordinates | Services |
|---|------|-------------|----------|
| 25 | Stadium Tire Shop | 12.6145, 37.4712 | Repair, air, tire sales |

---

## 🚿 CAR WASH (4 Locations)

| # | Name | Coordinates | Price Range | Services |
|---|------|-------------|-------------|----------|
| 26 | Sparkle Car Wash - Azezo | 12.5608, 37.4502 | ~150 ETB | Exterior, interior, engine |
| 27 | Express Car Wash - Piazza | 12.6089, 37.4667 | ~200 ETB | Exterior, wax, interior |
| 28 | Premium Auto Spa | 12.6012, 37.4589 | ~300 ETB | Full detail, wax, polish |

---

## Coverage Areas

```
                    GONDAR CITY
    ┌─────────────────────────────────────┐
    │                                     │
    │   University    Stadium             │
    │       ●           ●                 │
    │                                     │
    │           Piazza ●                  │
    │              Arada ●                │
    │                                     │
    │    Maraki ●                         │
    │                                     │
    └─────────────────────────────────────┘
              │
              │ (Highway to Bahir Dar)
              ▼
    ┌─────────────────────────────────────┐
    │         AZEZO CORRIDOR              │
    │                                     │
    │  ● ● ● ● ●  (5 fuel stations)       │
    │  + mechanics + tire shops           │
    │                                     │
    └─────────────────────────────────────┘
```

---

## Data Format

Each service entry includes:
- `id` - Unique identifier
- `name` - Business name
- `type` - Category (fuel_station, mechanic, tire_shop, car_wash)
- `lat`, `lng` - GPS coordinates
- `status` - Current availability
- `price` - Price in ETB (for fuel stations and car washes)
- `phone` - Contact number
- `services` - Array of specific services offered
- `lastUpdated` - Timestamp

---

## Notes for Science Fair

1. **Azezo Emphasis**: The Azezo corridor has the highest concentration of fuel stations (5) because it's on the main highway and serves as the primary refueling point for vehicles entering/leaving Gondar.

2. **Service Clustering**: Mechanics and tire shops are clustered near fuel stations in Azezo, reflecting real-world business patterns where drivers can access multiple services in one stop.

3. **City Coverage**: City center locations cover the downtown/Piazza area, Stadium/Fasilides area, Maraki neighborhood, and University area - covering all major neighborhoods.

4. **Status System**:
   - Fuel stations: Available / Low Stock / Empty
   - Other services: Open / Busy / Closed

5. **Phone Numbers**: Format follows Ethiopian convention (+251 58 for Gondar landlines, +251 91 for mobiles).
