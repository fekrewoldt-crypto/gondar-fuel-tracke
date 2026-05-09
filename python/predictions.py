"""
Gondar Fuel Management System - Prophet-Based Fuel Demand Prediction Service
Science Fair Project - Gondar, Ethiopia

This module provides ML-powered fuel demand forecasting using Facebook Prophet,
with Ethiopian context including holidays and local patterns.
"""

import random
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
import json

# Prophet import with fallback
try:
    from prophet import Prophet
    PROPHET_AVAILABLE = True
except ImportError:
    PROPHET_AVAILABLE = False
    # Fallback using simple statistical model

# FastAPI for endpoints
try:
    from fastapi import FastAPI, HTTPException
    from fastapi.middleware.cors import CORSMiddleware
    FASTAPI_AVAILABLE = True
except ImportError:
    FASTAPI_AVAILABLE = False

# ============================================================================
# DATA STRUCTURES
# ============================================================================

@dataclass
class FuelStation:
    """Fuel station data structure with capacity information."""
    station_id: int
    name: str
    lat: float
    lng: float
    area: str  # 'azezo', 'city_center', 'stadium', 'maraki', 'airport', 'university'
    capacity_diesel: float  # liters
    capacity_petrol: float  # liters
    current_diesel: float
    current_petrol: float
    is_highway: bool  # Azezo stations on Bahir Dar highway

@dataclass
class DailySales:
    """Daily sales record."""
    date: str  # 'YYYY-MM-DD'
    diesel_sales: float
    petrol_sales: float
    is_ethiopian_holiday: bool = False

@dataclass
class StationHistory:
    """Station fuel consumption history."""
    station_id: int
    station_name: str
    area: str
    is_highway: bool
    capacity: float
    dates: List[str]
    diesel_sales: List[float]
    petrol_sales: List[float]

@dataclass
class Prediction:
    """Prediction output for a single day."""
    station_id: int
    date: str
    predicted_demand: float
    lower_bound: float
    upper_bound: float
    shortage_risk: str  # 'low', 'medium', 'high'

@dataclass
class StationPrediction:
    """Complete station prediction with shortage analysis."""
    station_id: int
    station_name: str
    area: str
    predictions: List[Prediction]
    shortage_risk: str
    days_until_shortage: Optional[float]
    recommended_action: str

# ============================================================================
# ETHIOPIAN HOLIDAYS
# ============================================================================

# Ethiopian holidays affect fuel demand (travel periods)
# Ethiopian calendar runs ~7-8 years behind Gregorian
ETHIOPIAN_HOLIDAYS = [
    # Enkutatash - Ethiopian New Year (September 11-13)
    {'name': 'Enkutatash', 'date': '2025-09-11', 'lower': -1, 'upper': 2, 'demand_boost': 1.5},
    {'name': 'Enkutatash', 'date': '2025-09-12', 'lower': -1, 'upper': 2, 'demand_boost': 1.5},
    {'name': 'Enkutatash', 'date': '2025-09-13', 'lower': -1, 'upper': 2, 'demand_boost': 1.5},
    {'name': 'Enkutatash', 'date': '2026-09-11', 'lower': -1, 'upper': 2, 'demand_boost': 1.5},
    {'name': 'Enkutatash', 'date': '2026-09-12', 'lower': -1, 'upper': 2, 'demand_boost': 1.5},
    {'name': 'Enkutatash', 'date': '2026-09-13', 'lower': -1, 'upper': 2, 'demand_boost': 1.5},

    # Meskel - Finding of True Cross (September 27)
    {'name': 'Meskel', 'date': '2025-09-27', 'lower': -1, 'upper': 1, 'demand_boost': 1.4},
    {'name': 'Meskel', 'date': '2026-09-27', 'lower': -1, 'upper': 1, 'demand_boost': 1.4},

    # Ethiopian Patriots' Day (May 5)
    {'name': 'Ethiopian Patriots Day', 'date': '2025-05-05', 'lower': -1, 'upper': 1, 'demand_boost': 1.3},
    {'name': 'Ethiopian Patriots Day', 'date': '2026-05-05', 'lower': -1, 'upper': 1, 'demand_boost': 1.3},

    # Downfall of Derg (May 28)
    {'name': 'Derg Downfall', 'date': '2025-05-28', 'lower': -1, 'upper': 1, 'demand_boost': 1.3},
    {'name': 'Derg Downfall', 'date': '2026-05-28', 'lower': -1, 'upper': 1, 'demand_boost': 1.3},

    # Eid al-Fitr (approximate - varies by lunar calendar)
    {'name': 'Eid al-Fitr', 'date': '2025-03-30', 'lower': -2, 'upper': 2, 'demand_boost': 1.4},
    {'name': 'Eid al-Fitr', 'date': '2026-03-21', 'lower': -2, 'upper': 2, 'demand_boost': 1.4},

    # Ethiopian Orthodox holidays
    {'name': 'Timkat', 'date': '2025-01-19', 'lower': -1, 'upper': 2, 'demand_boost': 1.3},
    {'name': 'Timkat', 'date': '2026-01-19', 'lower': -1, 'upper': 2, 'demand_boost': 1.3},
]

# ============================================================================
# STATION DATA (From LOCATIONS.md - 12 fuel stations)
# ============================================================================

FUEL_STATIONS = [
    # Azezo Corridor (5 stations - highway traffic)
    FuelStation(1, "Total Energies - Azezo Main", 12.5589, 37.4521, "azezo", 15000, 5000, 8000, 2500, True),
    FuelStation(2, "Oilibya - Azezo", 12.5612, 37.4498, "azezo", 12000, 4000, 9000, 3000, True),
    FuelStation(3, "Nile Petroleum - Azezo", 12.5634, 37.4476, "azezo", 10000, 3500, 5000, 2000, True),
    FuelStation(4, "Libya Oil - Azezo", 12.5578, 37.4535, "azezo", 12000, 4000, 6000, 2500, True),
    FuelStation(5, "Ola Energy - Azezo", 12.5656, 37.4455, "azezo", 10000, 3500, 4000, 1500, True),

    # City Center (2 stations)
    FuelStation(6, "Total Energies - Piazza", 12.6089, 37.4654, "city_center", 8000, 3000, 4000, 1500, False),
    FuelStation(7, "Oilibya - Arada", 12.6045, 37.4612, "city_center", 7000, 2500, 3500, 1200, False),

    # Stadium Area (1 station)
    FuelStation(8, "Nile Petroleum - Stadium", 12.6123, 37.4723, "stadium", 6000, 2000, 3000, 1000, False),

    # Maraki Area (1 station)
    FuelStation(9, "Libya Oil - Maraki", 12.5934, 37.4456, "maraki", 5000, 2000, 2500, 1000, False),

    # Airport Road (1 station)
    FuelStation(10, "Total Energies - Airport Rd", 12.6234, 37.4812, "airport", 6000, 2000, 3000, 1000, False),

    # University Area (2 stations)
    FuelStation(11, "Total Energies - University", 12.6189, 37.4534, "university", 7000, 2500, 3500, 1200, False),
    FuelStation(12, "Ola Energy - Addis Alem", 12.5978, 37.4689, "university", 5000, 2000, 2500, 800, False),
]

# ============================================================================
# SEASONAL ADJUSTMENT FACTORS
# ============================================================================

# Dry season (Oct-May): Higher demand due to agricultural transport, tourism
# Rainy season (Jun-Sep): Lower demand, supply issues
DRY_SEASON_MULTIPLIER = 1.2
RAINY_SEASON_MULTIPLIER = 0.8

# Time of day multipliers (Ethiopian peak hours)
MORNING_PEAK_MULTIPLIER = 1.4  # 6-9 AM
EVENING_PEAK_MULTIPLIER = 1.3  # 4-7 PM
OFF_PEAK_MULTIPLIER = 0.7

# Day of week multipliers
WEEKEND_MULTIPLIER = 1.15  # Saturday/Sunday - higher highway traffic
WEEKDAY_MULTIPLIER = 1.0

# Area-based multipliers
AREA_MULTIPLIERS = {
    "azezo": 1.3,  # Highway traffic, commercial vehicles
    "city_center": 1.0,
    "stadium": 0.9,
    "maraki": 0.8,
    "airport": 1.1,  # Airport traffic
    "university": 0.9,
}

# ============================================================================
# DEMO DATA GENERATION
# ============================================================================

def get_season_multiplier(date: datetime) -> float:
    """Get season multiplier based on month."""
    month = date.month
    # Dry season: Oct-May
    if month >= 10 or month <= 5:
        return DRY_SEASON_MULTIPLIER
    # Rainy season: Jun-Sep
    return RAINY_SEASON_MULTIPLIER

def get_day_multiplier(date: datetime, is_highway: bool) -> float:
    """Get day of week multiplier."""
    # Saturday = 5, Sunday = 6 in Python weekday()
    if date.weekday() >= 5:
        if is_highway:
            return 1.25  # Higher weekend highway traffic
        return WEEKEND_MULTIPLIER
    return WEEKDAY_MULTIPLIER

def get_holiday_multiplier(date: datetime) -> float:
    """Get holiday multiplier if date is near Ethiopian holiday."""
    for holiday in ETHIOPIAN_HOLIDAYS:
        holiday_date = datetime.strptime(holiday['date'], '%Y-%m-%d')
        if abs((date - holiday_date).days) <= holiday['upper']:
            return holiday['demand_boost']
    return 1.0

def generate_demo_history(station: FuelStation, days: int = 30) -> StationHistory:
    """
    Generate realistic demo historical data for a station.

    Based on:
    - Station capacity and area type
    - Daily/weekly patterns
    - Season (dry vs rainy)
    - Ethiopian holidays
    - Random variation for realism
    """
    end_date = datetime.now()
    start_date = end_date - timedelta(days=days)

    dates = []
    diesel_sales = []
    petrol_sales = []

    # Base consumption varies by area
    base_diesel = station.capacity * 0.3  # 30% of capacity typical daily
    base_petrol = station.capacity_petrol * 0.35

    current_date = start_date
    while current_date <= end_date:
        dates.append(current_date.strftime('%Y-%m-%d'))

        # Apply all multipliers
        season_mult = get_season_multiplier(current_date)
        day_mult = get_day_multiplier(current_date, station.is_highway)
        holiday_mult = get_holiday_multiplier(current_date)
        area_mult = AREA_MULTIPLIERS[station.area]

        combined_mult = season_mult * day_mult * holiday_mult * area_mult

        # Add randomness (+/- 20%)
        random_factor = 1 + random.uniform(-0.2, 0.2)

        diesel = base_diesel * combined_mult * random_factor
        petrol = base_petrol * combined_mult * random_factor

        diesel_sales.append(round(diesel, 2))
        petrol_sales.append(round(petrol, 2))

        current_date += timedelta(days=1)

    return StationHistory(
        station_id=station.station_id,
        station_name=station.name,
        area=station.area,
        is_highway=station.is_highway,
        capacity=station.capacity_diesel,
        dates=dates,
        diesel_sales=diesel_sales,
        petrol_sales=petrol_sales
    )

# Generate historical data for all stations
STATION_HISTORIES: Dict[int, StationHistory] = {}

def initialize_histories():
    """Initialize demo historical data for all stations."""
    for station in FUEL_STATIONS:
        STATION_HISTORIES[station.station_id] = generate_demo_history(station, 30)

# ============================================================================
# PROPHET MODEL TRAINING
# ============================================================================

def train_model(station_id: int, fuel_type: str = 'diesel') -> Optional[Prophet]:
    """
    Train Prophet model on station historical data.

    Args:
        station_id: ID of the fuel station
        fuel_type: 'diesel' or 'petrol'

    Returns:
        Trained Prophet model or None if Prophet not available
    """
    if station_id not in STATION_HISTORIES:
        raise ValueError(f"Station {station_id} not found")

    if not PROPHET_AVAILABLE:
        return None

    history = STATION_HISTORIES[station_id]
    sales_data = history.diesel_sales if fuel_type == 'diesel' else history.petrol_sales

    # Create DataFrame for Prophet
    import pandas as pd

    df = pd.DataFrame({
        'ds': pd.to_datetime(history.dates),
        'y': sales_data
    })

    # Create holidays DataFrame from Ethiopian holidays
    holidays_df = pd.DataFrame([
        {
            'holiday': h['name'],
            'ds': pd.to_datetime(h['date']),
            'lower_window': h.get('lower', -1),
            'upper_window': h.get('upper', 1)
        }
        for h in ETHIOPIAN_HOLIDAYS
    ])

    # Initialize and train Prophet model
    model = Prophet(
        yearly_seasonality=True,
        weekly_seasonality=True,
        daily_seasonality=False,
        holidays=holidays_df if not holidays_df.empty else None,
        changepoint_prior_scale=0.05,
        interval_width=0.95  # 95% confidence interval
    )

    model.fit(df)
    return model

# ============================================================================
# FALLBACK STATISTICAL MODEL (when Prophet unavailable)
# ============================================================================

def predict_with_fallback(history: StationHistory, days_ahead: int = 7) -> List[Dict]:
    """
    Simple statistical fallback when Prophet is not available.

    Uses:
    - Average daily consumption
    - Day-of-week patterns
    - Season adjustment
    - Holiday adjustment
    """
    import pandas as pd

    predictions = []

    # Calculate average consumption by day of week
    df = pd.DataFrame({
        'date': pd.to_datetime(history.dates),
        'sales': history.diesel_sales
    })
    df['dayofweek'] = df['date'].dt.dayofweek

    avg_by_dow = df.groupby('dayofweek')['sales'].mean().to_dict()
    overall_avg = df['sales'].mean()

    # Calculate standard deviation for confidence intervals
    std_dev = df['sales'].std()

    end_date = datetime.now()

    for i in range(1, days_ahead + 1):
        future_date = end_date + timedelta(days=i)
        future_dow = future_date.weekday()

        # Base prediction from day-of-week average
        pred = avg_by_dow.get(future_dow, overall_avg)

        # Apply season and holiday adjustments
        season_mult = get_season_multiplier(future_date)
        holiday_mult = get_holiday_multiplier(future_date)
        area_mult = AREA_MULTIPLIERS.get(history.area, 1.0)

        pred *= season_mult * holiday_mult * area_mult

        # Confidence interval based on historical std dev
        lower = pred - 1.96 * std_dev
        upper = pred + 1.96 * std_dev

        predictions.append({
            'date': future_date.strftime('%Y-%m-%d'),
            'predicted': round(pred, 2),
            'lower': round(max(0, lower), 2),
            'upper': round(upper, 2),
            'dayofweek': ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][future_dow]
        })

    return predictions

# ============================================================================
# MAIN PREDICTION FUNCTION
# ============================================================================

def predict_station(station_id: int, days: int = 7, fuel_type: str = 'diesel') -> List[Prediction]:
    """
    Get fuel demand predictions for a station.

    Args:
        station_id: ID of the fuel station
        days: Number of days to predict (default 7)
        fuel_type: 'diesel' or 'petrol'

    Returns:
        List of Prediction objects for each predicted day
    """
    if station_id not in STATION_HISTORIES:
        raise ValueError(f"Station {station_id} not found")

    history = STATION_HISTORIES[station_id]

    if PROPHET_AVAILABLE:
        # Use Prophet model
        model = train_model(station_id, fuel_type)
        future = model.make_future_dataframe(periods=days)
        forecast = model.predict(future)

        predictions = []
        for i in range(len(forecast)):
            if i < len(forecast) - days:
                continue  # Skip historical dates

            row = forecast.iloc[i]
            date_str = row['ds'].strftime('%Y-%m-%d')

            # Calculate shortage risk based on predictions
            pred_demand = max(0, row['yhat'])
            lower = max(0, row['yhat_lower'])
            upper = row['yhat_upper']

            predictions.append(Prediction(
                station_id=station_id,
                date=date_str,
                predicted_demand=round(pred_demand, 2),
                lower_bound=round(lower, 2),
                upper_bound=round(upper, 2),
                shortage_risk='low'  # Will be updated by calculate_shortage_risk
            ))
    else:
        # Use fallback model
        fallback_preds = predict_with_fallback(history, days)

        predictions = [
            Prediction(
                station_id=station_id,
                date=p['date'],
                predicted_demand=p['predicted'],
                lower_bound=p['lower'],
                upper_bound=p['upper'],
                shortage_risk='low'
            )
            for p in fallback_preds
        ]

    return predictions

# ============================================================================
# SHORTAGE DETECTION ALGORITHM
# ============================================================================

def calculate_shortage_risk(station: FuelStation, predictions: List[Prediction], days_ahead: int = 3) -> Tuple[str, Optional[float], str]:
    """
    Calculate risk that station will run out of fuel.

    Args:
        station: FuelStation object with current stock levels
        predictions: List of Prediction objects
        days_ahead: Number of days to check (default 3)

    Returns:
        Tuple of (risk_level, days_until_shortage, recommended_action)

    Risk levels:
    - 'high': Will run out within 1 day
    - 'medium': Warning zone, 1-2 days of stock
    - 'low': Healthy stock levels
    """
    # Get predicted total demand for next X days
    future_preds = [p for p in predictions if p.date >= datetime.now().strftime('%Y-%m-%d')][:days_ahead]

    if not future_preds:
        return 'low', None, 'No upcoming predictions available'

    predicted_need = sum(p.predicted_demand for p in future_preds)
    avg_daily_demand = predicted_need / len(future_preds)

    # Current stock (use diesel for fuel stations)
    current_stock = station.current_diesel if station.capacity_diesel > 0 else station.current_petrol

    if avg_daily_demand <= 0:
        return 'low', None, 'Insufficient prediction data'

    # Calculate days of stock remaining
    days_of_stock = current_stock / avg_daily_demand

    # Determine risk level and recommended action
    if days_of_stock < 1:
        risk = 'high'
        action = 'URGENT: Restock immediately. Expected shortage within 24 hours.'
    elif days_of_stock < 2:
        risk = 'medium'
        action = 'WARNING: Plan restock within 24-48 hours.'
    elif days_of_stock < 3:
        risk = 'medium'
        action = 'CAUTION: Consider scheduling restock within 3 days.'
    else:
        risk = 'low'
        action = 'OK: Stock levels adequate.'

    return risk, round(days_of_stock, 1), action

def get_station_shortage_analysis(station_id: int, days: int = 7) -> StationPrediction:
    """
    Get complete shortage analysis for a station.
    """
    # Find station
    station = None
    for s in FUEL_STATIONS:
        if s.station_id == station_id:
            station = s
            break

    if not station:
        raise ValueError(f"Station {station_id} not found")

    # Get predictions
    predictions = predict_station(station_id, days)

    # Calculate shortage risk
    shortage_risk, days_until, action = calculate_shortage_risk(station, predictions)

    # Update predictions with shortage risk
    for pred in predictions:
        pred.shortage_risk = calculate_single_day_risk(station, pred)

    return StationPrediction(
        station_id=station_id,
        station_name=station.name,
        area=station.area,
        predictions=predictions,
        shortage_risk=shortage_risk,
        days_until_shortage=days_until,
        recommended_action=action
    )

def calculate_single_day_risk(station: FuelStation, prediction: Prediction) -> str:
    """Calculate risk for a single day's prediction."""
    current_stock = station.current_diesel
    daily_demand = prediction.predicted_demand

    if daily_demand <= 0:
        return 'low'

    days_of_stock = current_stock / daily_demand

    if days_of_stock < 1:
        return 'high'
    elif days_of_stock < 2:
        return 'medium'
    return 'low'

# ============================================================================
# BULK PREDICTIONS
# ============================================================================

def predict_all_stations(days: int = 7) -> List[Dict]:
    """
    Get predictions for all fuel stations.
    """
    results = []

    for station in FUEL_STATIONS:
        analysis = get_station_shortage_analysis(station.station_id, days)

        results.append({
            'station_id': analysis.station_id,
            'station_name': analysis.station_name,
            'area': analysis.area,
            'current_stock': station.current_diesel,
            'capacity': station.capacity_diesel,
            'predictions': [
                {
                    'date': p.date,
                    'predicted_demand': p.predicted_demand,
                    'lower_bound': p.lower_bound,
                    'upper_bound': p.upper_bound,
                    'shortage_risk': p.shortage_risk
                }
                for p in analysis.predictions
            ],
            'shortage_risk': analysis.shortage_risk,
            'days_until_shortage': analysis.days_until_shortage,
            'recommended_action': analysis.recommended_action
        })

    return results

def get_high_risk_stations() -> List[Dict]:
    """Get stations with high shortage risk."""
    all_predictions = predict_all_stations()
    return [
        s for s in all_predictions
        if s['shortage_risk'] in ['high', 'medium']
    ]

# ============================================================================
# STATISTICS AND AGGREGATION
# ============================================================================

def get_city_wide_stats() -> Dict:
    """Get aggregated statistics across all stations."""
    all_predictions = predict_all_stations()

    total_capacity = sum(s['capacity'] for s in all_predictions)
    total_current_stock = sum(s['current_stock'] for s in all_predictions)

    high_risk_count = sum(1 for s in all_predictions if s['shortage_risk'] == 'high')
    medium_risk_count = sum(1 for s in all_predictions if s['shortage_risk'] == 'medium')

    # Calculate total predicted demand for next 7 days
    total_predicted_demand = 0
    for station in all_predictions:
        for pred in station['predictions']:
            total_predicted_demand += pred['predicted_demand']

    return {
        'total_stations': len(all_predictions),
        'total_capacity_liters': total_capacity,
        'total_current_stock_liters': total_current_stock,
        'stock_percentage': round((total_current_stock / total_capacity) * 100, 1) if total_capacity > 0 else 0,
        'high_risk_stations': high_risk_count,
        'medium_risk_stations': medium_risk_count,
        'low_risk_stations': len(all_predictions) - high_risk_count - medium_risk_count,
        'total_predicted_demand_7day': round(total_predicted_demand, 2),
        'stations': all_predictions
    }

# ============================================================================
# FASTAPI ENDPOINTS
# ============================================================================

def create_api_app() -> 'FastAPI':
    """Create FastAPI application with prediction endpoints."""
    if not FASTAPI_AVAILABLE:
        raise ImportError("FastAPI is required for API endpoints")

    app = FastAPI(
        title="Gondar Fuel Prediction API",
        description="ML-powered fuel demand forecasting for Gondar, Ethiopia",
        version="1.0.0"
    )

    # Add CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Initialize station histories on startup
    @app.on_event("startup")
    async def startup_event():
        initialize_histories()

    # API Endpoints
    @app.get("/")
    def root():
        return {
            "service": "Gondar Fuel Prediction API",
            "version": "1.0.0",
            "model": "Prophet" if PROPHET_AVAILABLE else "Statistical Fallback",
            "stations_tracked": len(FUEL_STATIONS)
        }

    @app.get("/api/predict/station/{station_id}")
    def predict_station_endpoint(station_id: int, days: int = 7):
        """
        Return 7-day fuel prediction for a specific station.
        """
        try:
            analysis = get_station_shortage_analysis(station_id, days)
            return {
                "station_id": station_id,
                "station_name": analysis.station_name,
                "area": analysis.area,
                "shortage_risk": analysis.shortage_risk,
                "days_until_shortage": analysis.days_until_shortage,
                "recommended_action": analysis.recommended_action,
                "predictions": [
                    {
                        "date": p.date,
                        "predicted_demand": p.predicted_demand,
                        "lower_bound": p.lower_bound,
                        "upper_bound": p.upper_bound,
                        "shortage_risk": p.shortage_risk
                    }
                    for p in analysis.predictions
                ]
            }
        except ValueError as e:
            raise HTTPException(status_code=404, detail=str(e))

    @app.get("/api/predict/all")
    def predict_all_endpoint(days: int = 7):
        """
        Return predictions for all stations.
        """
        return {
            "days_ahead": days,
            "stations": predict_all_stations(days)
        }

    @app.get("/api/predict/high-risk")
    def high_risk_endpoint():
        """
        Return stations with high or medium shortage risk.
        """
        return {
            "high_risk_stations": get_high_risk_stations()
        }

    @app.get("/api/stats")
    def stats_endpoint():
        """
        Return aggregated city-wide statistics.
        """
        return get_city_wide_stats()

    @app.get("/api/stations")
    def stations_endpoint():
        """
        Return all fuel stations with current status.
        """
        return {
            "stations": [
                {
                    "station_id": s.station_id,
                    "name": s.name,
                    "lat": s.lat,
                    "lng": s.lng,
                    "area": s.area,
                    "capacity": s.capacity_diesel,
                    "current_stock": s.current_diesel,
                    "is_highway": s.is_highway
                }
                for s in FUEL_STATIONS
            ]
        }

    return app

# ============================================================================
# MAIN ENTRY POINT
# ============================================================================

def main():
    """Run the prediction service."""
    print("=" * 60)
    print("Gondar Fuel Prediction Service")
    print("=" * 60)
    print(f"Model: {'Prophet' if PROPHET_AVAILABLE else 'Statistical Fallback'}")
    print(f"Stations tracked: {len(FUEL_STATIONS)}")
    print()

    # Initialize demo data
    initialize_histories()

    # Show sample predictions
    print("Sample Predictions for Station 1 (Total Energies - Azezo):")
    print("-" * 60)

    predictions = predict_station(1, 7)
    for pred in predictions:
        print(f"  {pred.date}: {pred.predicted_demand:.0f}L "
              f"(Range: {pred.lower_bound:.0f} - {pred.upper_bound:.0f}L)")

    print()
    print("Shortage Risk Analysis:")
    print("-" * 60)

    analysis = get_station_shortage_analysis(1)
    print(f"  Risk Level: {analysis.shortage_risk.upper()}")
    print(f"  Days of Stock: {analysis.days_until_shortage}")
    print(f"  Action: {analysis.recommended_action}")

    print()
    print("High-Risk Stations:")
    print("-" * 60)

    high_risk = get_high_risk_stations()
    if high_risk:
        for station in high_risk:
            print(f"  [{station['shortage_risk'].upper()}] {station['station_name']}")
            print(f"    Days until shortage: {station['days_until_shortage']}")
    else:
        print("  No high-risk stations currently.")

    print()
    print("City-Wide Statistics:")
    print("-" * 60)

    stats = get_city_wide_stats()
    print(f"  Total Stations: {stats['total_stations']}")
    print(f"  Total Capacity: {stats['total_capacity_liters']:,.0f} liters")
    print(f"  Current Stock: {stats['total_current_stock_liters']:,.0f} liters ({stats['stock_percentage']}%)")
    print(f"  High Risk: {stats['high_risk_stations']}")
    print(f"  Medium Risk: {stats['medium_risk_stations']}")
    print(f"  Low Risk: {stats['low_risk_stations']}")
    print(f"  7-Day Predicted Demand: {stats['total_predicted_demand_7day']:,.0f} liters")

    # Start FastAPI server if available
    if FASTAPI_AVAILABLE:
        print()
        print("=" * 60)
        print("Starting API server on http://localhost:8001")
        print("=" * 60)

        import uvicorn
        app = create_api_app()
        uvicorn.run(app, host="0.0.0.0", port=8001)
    else:
        print()
        print("Note: FastAPI not available. Install with: pip install fastapi uvicorn")

if __name__ == "__main__":
    main()
