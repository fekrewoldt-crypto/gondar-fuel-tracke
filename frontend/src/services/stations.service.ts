import api from './api';
import type { FuelStation, StationQueryParams, StationStats } from '../types/station.types';

interface GetStationsResponse {
  stations: FuelStation[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

interface StationDetails extends FuelStation {
  recent_reports: any[];
  price_history: any[];
  predictions?: {
    demand: string;
    shortage_risk: string;
    next_restock_estimate?: string;
  };
}

export const stationsService = {
  /**
   * Get all fuel stations with filtering
   */
  async getStations(params: StationQueryParams): Promise<GetStationsResponse> {
    const queryParams = new URLSearchParams();

    if (params.bounds) {
      queryParams.set('bounds', `${params.bounds.north},${params.bounds.south},${params.bounds.east},${params.bounds.west}`);
    }

    if (params.status) {
      if (Array.isArray(params.status)) {
        params.status.forEach((s) => queryParams.append('status', s));
      } else {
        queryParams.set('status', params.status);
      }
    }

    if (params.fuel_type) {
      queryParams.set('fuel_type', params.fuel_type);
    }

    if (params.page) {
      queryParams.set('page', params.page.toString());
    }

    if (params.limit) {
      queryParams.set('limit', params.limit.toString());
    }

    if (params.sort) {
      queryParams.set('sort', params.sort);
    }

    const response = await api.get(`/stations?${queryParams.toString()}`);
    return response.data;
  },

  /**
   * Get a single station by ID
   */
  async getStation(id: string): Promise<StationDetails> {
    const response = await api.get(`/stations/${id}`);
    return response.data;
  },

  /**
   * Create a new fuel station
   */
  async createStation(data: {
    name: string;
    brand?: string;
    latitude: number;
    longitude: number;
    address: string;
    phone?: string;
    fuel_types: Array<{ type: string; available: boolean }>;
    operating_hours?: any;
    amenities?: string[];
  }): Promise<FuelStation> {
    const response = await api.post('/stations', data);
    return response.data;
  },

  /**
   * Update a fuel station
   */
  async updateStation(
    id: string,
    data: Partial<FuelStation>
  ): Promise<FuelStation> {
    const response = await api.patch(`/stations/${id}`, data);
    return response.data;
  },

  /**
   * Get reports for a station
   */
  async getStationReports(
    id: string,
    params?: {
      fuel_type?: string;
      days?: number;
      page?: number;
      limit?: number;
    }
  ): Promise<{ reports: any[]; pagination: any }> {
    const queryParams = new URLSearchParams();

    if (params?.fuel_type) {
      queryParams.set('fuel_type', params.fuel_type);
    }

    if (params?.days) {
      queryParams.set('days', params.days.toString());
    }

    if (params?.page) {
      queryParams.set('page', params.page.toString());
    }

    if (params?.limit) {
      queryParams.set('limit', params.limit.toString());
    }

    const response = await api.get(`/stations/${id}/reports?${queryParams.toString()}`);
    return response.data;
  },

  /**
   * Get station statistics
   */
  async getStationStats(id: string, days: number = 30): Promise<StationStats> {
    const response = await api.get(`/stations/${id}/stats?days=${days}`);
    return response.data;
  },

  /**
   * Get nearest stations to a location
   */
  async getNearestStations(
    latitude: number,
    longitude: number,
    limit: number = 10
  ): Promise<FuelStation[]> {
    const response = await api.get(
      `/stations/nearby?lat=${latitude}&lng=${longitude}&limit=${limit}`
    );
    return response.data.stations;
  },

  /**
   * Subscribe to station notifications
   */
  async subscribeToStation(
    stationId: string,
    subscriptionType: 'price_alert' | 'restock_alert' | 'all_updates',
    conditions?: {
      price_drop_percent?: number;
      fuel_types?: string[];
    }
  ): Promise<any> {
    const response = await api.post('/subscriptions', {
      station_id: stationId,
      subscription_type: subscriptionType,
      conditions,
    });
    return response.data;
  },

  /**
   * Get user's subscribed stations
   */
  async getSubscriptions(): Promise<any[]> {
    const response = await api.get('/subscriptions');
    return response.data.subscriptions;
  },

  /**
   * Unsubscribe from station notifications
   */
  async unsubscribe(subscriptionId: string): Promise<void> {
    await api.delete(`/subscriptions/${subscriptionId}`);
  },
};

export default stationsService;
