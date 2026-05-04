/**
 * Gondar City Geographic Bounds
 * Used to validate that all fuel reports and stations are within Gondar
 */

export const GONDAR_BOUNDS = {
  north: 12.65,
  south: 12.55,
  east: 37.50,
  west: 37.42,
} as const;

export const GONDAR_CENTER = {
  latitude: 12.60,
  longitude: 37.46,
} as const;

/**
 * Check if a coordinate is within Gondar city bounds
 */
export function isWithinGondar(
  latitude: number,
  longitude: number
): boolean {
  return (
    latitude >= GONDAR_BOUNDS.south &&
    latitude <= GONDAR_BOUNDS.north &&
    longitude >= GONDAR_BOUNDS.west &&
    longitude <= GONDAR_BOUNDS.east
  );
}

/**
 * Validate coordinates and throw error if outside Gondar
 */
export function validateGondarLocation(
  latitude: number,
  longitude: number
): void {
  if (!isWithinGondar(latitude, longitude)) {
    throw new Error(
      `Location must be within Gondar city bounds. ` +
      `Received: lat=${latitude}, lng=${longitude}. ` +
      `Bounds: lat[${GONDAR_BOUNDS.south}, ${GONDAR_BOUNDS.north}], ` +
      `lng[${GONDAR_BOUNDS.west}, ${GONDAR_BOUNDS.east}]`
    );
  }
}

/**
 * Calculate distance between two points using Haversine formula
 * Returns distance in meters
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Get bounding box for a radius around a point (clipped to Gondar bounds)
 */
export function getBoundsForRadius(
  latitude: number,
  longitude: number,
  radiusMeters: number
): {
  north: number;
  south: number;
  east: number;
  west: number;
} {
  const earthRadius = 6371e3;
  const latDelta = (radiusMeters / earthRadius) * (180 / Math.PI);
  const lngDelta =
    (radiusMeters / earthRadius) * (180 / Math.PI) / Math.cos((latitude * Math.PI) / 180);

  return {
    north: Math.min(GONDAR_BOUNDS.north, latitude + latDelta),
    south: Math.max(GONDAR_BOUNDS.south, latitude - latDelta),
    east: Math.min(GONDAR_BOUNDS.east, longitude + lngDelta),
    west: Math.max(GONDAR_BOUNDS.west, longitude - lngDelta),
  };
}
