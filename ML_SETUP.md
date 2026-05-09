# ML Prediction Service Setup Guide

Gondar Fuel Management System - Phase 4 ML Predictions

This guide provides step-by-step instructions for deploying the Prophet-based fuel demand prediction service for Gondar, Ethiopia.

---

## Table of Contents

1. [Installation Guide](#1-installation-guide)
2. [Project Structure](#2-project-structure)
3. [Requirements.txt](#3-requirementstxt)
4. [FastAPI Server Setup](#4-fastapi-server-setup)
5. [Running the Service](#5-running-the-service)
6. [Database Schema](#6-database-schema)
7. [Data Collection Flow](#7-data-collection-flow)
8. [Model Retraining Schedule](#8-model-retraining-schedule)
9. [Ethiopian Holidays Data](#9-ethiopian-holidays-data)
10. [API Integration with Main Server](#10-api-integration-with-main-server)
11. [Environment Variables](#11-environment-variables)
12. [Deployment Options](#12-deployment-options)
13. [Health Checks](#13-health-checks)
14. [Troubleshooting](#14-troubleshooting)
15. [Cost Estimates](#15-cost-estimates)

---

## 1. Installation Guide

### Prerequisites

- Python 3.9 or higher
- pip (Python package manager)
- 2GB RAM minimum (4GB recommended)
- 1GB disk space for models and data

### Step-by-Step Setup

```bash
# Navigate to project directory
cd /Users/fikrewoldtadegegn/Desktop/Proto

# Create the ml directory
mkdir -p ml
cd ml

# Create virtual environment
python3 -m venv ml-env

# Activate virtual environment
source ml-env/bin/activate

# Install core dependencies
pip install prophet pandas numpy fastapi uvicorn scikit-learn holidays
```

### Apple Silicon (M1/M2/M3) Specific Installation

Apple Silicon Macs may encounter compilation issues with Prophet's C++ components.

```bash
# Install with no cache to avoid binary issues
pip install prophet --no-cache-dir

# If issues persist, try installing dependencies first
pip install cmdstanpy
pip install prophet
```

### Intel Mac / Linux / Windows

Standard installation should work without issues:

```bash
pip install prophet>=1.1.0
```

### Verify Installation

```bash
python -c "from prophet import Prophet; print('Prophet installed successfully')"
```

---

## 2. Project Structure

Create the following directory structure:

```
ml/
├── service.py              # Main FastAPI application
├── predictions.py           # Prophet model implementation
├── data_loader.py          # Historical data loader
├── holidays.py             # Ethiopian holidays configuration
├── requirements.txt        # Python dependencies
├── .env                    # Environment variables
├── .gitignore              # Git ignore file
└── README.md               # This file
```

### Creating the Directory

```bash
mkdir -p ml
touch ml/.gitignore
touch ml/.env
```

---

## 3. Requirements.txt

Create `ml/requirements.txt`:

```txt
# Core ML
prophet>=1.1.0
pandas>=2.0.0
numpy>=1.24.0
scikit-learn>=1.3.0

# Web Framework
fastapi>=0.100.0
uvicorn>=0.23.0

# Utilities
holidays>=0.24
python-dotenv>=1.0.0
pydantic>=2.0.0
httpx>=0.24.0  # For async HTTP calls
```

Install with:

```bash
pip install -r requirements.txt
```

---

## 4. FastAPI Server Setup

Create `ml/service.py`:

```python
"""
Gondar Fuel Prediction Service
FastAPI-based Prophet model serving for fuel demand forecasting
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timedelta
import uvicorn
import os
from dotenv import load_dotenv

load_dotenv()

# Initialize FastAPI app
app = FastAPI(
    title="Gondar Fuel Predictions",
    description="ML-powered fuel demand forecasting for Gondar, Ethiopia",
    version="1.0.0"
)

# CORS middleware for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global model state
model = None
last_retrain_time = None

# Pydantic models
class PredictionRequest(BaseModel):
    station_id: int
    fuel_type: str  # 'diesel' or 'petrol'
    days_ahead: int = 7

class PredictionResponse(BaseModel):
    station_id: int
    fuel_type: str
    predictions: List[dict]
    confidence: float
    last_updated: str

class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    last_retrain: Optional[str]
    version: str


@app.get("/health", response_model=HealthResponse)
def health_check():
    """Health check endpoint for monitoring"""
    return HealthResponse(
        status="ok" if model is not None else "degraded",
        model_loaded=model is not None,
        last_retrain=last_retrain_time.isoformat() if last_retrain_time else None,
        version="1.0.0"
    )


@app.get("/api/predict/station/{station_id}", response_model=PredictionResponse)
def predict_station(station_id: int, fuel_type: str = "diesel", days: int = 7):
    """
    Get predictions for a specific fuel station

    Args:
        station_id: The station ID
        fuel_type: 'diesel' or 'petrol'
        days: Number of days to predict (default 7)

    Returns:
        Prediction data with confidence scores
    """
    if model is None:
        raise HTTPException(
            status_code=503,
            detail="Model not loaded. Please wait for initialization."
        )

    # Generate predictions (placeholder - implement with actual model)
    predictions = generate_demo_predictions(station_id, fuel_type, days)

    return PredictionResponse(
        station_id=station_id,
        fuel_type=fuel_type,
        predictions=predictions,
        confidence=0.85,
        last_updated=datetime.now().isoformat()
    )


@app.post("/api/train")
def train_model(station_id: Optional[int] = None):
    """
    Trigger model retraining
    If station_id is None, trains all stations

    Returns:
        Training status
    """
    global model, last_retrain_time

    # Placeholder for actual training logic
    last_retrain_time = datetime.now()

    return {
        "status": "training_started",
        "station_id": station_id,
        "started_at": last_retrain_time.isoformat()
    }


def generate_demo_predictions(station_id: int, fuel_type: str, days: int) -> List[dict]:
    """Generate demo predictions for testing"""
    predictions = []
    base_date = datetime.now()

    for i in range(days):
        pred_date = base_date + timedelta(days=i)
        predictions.append({
            "date": pred_date.strftime("%Y-%m-%d"),
            "predicted_liters": 1500 + (i * 50),
            "confidence_low": 1200 + (i * 40),
            "confidence_high": 1800 + (i * 60)
        })

    return predictions


if __name__ == "__main__":
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(
        "service:app",
        host="0.0.0.0",
        port=port,
        reload=os.getenv("DEBUG", "false").lower() == "true"
    )
```

---

## 5. Running the Service

### Local Development

```bash
# Activate environment
cd ml
source ml-env/bin/activate

# Run with hot reload
uvicorn service:app --reload --port 8000

# Access at http://localhost:8000
# Docs at http://localhost:8000/docs
```

### Local Production

```bash
# Run in production mode
uvicorn service:app --host 0.0.0.0 --port 8000 --workers 4

# Run with gunicorn (alternative)
pip install gunicorn
gunicorn service:app -w 4 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:8000
```

### Railway Deployment

1. Create `railway.json`:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "numReplicas": 1,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

2. Set environment variables in Railway dashboard:
   - `PORT`: 8000
   - `DEBUG`: false
   - `DATABASE_URL`: your PostgreSQL connection string

3. Deploy from GitHub repository

### Render Deployment

1. Create `render.yaml`:

```yaml
services:
  - type: web
    name: gondar-predictions
    env: python
    buildCommand: pip install -r requirements.txt
    startCommand: uvicorn service:app --host 0.0.0.0 --port $PORT
```

2. Connect to GitHub and deploy

### Docker Deployment

Create `Dockerfile`:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Run service
CMD ["uvicorn", "service:app", "--host", "0.0.0.0", "--port", "8000"]
```

Build and run:

```bash
docker build -t gondar-predictions .
docker run -p 8000:8000 gondar-predictions
```

---

## 6. Database Schema

Create the following tables in PostgreSQL to store historical fuel sales data:

```sql
-- Fuel sales history table
CREATE TABLE fuel_sales_history (
    id SERIAL PRIMARY KEY,
    station_id INTEGER NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
    fuel_type VARCHAR(20) NOT NULL CHECK (fuel_type IN ('diesel', 'petrol')),
    amount_liters DECIMAL(10, 2) NOT NULL CHECK (amount_liters > 0),
    unit_price DECIMAL(10, 2) NOT NULL,
    total_price DECIMAL(12, 2) NOT NULL,
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT fk_station FOREIGN KEY (station_id) REFERENCES stations(id)
);

-- Indexes for query performance
CREATE INDEX idx_sales_station_date ON fuel_sales_history(station_id, recorded_at);
CREATE INDEX idx_sales_fuel_type ON fuel_sales_history(fuel_type);
CREATE INDEX idx_sales_recorded_at ON fuel_sales_history(recorded_at DESC);

-- Aggregated daily sales for Prophet training
CREATE TABLE daily_sales_aggregate (
    id SERIAL PRIMARY KEY,
    station_id INTEGER NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
    fuel_type VARCHAR(20) NOT NULL,
    sale_date DATE NOT NULL,
    total_liters DECIMAL(12, 2) NOT NULL,
    transaction_count INTEGER NOT NULL DEFAULT 0,
    avg_price DECIMAL(10, 2),
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Unique constraint to prevent duplicates
    UNIQUE (station_id, fuel_type, sale_date)
);

CREATE INDEX idx_daily_aggregate_date ON daily_sales_aggregate(sale_date DESC);
CREATE INDEX idx_daily_aggregate_station ON daily_sales_aggregate(station_id);

-- Model training metadata
CREATE TABLE model_training_log (
    id SERIAL PRIMARY KEY,
    station_id INTEGER NOT NULL,
    fuel_type VARCHAR(20) NOT NULL,
    training_started_at TIMESTAMPTZ NOT NULL,
    training_completed_at TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'training', 'completed', 'failed')),
    error_message TEXT,
    model_metrics JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_training_log_station ON model_training_log(station_id, fuel_type);

-- Stations reference table (if not exists)
CREATE TABLE IF NOT EXISTS stations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    fuel_types VARCHAR(50)[],
    latitude DECIMAL(9, 6),
    longitude DECIMAL(9, 6),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 7. Data Collection Flow

### How to Collect Training Data

The data collection process follows these steps:

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Fuel Purchase  │────▶│  sales_history  │────▶│  Daily Aggreg.  │
│    Occurs       │     │    Table        │     │    Table        │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Predictions    │◀────│   Prophet       │◀────│   Aggregate     │
│   Generated    │     │   Model         │     │     Data        │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### Step 1: Record Each Fuel Purchase

When a user purchases fuel, record it:

```sql
INSERT INTO fuel_sales_history (station_id, fuel_type, amount_liters, unit_price, total_price)
VALUES (1, 'diesel', 45.5, 54.50, 2479.75);
```

### Step 2: Daily Aggregation (Run via Cron)

At end of each day, aggregate sales:

```sql
-- Daily aggregation query
INSERT INTO daily_sales_aggregate (station_id, fuel_type, sale_date, total_liters, transaction_count, avg_price)
SELECT
    station_id,
    fuel_type,
    DATE(recorded_at) as sale_date,
    SUM(amount_liters) as daily_total,
    COUNT(*) as transaction_count,
    AVG(unit_price) as avg_price
FROM fuel_sales_history
WHERE DATE(recorded_at) = CURRENT_DATE - 1
GROUP BY station_id, fuel_type, DATE(recorded_at)
ON CONFLICT (station_id, fuel_type, sale_date)
DO UPDATE SET
    total_liters = EXCLUDED.total_liters,
    transaction_count = EXCLUDED.transaction_count,
    avg_price = EXCLUDED.avg_price;
```

### Step 3: Load Data for Prophet

```python
# ml/data_loader.py
import pandas as pd
from sqlalchemy import create_engine

def load_historical_data(station_id: int, fuel_type: str) -> pd.DataFrame:
    """Load historical sales data for Prophet training"""

    query = """
    SELECT
        sale_date as ds,
        total_liters as y
    FROM daily_sales_aggregate
    WHERE station_id = %s AND fuel_type = %s
    ORDER BY sale_date ASC
    """

    engine = create_engine(os.getenv("DATABASE_URL"))
    df = pd.read_sql(query, engine, params=(station_id, fuel_type))

    return df
```

---

## 8. Model Retraining Schedule

### PostgreSQL pg_cron Setup

Enable pg_cron extension and schedule retraining:

```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA cron TO your_user;

-- Schedule model retraining daily at 2 AM
SELECT cron.schedule(
    'retrain-daily-models',
    '0 2 * * *',
    $$
    SELECT retrain_all_station_models();
    $$
);

-- Verify scheduled jobs
SELECT * FROM cron.job;
```

### Alternative: External Scheduler

Use cron on the server or a task scheduler:

```bash
# crontab -e
# Run at 2 AM daily
0 2 * * * curl -X POST https://your-prediction-service.com/api/train
```

### Python Training Script

Create `ml/train.py`:

```python
"""
Model training script - can be triggered via cron or API
"""

from prophet import Prophet
import pandas as pd
from datetime import datetime
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def retrain_station_model(station_id: int, fuel_type: str, data: pd.DataFrame) -> dict:
    """Train Prophet model for a specific station and fuel type"""

    # Initialize model with Ethiopian settings
    model = Prophet(
        yearly_seasonality=True,
        weekly_seasonality=True,
        daily_seasonality=False,
        seasonality_mode='multiplicative',
        changepoint_prior_scale=0.05
    )

    # Add custom seasonality for Ethiopian factors
    model.add_seasonality(
        name='ethiopian_month',
        period=30.5,
        fourier_order=5
    )

    # Train model
    model.fit(data)

    return {
        "station_id": station_id,
        "fuel_type": fuel_type,
        "trained_at": datetime.now().isoformat(),
        "data_points": len(data)
    }

def retrain_all_station_models():
    """Retrain models for all stations - called by cron job"""

    # Load all station IDs
    stations = get_all_stations()

    results = []
    for station in stations:
        for fuel_type in ['diesel', 'petrol']:
            try:
                data = load_historical_data(station['id'], fuel_type)
                if len(data) >= 30:  # Minimum data requirement
                    result = retrain_station_model(station['id'], fuel_type, data)
                    results.append(result)
                    logger.info(f"Trained model for station {station['id']} - {fuel_type}")
            except Exception as e:
                logger.error(f"Failed to train station {station['id']} - {fuel_type}: {e}")

    return {"trained": len(results), "results": results}
```

---

## 9. Ethiopian Holidays Data

Ethiopia has unique holidays that affect fuel demand. Configure Prophet with Ethiopian-specific holidays:

Create `ml/holidays.py`:

```python
"""
Ethiopian holidays configuration for Prophet model
"""

import holidays
from datetime import date
from typing import Dict

def get_ethiopian_holidays(years: range) -> holidays.HolidayBase:
    """Get Ethiopian holidays for specified years"""

    # Ethiopian Orthodox holidays (Julian calendar - approximately 7-8 years behind Gregorian)
    ethiopia_holidays = holidays.CountryHoliday('ET', years=years)

    return ethiopia_holidays

def get_custom_holidays() -> Dict[str, str]:
    """Define major Ethiopian holidays with their names in Amharic and English"""

    custom_holidays = {
        # Ethiopian Christmas (Genna) - January 7
        '2024-01-07': 'Ethiopian Christmas (Genna)',
        '2025-01-07': 'Ethiopian Christmas (Genna)',
        '2026-01-07': 'Ethiopian Christmas (Genna)',
        '2027-01-07': 'Ethiopian Christmas (Genna)',

        # Timkat (Epiphany) - January 19
        '2024-01-19': 'Timkat (Epiphany)',
        '2025-01-19': 'Timkat (Epiphany)',
        '2026-01-19': 'Timkat (Epiphany)',
        '2027-01-19': 'Timkat (Epiphany)',

        # Ethiopian New Year (Enkutatash) - September 11 (2024), September 12 (2025+)
        '2024-09-11': 'Ethiopian New Year (Enkutatash)',
        '2025-09-12': 'Ethiopian New Year (Enkutatash)',
        '2026-09-11': 'Ethiopian New Year (Enkutatash)',
        '2027-09-11': 'Ethiopian New Year (Enkutatash)',

        # Meskel (Finding of the True Cross) - September 27
        '2024-09-27': 'Meskel',
        '2025-09-27': 'Meskel',
        '2026-09-27': 'Meskel',
        '2027-09-27': 'Meskel',

        # Orthodox Good Friday
        '2024-05-03': 'Orthodox Good Friday',
        '2025-04-18': 'Orthodox Good Friday',
        '2026-04-10': 'Orthodox Good Friday',
        '2027-04-02': 'Orthodox Good Friday',

        # Orthodox Easter
        '2024-05-05': 'Orthodox Easter',
        '2025-04-20': 'Orthodox Easter',
        '2026-04-12': 'Orthodox Easter',
        '2027-04-04': 'Orthodox Easter',
    }

    return custom_holidays

def create_prophet_holidays_df():
    """Create a DataFrame with Ethiopian holidays for Prophet"""

    all_holidays = get_custom_holidays()

    # Convert to Prophet format
    holiday_list = []
    for date_str, name in all_holidays.items():
        holiday_list.append({
            'holiday': name,
            'ds': pd.to_datetime(date_str),
            'lower_window': -2,
            'upper_window': 1
        })

    return pd.DataFrame(holiday_list)
```

### Using Holidays with Prophet

```python
from prophet import Prophet
from ml.holidays import create_prophet_holidays_df

# Get holidays DataFrame
ethiopian_holidays = create_prophet_holidays_df()

# Initialize Prophet with holidays
model = Prophet(
    holidays=ethiopian_holidays,
    yearly_seasonality=True,
    weekly_seasonality=True
)

# Train with holiday effects
model.fit(df)
```

---

## 10. API Integration with Main Server

The main server (server.js) can integrate with the prediction service.

### Server.js Integration

Modify `server.js` to call the prediction service:

```javascript
// Add at the top of server.js
const PREDICTION_SERVICE_URL = process.env.PREDICTION_URL || 'http://localhost:8000';

// Add helper function
async function getPredictions(stationId, fuelType = 'diesel') {
    try {
        const response = await fetch(
            `${PREDICTION_SERVICE_URL}/api/predict/station/${stationId}?fuel_type=${fuelType}&days=7`
        );

        if (!response.ok) {
            throw new Error(`Prediction service returned ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.warn('Prediction service unavailable, using fallback:', error.message);
        // Fallback to demo predictions
        return generateDemoPrediction(stationId, fuelType);
    }
}

// Demo prediction fallback
function generateDemoPrediction(stationId, fuelType) {
    const predictions = [];
    const now = new Date();

    for (let i = 0; i < 7; i++) {
        const date = new Date(now);
        date.setDate(date.getDate() + i);

        predictions.push({
            date: date.toISOString().split('T')[0],
            predicted_liters: 1500 + Math.random() * 500,
            confidence_high: 2000 + Math.random() * 500,
            confidence_low: 1000 + Math.random() * 500
        });
    }

    return {
        station_id: stationId,
        fuel_type: fuelType,
        predictions: predictions,
        confidence: 0.75,
        last_updated: now.toISOString()
    };
}

// Add new API endpoint in server.js
app.get('/api/predictions/:stationId', async (req, res) => {
    const { stationId } = req.params;
    const { fuelType = 'diesel' } = req.query;

    try {
        const predictions = await getPredictions(parseInt(stationId), fuelType);
        res.json(predictions);
    } catch (error) {
        console.error('Prediction error:', error);
        res.status(500).json({ error: 'Failed to get predictions' });
    }
});
```

---

## 11. Environment Variables

Create `ml/.env` file:

```env
# Prediction Service Configuration
PORT=8000
DEBUG=false
HOST=0.0.0.0

# Database Connection
DATABASE_URL=postgresql://user:password@localhost:5432/gondar_fuel
DB_HOST=localhost
DB_PORT=5432
DB_NAME=gondar_fuel
DB_USER=postgres
DB_PASSWORD=your_secure_password

# Model Settings
MODEL_REFRESH_INTERVAL=86400
MIN_TRAINING_DATA_POINTS=30
PREDICTION_DAYS_AHEAD=7

# External Services
PREDICTION_URL=http://localhost:8000
MAIN_SERVER_URL=http://localhost:3000

# Logging
LOG_LEVEL=INFO
```

### Production Environment Variables

```env
# Railway/Render
PORT=8000
DEBUG=false
DATABASE_URL=postgresql://user:pass@host:5432/prod_db

# Derived
DB_HOST=your-db-host.provider.com
DB_PORT=5432
DB_NAME=gondar_fuel_prod
```

---

## 12. Deployment Options

### Comparison Table

| Platform | Free Tier | Compute | Storage | Pros | Cons |
|----------|-----------|---------|---------|------|------|
| **Railway** | 500 hours/month | 0.5 vCPU, 1GB RAM | 1GB | Easy Python deploy, good docs | Cold starts |
| **Render** | 750 hours/month | 0.25 vCPU, 512MB | 1GB | Simple YAML config | Slow builds |
| **Fly.io** | 3 shared VMs | 1 vCPU, 256MB | 3GB | Better cold start times | Complex config |
| **AWS Lambda** | 1M requests/month | 3GB RAM | 10GB | Serverless scaling | Cold starts, harder setup |
| **GCP Cloud Run** | Free tier available | 2 vCPU, 4GB | 50GB | Good scaling | More complex |

### Recommended: Railway

Railway is recommended for this project because:
- Native Python support
- PostgreSQL integration available
- Simple GitHub deployment
- Reasonable free tier for development

### Deployment Steps for Railway

1. Create GitHub repository with `ml/` folder
2. Connect repository to Railway
3. Add environment variables in Railway dashboard
4. Set build command: `pip install -r requirements.txt`
5. Set start command: `uvicorn service:app --host 0.0.0.0 --port $PORT`

---

## 13. Health Checks

The prediction service includes built-in health check endpoints.

### Health Endpoint Response

```python
# GET /health
{
    "status": "ok",
    "model_loaded": true,
    "last_retrain": "2026-05-09T02:00:00.000Z",
    "version": "1.0.0"
}
```

### Monitoring Setup

Create a simple monitoring script `ml/monitor.py`:

```python
"""
Health monitoring for prediction service
"""

import httpx
import os
import logging
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def check_health(service_url: str) -> dict:
    """Check if prediction service is healthy"""

    try:
        response = httpx.get(f"{service_url}/health", timeout=10)

        if response.status_code == 200:
            data = response.json()
            logger.info(f"Service healthy: {data}")
            return {"healthy": True, "data": data}
        else:
            logger.warning(f"Service returned {response.status_code}")
            return {"healthy": False, "status_code": response.status_code}

    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {"healthy": False, "error": str(e)}

if __name__ == "__main__":
    service_url = os.getenv("PREDICTION_SERVICE_URL", "http://localhost:8000")
    result = check_health(service_url)
    print(result)
```

### Cron Monitoring Script

```bash
# Check every 5 minutes
*/5 * * * * /Users/fikrewoldtadegegn/Desktop/Proto/ml/ml-env/bin/python /Users/fikrewoldtadegegn/Desktop/Proto/ml/monitor.py >> /var/log/prediction-health.log 2>&1
```

---

## 14. Troubleshooting

### Common Issues and Solutions

#### Issue: Prophet Installation Fails

**Error:**
```
ERROR: Command errored out with exit status 1: python setup.py egg_info
```

**Solution:**
```bash
# For macOS
brew install libomp

# Then reinstall
pip install prophet --no-cache-dir

# Or use conda
conda install -c conda-forge prophet
```

#### Issue: Memory Error During Training

**Error:**
```
MemoryError: Unable to allocate memory for model training
```

**Solution:**
- Reduce batch size for training
- Add swap space
- Use smaller dataset for initial training
- Upgrade to larger instance

#### Issue: Model Returns No Predictions

**Possible causes:**
1. Insufficient training data (need at least 30 days)
2. Station ID not found
3. Database connection issue

**Solution:**
```bash
# Check data availability
psql $DATABASE_URL -c "SELECT COUNT(*) FROM daily_sales_aggregate WHERE station_id = 1;"

# Check model training log
psql $DATABASE_URL -c "SELECT * FROM model_training_log ORDER BY created_at DESC LIMIT 5;"
```

#### Issue: Cold Start Latency on Railway

**Solution:**
- Use a keeps-alive ping endpoint
- Consider upgrading to paid tier for always-on instances
- Add caching layer for predictions

#### Issue: CORS Errors from Frontend

**Solution:**
The service already includes CORS middleware. If issues persist:
```python
# Verify CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://your-domain.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## 15. Cost Estimates

### Development Phase (Month 1-2)

| Resource | Platform | Monthly Cost |
|----------|----------|--------------|
| Prediction Service | Railway (Free) | $0 |
| Database | Supabase (Free tier) | $0 |
| Monitoring | Self-hosted | $0 |
| **Total** | | **$0** |

### Production Phase (Month 3+)

| Resource | Platform | Monthly Cost |
|----------|----------|--------------|
| Prediction Service | Railway (Starter) | $5 |
| Database | Supabase (Pro) | $25 |
| Monitoring | UptimeRobot (Free) | $0 |
| **Total** | | **$30/month** |

### Cost Optimization Tips

1. **Use free tiers first** - Railway and Render both have generous free tiers
2. **Implement caching** - Cache predictions for 1 hour to reduce compute
3. **Batch training** - Train models during off-peak hours
4. **Use serverless** - Consider Lambda for truly pay-per-use pricing

---

## Quick Reference

### Essential Commands

```bash
# Start development
cd ml && source ml-env/bin/activate && uvicorn service:app --reload

# Check health
curl http://localhost:8000/health

# Get predictions
curl http://localhost:8000/api/predict/station/1?fuel_type=diesel&days=7

# Trigger training
curl -X POST http://localhost:8000/api/train

# Run tests
python -m pytest tests/
```

### File Locations

| File | Purpose |
|------|---------|
| `ml/service.py` | FastAPI application |
| `ml/predictions.py` | Prophet model logic |
| `ml/data_loader.py` | Database data loading |
| `ml/holidays.py` | Ethiopian holidays |
| `ml/requirements.txt` | Dependencies |
| `ml/.env` | Environment variables |

---

## Next Steps

1. Create the `ml/` directory and files
2. Set up PostgreSQL database with schema
3. Generate initial training data
4. Deploy to Railway/Render
5. Integrate with main server

For questions or issues, refer to the Prophet documentation: https://facebook.github.io/prophet/docs/

---

*Last updated: 2026-05-09*