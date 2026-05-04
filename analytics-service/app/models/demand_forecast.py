"""
Demand Forecasting Model for Gondar Fuel Management System

Uses Prophet for time-series forecasting of fuel demand at each station.
"""

import pandas as pd
import numpy as np
from prophet import Prophet
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
import logging

logger = logging.getLogger(__name__)


class DemandForecaster:
    """
    Forecast fuel demand using historical data and Prophet.

    Features considered:
    - Day of week patterns
    - Monthly/seasonal trends
    - Holiday effects (Ethiopian holidays)
    - Special events (market days, festivals)
    """

    # Ethiopian holidays (fixed dates)
    ETHIOPIAN_HOLIDAYS = [
        # Name, Month, Day
        ("Enkutatash", 9, 1),  # New Year
        ("Meskel", 1, 17),  # Finding of the True Cross (Meskerem 17)
        ("Genna", 7, 7),  # Christmas (Tahsas 29)
        ("Timkat", 1, 10),  # Epiphany (Tir 10)
        ("Adwa Victory", 3, 2),  # March 2
        ("Fasika", 4, 12),  # Easter (variable, approx)
        ("Labour Day", 5, 1),  # May 1
        ("Derg Downfall", 5, 28),  # May 28
    ]

    def __init__(self, model_cache_ttl: int = 3600):
        """
        Initialize the forecaster.

        Args:
            model_cache_ttl: How long to cache trained models (seconds)
        """
        self.model_cache_ttl = model_cache_ttl
        self._models: Dict[str, Tuple[Prophet, datetime]] = {}

    def prepare_training_data(
        self,
        historical_reports: List[Dict],
        station_id: str,
        fuel_type: str
    ) -> pd.DataFrame:
        """
        Prepare historical data for training.

        Args:
            historical_reports: List of report dicts with date, price, availability
            station_id: Station identifier
            fuel_type: Fuel type to forecast

        Returns:
            DataFrame with ds (date) and y (demand proxy) columns
        """
        # Filter reports for this station and fuel type
        filtered = [
            r for r in historical_reports
            if r.get('station_id') == station_id
            and r.get('fuel_type') == fuel_type
        ]

        if len(filtered) < 30:  # Need at least 30 data points
            raise ValueError("Insufficient historical data for forecasting")

        # Aggregate by date
        daily_data = {}
        for report in filtered:
            date = report['reported_at'][:10]  # YYYY-MM-DD
            if date not in daily_data:
                daily_data[date] = {'count': 0, 'availability_sum': 0}

            # Convert availability to numeric score
            availability_score = {
                'full': 100,
                'limited': 50,
                'very_limited': 20,
                'out_of_stock': 0
            }.get(report.get('availability', 'full'), 50)

            daily_data[date]['count'] += 1
            daily_data[date]['availability_sum'] += availability_score

        # Create DataFrame
        df = pd.DataFrame([
            {
                'ds': date,
                'y': data['count'],  # Report count as demand proxy
                'availability': data['availability_sum'] / max(data['count'], 1)
            }
            for date, data in daily_data.items()
        ])

        df['ds'] = pd.to_datetime(df['ds'])
        df = df.sort_values('ds')

        return df

    def add_ethiopian_holidays(self, model: Prophet) -> Prophet:
        """Add Ethiopian holidays to the model."""
        holidays_df = pd.DataFrame(columns=['holiday', 'ds'])

        current_year = datetime.now().year
        for holiday_name, month, day in self.ETHIOPIAN_HOLIDAYS:
            # Add holidays for past and future years
            for year in range(current_year - 2, current_year + 3):
                try:
                    holidays_df = pd.concat([
                        holidays_df,
                        pd.DataFrame({
                            'holiday': holiday_name,
                            'ds': [datetime(year, month, day)]
                        })
                    ], ignore_index=True)
                except ValueError:
                    # Skip invalid dates (e.g., Feb 30)
                    continue

        model.holidays = holidays_df
        return model

    def train_model(
        self,
        training_data: pd.DataFrame,
        station_id: str,
        fuel_type: str
    ) -> Prophet:
        """
        Train a Prophet model for demand forecasting.

        Args:
            training_data: DataFrame with ds and y columns
            station_id: Station identifier
            fuel_type: Fuel type

        Returns:
            Trained Prophet model
        """
        # Initialize model with weekly seasonality (day-of-week patterns)
        model = Prophet(
            weekly_seasonality=True,
            yearly_seasonality=True,
            daily_seasonality=False,
            changepoint_prior_scale=0.05,  # Regularization
        )

        # Add Ethiopian holidays
        model = self.add_ethiopian_holidays(model)

        # Fit model
        model.fit(training_data)

        # Cache the model
        cache_key = f"{station_id}_{fuel_type}"
        self._models[cache_key] = (model, datetime.now())

        logger.info(f"Trained demand forecast model for {station_id} ({fuel_type})")
        return model

    def get_or_train_model(
        self,
        training_data: pd.DataFrame,
        station_id: str,
        fuel_type: str
    ) -> Prophet:
        """Get cached model or train a new one."""
        cache_key = f"{station_id}_{fuel_type}"

        # Check cache
        if cache_key in self._models:
            model, trained_at = self._models[cache_key]
            age = (datetime.now() - trained_at).total_seconds()

            if age < self.model_cache_ttl:
                return model
            else:
                # Remove stale model
                del self._models[cache_key]

        # Train new model
        return self.train_model(training_data, station_id, fuel_type)

    def forecast(
        self,
        model: Prophet,
        periods: int = 7,
        freq: str = 'D'
    ) -> pd.DataFrame:
        """
        Generate demand forecast.

        Args:
            model: Trained Prophet model
            periods: Number of periods to forecast
            freq: Frequency ('D' for daily, 'W' for weekly)

        Returns:
            DataFrame with forecast values
        """
        future = model.make_future_dataframe(periods=periods, freq=freq)
        forecast = model.predict(future)

        return forecast[['ds', 'yhat', 'yhat_lower', 'yhat_lower', 'yhat_upper']]

    def predict_demand_level(
        self,
        forecast_value: float,
        station_id: str,
        fuel_type: str,
        historical_avg: float
    ) -> Dict[str, any]:
        """
        Convert forecast value to human-readable demand level.

        Args:
            forecast_value: Predicted demand value
            station_id: Station identifier
            fuel_type: Fuel type
            historical_avg: Historical average demand

        Returns:
            Dict with demand level, confidence, and recommendations
        """
        # Calculate percentage change from average
        pct_change = ((forecast_value - historical_avg) / max(historical_avg, 1)) * 100

        # Determine demand level
        if pct_change > 50:
            level = "very_high"
            recommendation = "Expect long wait times. Consider visiting early morning."
        elif pct_change > 20:
            level = "high"
            recommendation = "Higher than normal demand expected."
        elif pct_change > -20:
            level = "normal"
            recommendation = "Normal demand expected."
        elif pct_change > -50:
            level = "low"
            recommendation = "Lower than normal demand. Good time to refuel."
        else:
            level = "very_low"
            recommendation = "Very low demand expected."

        return {
            "level": level,
            "confidence": min(0.95, 0.5 + abs(pct_change) / 200),  # Higher confidence for extreme predictions
            "predicted_change_percent": round(pct_change, 1),
            "recommendation": recommendation,
            "expected_wait_time_minutes": self._estimate_wait_time(level, station_id),
        }

    def _estimate_wait_time(self, demand_level: str, station_id: str) -> int:
        """Estimate wait time based on demand level."""
        base_wait_times = {
            "very_high": 45,
            "high": 25,
            "normal": 10,
            "low": 5,
            "very_low": 2,
        }
        return base_wait_times.get(demand_level, 10)

    def get_forecast_summary(
        self,
        historical_reports: List[Dict],
        station_id: str,
        fuel_type: str,
        forecast_days: int = 7
    ) -> Dict[str, any]:
        """
        Get complete forecast summary for a station.

        Args:
            historical_reports: Historical report data
            station_id: Station identifier
            fuel_type: Fuel type
            forecast_days: Days to forecast

        Returns:
            Comprehensive forecast summary
        """
        try:
            # Prepare data
            training_data = self.prepare_training_data(
                historical_reports, station_id, fuel_type
            )

            # Get or train model
            model = self.get_or_train_model(
                training_data, station_id, fuel_type
            )

            # Generate forecast
            forecast = self.forecast(model, periods=forecast_days)

            # Calculate historical average
            historical_avg = training_data['y'].mean()

            # Generate predictions for each day
            predictions = []
            for _, row in forecast.tail(forecast_days).iterrows():
                prediction = self.predict_demand_level(
                    row['yhat'], station_id, fuel_type, historical_avg
                )
                prediction['date'] = row['ds'].strftime('%Y-%m-%d')
                prediction['predicted_reports'] = round(row['yhat'], 1)
                prediction['confidence_interval'] = {
                    'lower': round(max(0, row['yhat_lower']), 1),
                    'upper': round(row['yhat_upper'], 1)
                }
                predictions.append(prediction)

            return {
                "station_id": station_id,
                "fuel_type": fuel_type,
                "forecast_days": forecast_days,
                "predictions": predictions,
                "historical_avg_daily_reports": round(historical_avg, 1),
                "model_trained_at": training_data['ds'].max().isoformat(),
                "data_points_used": len(training_data),
            }

        except Exception as e:
            logger.error(f"Forecast error for {station_id}: {e}")
            return {
                "station_id": station_id,
                "fuel_type": fuel_type,
                "error": str(e),
                "fallback": self._get_fallback_forecast(station_id, fuel_type),
            }

    def _get_fallback_forecast(self, station_id: str, fuel_type: str) -> Dict:
        """Return a simple fallback forecast when ML fails."""
        return {
            "level": "normal",
            "confidence": 0.5,
            "recommendation": "Unable to generate prediction. Check current station status.",
            "expected_wait_time_minutes": 10,
        }


# Singleton instance
_forecaster: Optional[DemandForecaster] = None


def get_forecaster() -> DemandForecaster:
    """Get or create the singleton forecaster instance."""
    global _forecaster
    if _forecaster is None:
        _forecaster = DemandForecaster()
    return _forecaster
