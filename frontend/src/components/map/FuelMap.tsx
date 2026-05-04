import React, { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { GONDAR_BOUNDS, GONDAR_CENTER } from '../../utils/gondar-bounds';
import type { FuelStation, StationStatus } from '../../types/station.types';
import { stationsService } from '../../services/stations.service';
import StationPopup from './StationPopup';
import MapControls from './MapControls';
import { useGeolocation } from '../../hooks/useGeolocation';

interface FuelMapProps {
  selectedStationId?: string;
  onStationSelect?: (station: FuelStation) => void;
  fuelTypeFilter?: string;
  statusFilter?: StationStatus[];
  className?: string;
}

// Mapbox token - replace with your actual token
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || 'pk.eyJ1...';

// Initialize mapbox
mapboxgl.accessToken = MAPBOX_TOKEN;

const FuelMap: React.FC<FuelMapProps> = ({
  selectedStationId,
  onStationSelect,
  fuelTypeFilter = 'diesel',
  statusFilter,
  className = '',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());

  const [stations, setStations] = useState<FuelStation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStation, setSelectedStation] = useState<FuelStation | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);

  const { location: userLocation } = useGeolocation();

  // Get station color based on availability
  const getStationColor = useCallback((station: FuelStation): string => {
    const fuelType = station.fuel_types?.find((ft) => ft.type === fuelTypeFilter);

    if (!fuelType?.available || station.status === 'out_of_stock') {
      return '#ef4444'; // Red - out of stock
    }

    const availability = station.last_report?.availability;
    switch (availability) {
      case 'full':
        return '#22c55e'; // Green
      case 'limited':
        return '#f59e0b'; // Orange
      case 'very_limited':
        return '#ef4444'; // Red
      default:
        return '#6b7280'; // Gray - unknown
    }
  }, [fuelTypeFilter]);

  // Create marker element
  const createMarkerElement = useCallback((station: FuelStation): HTMLElement => {
    const color = getStationColor(station);
    const el = document.createElement('div');
    el.className = 'custom-marker';
    el.style.cssText = `
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background-color: ${color};
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      cursor: pointer;
      transition: transform 0.2s;
    `;
    el.onmouseenter = () => (el.style.transform = 'scale(1.2)');
    el.onmouseleave = () => (el.style.transform = 'scale(1)');
    return el;
  }, [getStationColor]);

  // Load stations
  const loadStations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const bounds = {
        north: GONDAR_BOUNDS.north,
        south: GONDAR_BOUNDS.south,
        east: GONDAR_BOUNDS.east,
        west: GONDAR_BOUNDS.west,
      };

      const data = await stationsService.getStations({
        bounds,
        fuel_type: fuelTypeFilter,
      });

      setStations(data.stations);
    } catch (err) {
      setError('Failed to load stations. Please try again.');
      console.error('Error loading stations:', err);
    } finally {
      setLoading(false);
    }
  }, [fuelTypeFilter]);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || !MAPBOX_TOKEN) return;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [GONDAR_CENTER.longitude, GONDAR_CENTER.latitude],
      zoom: 13,
      minZoom: 11,
      maxZoom: 17,
      maxBounds: [
        [GONDAR_BOUNDS.west - 0.01, GONDAR_BOUNDS.south - 0.01],
        [GONDAR_BOUNDS.east + 0.01, GONDAR_BOUNDS.north + 0.01],
      ] as mapboxgl.LngLatBoundsLike,
    });

    // Add navigation control
    map.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Add geolocate control
    map.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
        showUserHeading: true,
      }),
      'top-right'
    );

    map.on('load', () => {
      setMapLoaded(true);
    });

    mapRef.current = map;

    // Cleanup
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update markers when stations change
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;

    // Remove old markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current.clear();

    // Add new markers
    stations.forEach((station) => {
      // Apply status filter
      if (statusFilter && !statusFilter.includes(station.status)) {
        return;
      }

      const marker = new mapboxgl.Marker(createMarkerElement(station))
        .setLngLat([station.longitude, station.latitude])
        .setPopup(
          new mapboxgl.Popup({ offset: 25 }).setHTML(`
            <div class="station-popup">
              <h3>${station.name}</h3>
              <p class="brand">${station.brand || 'Independent'}</p>
              <p class="status">${station.status}</p>
            </div>
          `)
        )
        .addTo(mapRef.current!);

      // Handle marker click
      marker.getElement().addEventListener('click', () => {
        setSelectedStation(station);
        onStationSelect?.(station);
      });

      markersRef.current.set(station.id, marker);
    });
  }, [stations, mapLoaded, statusFilter, createMarkerElement, onStationSelect]);

  // Handle selected station from props
  useEffect(() => {
    if (selectedStationId && stations.length > 0) {
      const station = stations.find((s) => s.id === selectedStationId);
      if (station) {
        setSelectedStation(station);

        // Fly to station
        if (mapRef.current) {
          mapRef.current.flyTo({
            center: [station.longitude, station.latitude],
            zoom: 15,
            duration: 1000,
          });
        }
      }
    }
  }, [selectedStationId, stations]);

  // Center on user location
  const centerOnUserLocation = useCallback(() => {
    if (userLocation && mapRef.current) {
      mapRef.current.flyTo({
        center: [userLocation.longitude, userLocation.latitude],
        zoom: 15,
        duration: 1000,
      });
    }
  }, [userLocation]);

  // Refresh data
  const refreshData = useCallback(() => {
    loadStations();
  }, [loadStations]);

  return (
    <div className={`relative h-full w-full ${className}`}>
      {/* Map container */}
      <div ref={mapContainerRef} className="h-full w-full" />

      {/* Loading overlay */}
      {loading && (
        <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-3 z-10">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-medium">Loading stations...</span>
          </div>
        </div>
      )}

      {/* Error overlay */}
      {error && (
        <div className="absolute top-4 left-4 bg-red-50 rounded-lg shadow-lg p-3 z-10 max-w-xs">
          <p className="text-sm text-red-600">{error}</p>
          <button
            onClick={loadStations}
            className="mt-2 text-sm text-red-700 underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Map controls */}
      {mapLoaded && (
        <MapControls
          onRefresh={refreshData}
          onCenterUser={centerOnUserLocation}
          stationCount={stations.length}
        />
      )}

      {/* Station popup */}
      {selectedStation && (
        <StationPopup
          station={selectedStation}
          onClose={() => setSelectedStation(null)}
          fuelTypeFilter={fuelTypeFilter}
        />
      )}

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3 z-10">
        <h4 className="text-xs font-semibold mb-2">Availability</h4>
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span>Full stock</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-500" />
            <span>Limited</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span>Out of stock</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gray-400" />
            <span>Unknown</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FuelMap;
