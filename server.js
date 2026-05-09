const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = 3000;

// ==================== PHASE 2: REAL-TIME (SSE) ====================

// SSE connections storage
let sseConnections = {
    station: {}, // stationId -> array of response objects
    nearby: []    // array of { res, lat, lng, radius }
};

// Token secret for SSE auth
const TOKEN_SECRET = process.env.TOKEN_SECRET || crypto.randomBytes(32).toString('hex');

// Generate SSE auth token (valid for 5 minutes)
function generateSSEPolicy(userId) {
    const payload = {
        userId,
        timestamp: Date.now(),
        expiresAt: Date.now() + 5 * 60 * 1000,
        nonce: crypto.randomBytes(8).toString('hex')
    };
    const data = Buffer.from(JSON.stringify(payload)).toString('base64');
    const signature = crypto.createHmac('sha256', TOKEN_SECRET).update(data).digest('hex');
    return `${data}.${signature}`;
}

// Verify SSE token
function verifySSEPolicy(token) {
    try {
        const [data, signature] = token.split('.');
        if (!data || !signature) return null;
        const expectedSig = crypto.createHmac('sha256', TOKEN_SECRET).update(data).digest('hex');
        if (signature !== expectedSig) return null;
        const payload = JSON.parse(Buffer.from(data, 'base64').toString());
        if (payload.expiresAt < Date.now()) return null;
        return payload;
    } catch {
        return null;
    }
}

// Auth middleware (simplified for SSE)
function authMiddleware(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }
    const token = authHeader.substring(7);
    try {
        const [data, signature] = token.split('.');
        if (!data || !signature) return null;
        const expectedSig = crypto.createHmac('sha256', TOKEN_SECRET).update(data).digest('hex');
        if (signature !== expectedSig) return null;
        return JSON.parse(Buffer.from(data, 'base64').toString());
    } catch {
        return null;
    }
}

function requireAuth(req) {
    const payload = authMiddleware(req);
    if (!payload) return null;
    return { id: payload.userId, phone: payload.userId }; // Simplified user object
}

// Send SSE event to a specific response
function sendSSEEvent(res, eventType, data) {
    if (res.writableEnded) return;
    try {
        res.write(`event: ${eventType}\n`);
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (e) {
        console.error('[SSE] Send error:', e.message);
    }
}

// Broadcast station update to all subscribed clients
function broadcastStationUpdate(stationId, eventType, data) {
    // Broadcast to station-specific subscribers
    const stationConnections = sseConnections.station[stationId] || [];
    stationConnections.forEach(res => {
        sendSSEEvent(res, eventType, data);
    });

    // Broadcast to nearby subscribers
    const station = services.find(s => s.id === stationId);
    if (station) {
        sseConnections.nearby.forEach(({ res, lat, lng, radius }) => {
            const distance = calculateDistance(lat, lng, station.lat, station.lng);
            if (distance <= radius) {
                sendSSEEvent(res, eventType, {
                    ...data,
                    distance: Math.round(distance * 100) / 100
                });
            }
        });
    }
}

// Haversine distance calculation (km)
function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// Handle SSE connections for station updates
function handleStationSSE(req, res, stationId) {
    stationId = parseInt(stationId);
    const station = services.find(s => s.id === stationId);

    if (!station) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Station not found' }));
        return true;
    }

    // Set SSE headers
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no'
    });

    // Send initial station status
    sendSSEEvent(res, 'station_status', {
        stationId: station.id,
        name: station.name,
        status: station.status,
        price: station.price,
        lastUpdated: station.lastUpdated
    });

    // Register connection
    if (!sseConnections.station[stationId]) {
        sseConnections.station[stationId] = [];
    }
    sseConnections.station[stationId].push(res);

    console.log(`[SSE] Client subscribed to station ${stationId} (${station.name})`);

    // Handle client disconnect
    req.on('close', () => {
        const connections = sseConnections.station[stationId] || [];
        const index = connections.indexOf(res);
        if (index > -1) {
            connections.splice(index, 1);
        }
        console.log(`[SSE] Client unsubscribed from station ${stationId}`);
    });

    // Keep connection alive with heartbeat
    const heartbeat = setInterval(() => {
        if (res.writableEnded) {
            clearInterval(heartbeat);
            return;
        }
        try {
            res.write(': heartbeat\n\n');
        } catch (e) {
            clearInterval(heartbeat);
        }
    }, 30000);

    req.on('close', () => clearInterval(heartbeat));

    return true;
}

// Handle SSE connections for nearby updates
function handleNearbySSE(req, res) {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const lat = parseFloat(url.searchParams.get('lat'));
    const lng = parseFloat(url.searchParams.get('lng'));
    const radius = parseFloat(url.searchParams.get('radius')) || 10;

    if (isNaN(lat) || isNaN(lng)) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'lat and lng query parameters are required' }));
        return true;
    }

    // Set SSE headers
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no'
    });

    // Send initial nearby stations status
    const nearbyStations = services
        .filter(s => s.type === 'fuel_station')
        .map(station => ({
            stationId: station.id,
            name: station.name,
            status: station.status,
            price: station.price,
            distance: Math.round(calculateDistance(lat, lng, station.lat, station.lng) * 100) / 100,
            lastUpdated: station.lastUpdated
        }))
        .filter(s => s.distance <= radius)
        .sort((a, b) => a.distance - b.distance);

    sendSSEEvent(res, 'nearby_stations', {
        stations: nearbyStations,
        center: { lat, lng },
        radius
    });

    // Register connection
    const clientInfo = { res, lat, lng, radius };
    sseConnections.nearby.push(clientInfo);

    console.log(`[SSE] Client subscribed to nearby (${lat.toFixed(4)}, ${lng.toFixed(4)}, ${radius}km)`);

    // Handle client disconnect
    req.on('close', () => {
        const index = sseConnections.nearby.indexOf(clientInfo);
        if (index > -1) {
            sseConnections.nearby.splice(index, 1);
        }
        console.log('[SSE] Client unsubscribed from nearby');
    });

    // Keep connection alive
    const heartbeat = setInterval(() => {
        if (res.writableEnded) {
            clearInterval(heartbeat);
            return;
        }
        try {
            res.write(': heartbeat\n\n');
        } catch (e) {
            clearInterval(heartbeat);
        }
    }, 30000);

    req.on('close', () => clearInterval(heartbeat));

    return true;
}

// ==================== END PHASE 2 SETUP ====================

// Comprehensive Gondar service data
// Categories: fuel_station, mechanic, tire_shop, car_wash

let services = [
    // ==================== FUEL STATIONS ====================

    // Azezo Area - Major fuel corridor (south of Gondar, on highway to Bahir Dar)
    { id: 1, name: 'Total Energies - Azezo Main', type: 'fuel_station', lat: 12.5589, lng: 37.4521, status: 'available', price: 54.50, phone: '+251 58 111 2345', services: ['diesel', 'petrol', 'lubricants'], lastUpdated: new Date().toISOString(), trustScore: 4.5, reviewCount: 89, isVerified: true, fuelTypes: ['diesel', 'petrol'], amenities: ['convenience_store', 'restroom', 'atm'], is24Hours: false, reviews: [{ user: 'Abebe', rating: 5, comment: 'Great service!', verified: true, date: '2026-04-15' }, { user: 'Marta', rating: 4, comment: 'Good prices', verified: true, date: '2026-04-10' }] },
    { id: 2, name: 'Oilibya - Azezo', type: 'fuel_station', lat: 12.5612, lng: 37.4498, status: 'available', price: 54.00, phone: '+251 58 111 3456', services: ['diesel', 'petrol', 'convenience_store'], lastUpdated: new Date().toISOString(), trustScore: 4.2, reviewCount: 67, isVerified: true, fuelTypes: ['diesel', 'petrol'], amenities: ['convenience_store'], is24Hours: false, reviews: [{ user: 'Kaleb', rating: 4, comment: 'Reliable', verified: true, date: '2026-04-12' }] },
    { id: 3, name: 'Nile Petroleum - Azezo', type: 'fuel_station', lat: 12.5634, lng: 37.4476, status: 'low', price: 55.00, phone: '+251 58 111 4567', services: ['diesel', 'petrol'], lastUpdated: new Date().toISOString(), trustScore: 3.8, reviewCount: 45, isVerified: true, fuelTypes: ['diesel', 'petrol'], amenities: [], is24Hours: false, reviews: [{ user: 'Dawit', rating: 3, comment: 'Sometimes runs out', verified: true, date: '2026-04-08' }] },
    { id: 4, name: 'Libya Oil - Azezo', type: 'fuel_station', lat: 12.5578, lng: 37.4535, status: 'available', price: 53.50, phone: '+251 58 111 5678', services: ['diesel', 'petrol', 'lubricants', 'car_wash'], lastUpdated: new Date().toISOString(), trustScore: 4.3, reviewCount: 72, isVerified: true, fuelTypes: ['diesel', 'petrol'], amenities: ['convenience_store', 'restroom', 'car_wash'], is24Hours: false, reviews: [{ user: 'Selam', rating: 5, comment: 'Best in Azezo!', verified: true, date: '2026-04-14' }] },
    { id: 5, name: 'Ola Energy - Azezo', type: 'fuel_station', lat: 12.5656, lng: 37.4455, status: 'low', price: 54.50, phone: '+251 58 111 6789', services: ['diesel', 'petrol'], lastUpdated: new Date().toISOString(), trustScore: 4.0, reviewCount: 38, isVerified: true, fuelTypes: ['diesel', 'petrol'], amenities: [], is24Hours: false, reviews: [{ user: 'Yonas', rating: 4, comment: 'Good service', verified: true, date: '2026-04-11' }] },

    // City Center / Piazza Area
    { id: 6, name: 'Total Energies - Piazza', type: 'fuel_station', lat: 12.6089, lng: 37.4654, status: 'available', price: 55.00, phone: '+251 58 111 7890', services: ['diesel', 'petrol', 'lubricants'], lastUpdated: new Date().toISOString(), trustScore: 4.6, reviewCount: 124, isVerified: true, fuelTypes: ['diesel', 'petrol'], amenities: ['convenience_store', 'restroom', 'atm'], is24Hours: true, reviews: [{ user: 'Hanna', rating: 5, comment: 'Open 24/7!', verified: true, date: '2026-04-16' }, { user: 'Mikael', rating: 5, comment: 'Excellent', verified: true, date: '2026-04-13' }] },
    { id: 7, name: 'Oilibya - Arada', type: 'fuel_station', lat: 12.6045, lng: 37.4612, status: 'available', price: 55.00, phone: '+251 58 111 8901', services: ['diesel', 'petrol', 'convenience_store'], lastUpdated: new Date().toISOString(), trustScore: 4.1, reviewCount: 56, isVerified: true, fuelTypes: ['diesel', 'petrol'], amenities: ['convenience_store'], is24Hours: false, reviews: [{ user: 'Tigist', rating: 4, comment: 'Convenient location', verified: true, date: '2026-04-09' }] },

    // Stadium / Fasilides Area
    { id: 8, name: 'Nile Petroleum - Stadium', type: 'fuel_station', lat: 12.6123, lng: 37.4723, status: 'available', price: 54.00, phone: '+251 58 111 9012', services: ['diesel', 'petrol'], lastUpdated: new Date().toISOString(), trustScore: 4.4, reviewCount: 78, isVerified: true, fuelTypes: ['diesel', 'petrol'], amenities: ['restroom'], is24Hours: false, reviews: [{ user: 'Bezawit', rating: 5, comment: 'Fast service', verified: true, date: '2026-04-15' }] },

    // Maraki Area
    { id: 9, name: 'Libya Oil - Maraki', type: 'fuel_station', lat: 12.5934, lng: 37.4456, status: 'empty', price: null, phone: '+251 58 112 0123', services: ['diesel', 'petrol'], lastUpdated: new Date().toISOString(), trustScore: 3.5, reviewCount: 34, isVerified: true, fuelTypes: ['diesel', 'petrol'], amenities: [], is24Hours: false, reviews: [{ user: 'Fikadu', rating: 3, comment: 'Often empty', verified: true, date: '2026-04-07' }] },

    // Airport Road
    { id: 10, name: 'Total Energies - Airport Rd', type: 'fuel_station', lat: 12.6234, lng: 37.4812, status: 'low', price: 56.00, phone: '+251 58 112 1234', services: ['diesel', 'petrol', 'lubricants'], lastUpdated: new Date().toISOString(), trustScore: 4.2, reviewCount: 91, isVerified: true, fuelTypes: ['diesel', 'petrol'], amenities: ['convenience_store', 'restroom'], is24Hours: false, reviews: [{ user: 'Natan', rating: 4, comment: 'Good for airport trips', verified: true, date: '2026-04-14' }] },

    // Kebele 08 / Addis Alem Area
    { id: 11, name: 'Ola Energy - Addis Alem', type: 'fuel_station', lat: 12.5978, lng: 37.4689, status: 'available', price: 54.50, phone: '+251 58 112 2345', services: ['diesel', 'petrol'], lastUpdated: new Date().toISOString(), trustScore: 4.0, reviewCount: 42, isVerified: true, fuelTypes: ['diesel', 'petrol'], amenities: [], is24Hours: false, reviews: [{ user: 'Rahel', rating: 4, comment: 'Decent prices', verified: true, date: '2026-04-10' }] },

    // Near University of Gondar
    { id: 12, name: 'Total Energies - University', type: 'fuel_station', lat: 12.6189, lng: 37.4534, status: 'available', price: 54.00, phone: '+251 58 112 3456', services: ['diesel', 'petrol', 'convenience_store'], lastUpdated: new Date().toISOString(), trustScore: 4.7, reviewCount: 156, isVerified: true, fuelTypes: ['diesel', 'petrol'], amenities: ['convenience_store', 'restroom', 'atm'], is24Hours: false, reviews: [{ user: 'Dagim', rating: 5, comment: 'Student friendly!', verified: true, date: '2026-04-16' }, { user: 'Sara', rating: 5, comment: 'Always has fuel', verified: true, date: '2026-04-12' }] },

    // ==================== MECHANIC SHOPS ====================

    // Azezo Area Mechanics
    { id: 13, name: 'Azezo Auto Repair', type: 'mechanic', lat: 12.5601, lng: 37.4510, status: 'open', price: null, phone: '+251 91 876 5432', services: ['engine_repair', 'oil_change', 'brake_service', 'electrical'], lastUpdated: new Date().toISOString(), trustScore: 4.6, reviewCount: 67, isVerified: true, bookingSlots: ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'], garageServiceTypes: ['engine_repair', 'oil_change', 'brake_service', 'electrical'], reviews: [{ user: 'Muluken', rating: 5, comment: 'Fixed my engine quickly!', verified: true, date: '2026-04-15' }] },
    { id: 14, name: 'Quick Fix Garage - Azezo', type: 'mechanic', lat: 12.5623, lng: 37.4488, status: 'open', price: null, phone: '+251 91 876 5433', services: ['general_repair', 'suspension', 'transmission'], lastUpdated: new Date().toISOString(), trustScore: 4.3, reviewCount: 45, isVerified: true, bookingSlots: ['08:00', '09:00', '10:00', '13:00', '14:00'], garageServiceTypes: ['general_repair', 'suspension', 'transmission'], reviews: [{ user: 'Kassahun', rating: 4, comment: 'Good work', verified: true, date: '2026-04-11' }] },
    { id: 15, name: 'Diesel Specialist - Azezo', type: 'mechanic', lat: 12.5645, lng: 37.4467, status: 'busy', price: null, phone: '+251 91 876 5434', services: ['diesel_engine', 'fuel_injection', 'turbo_repair'], lastUpdated: new Date().toISOString(), trustScore: 4.8, reviewCount: 89, isVerified: true, bookingSlots: ['09:00', '10:00', '11:00', '14:00', '15:00'], garageServiceTypes: ['diesel_engine', 'fuel_injection', 'turbo_repair'], reviews: [{ user: 'Getachew', rating: 5, comment: 'Diesel experts!', verified: true, date: '2026-04-16' }, { user: 'Alemu', rating: 5, comment: 'Saved my truck', verified: true, date: '2026-04-13' }] },

    // City Center Mechanics
    { id: 16, name: 'Central Auto Garage', type: 'mechanic', lat: 12.6067, lng: 37.4634, status: 'open', price: null, phone: '+251 91 876 5435', services: ['general_repair', 'oil_change', 'tire_rotation'], lastUpdated: new Date().toISOString(), trustScore: 4.1, reviewCount: 52, isVerified: true, bookingSlots: ['08:00', '09:00', '10:00', '11:00', '13:00', '14:00'], garageServiceTypes: ['general_repair', 'oil_change', 'tire_rotation'], reviews: [{ user: 'Wondwosen', rating: 4, comment: 'Reliable', verified: true, date: '2026-04-10' }] },
    { id: 17, name: 'Piazza Auto Repair', type: 'mechanic', lat: 12.6078, lng: 37.4645, status: 'open', price: null, phone: '+251 91 876 5436', services: ['engine_repair', 'brake_service', 'ac_repair'], lastUpdated: new Date().toISOString(), trustScore: 4.4, reviewCount: 73, isVerified: true, bookingSlots: ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'], garageServiceTypes: ['engine_repair', 'brake_service', 'ac_repair'], reviews: [{ user: 'Zerihun', rating: 5, comment: 'Great AC work', verified: true, date: '2026-04-14' }] },

    // Stadium Area
    { id: 18, name: 'Stadium Garage', type: 'mechanic', lat: 12.6134, lng: 37.4701, status: 'open', price: null, phone: '+251 91 876 5437', services: ['general_repair', 'suspension', 'wheel_alignment'], lastUpdated: new Date().toISOString(), trustScore: 4.2, reviewCount: 38, isVerified: true, bookingSlots: ['08:00', '09:00', '10:00', '13:00', '14:00'], garageServiceTypes: ['general_repair', 'suspension', 'wheel_alignment'], reviews: [{ user: 'Abraham', rating: 4, comment: 'Good alignment', verified: true, date: '2026-04-09' }] },

    // Maraki Area
    { id: 19, name: 'Maraki Auto Service', type: 'mechanic', lat: 12.5912, lng: 37.4478, status: 'closed', price: null, phone: '+251 91 876 5438', services: ['engine_repair', 'electrical', 'transmission'], lastUpdated: new Date().toISOString(), trustScore: 3.9, reviewCount: 29, isVerified: true, bookingSlots: ['09:00', '10:00', '11:00', '14:00'], garageServiceTypes: ['engine_repair', 'electrical', 'transmission'], reviews: [{ user: 'Tesfaye', rating: 4, comment: 'Good but closes early', verified: true, date: '2026-04-08' }] },

    // ==================== TIRE SHOPS ====================

    // Azezo Area Tire Shops
    { id: 20, name: 'Azezo Tire & Wheel', type: 'tire_shop', lat: 12.5595, lng: 37.4515, status: 'open', price: null, phone: '+251 91 876 5440', services: ['tire_repair', 'tire_sales', 'balancing', 'air_fill'], lastUpdated: new Date().toISOString(), trustScore: 4.5, reviewCount: 56, isVerified: true, bookingSlots: ['08:00', '09:00', '10:00', '11:00', '13:00', '14:00'], reviews: [{ user: 'Girma', rating: 5, comment: 'Best tire shop!', verified: true, date: '2026-04-15' }] },
    { id: 21, name: 'Quick Air - Azezo', type: 'tire_shop', lat: 12.5618, lng: 37.4492, status: 'open', price: null, phone: '+251 91 876 5441', services: ['air_fill', 'patch_repair', 'tube_replacement'], lastUpdated: new Date().toISOString(), trustScore: 4.0, reviewCount: 34, isVerified: true, bookingSlots: ['08:00', '09:00', '10:00', '11:00', '12:00'], reviews: [{ user: 'Bereket', rating: 4, comment: 'Quick air fill', verified: true, date: '2026-04-11' }] },
    { id: 22, name: 'Modern Tire Center', type: 'tire_shop', lat: 12.5640, lng: 37.4470, status: 'open', price: null, phone: '+251 91 876 5442', services: ['tire_sales', 'balancing', 'rotation', 'alignment'], lastUpdated: new Date().toISOString(), trustScore: 4.7, reviewCount: 78, isVerified: true, bookingSlots: ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'], reviews: [{ user: 'Yohannes', rating: 5, comment: 'Professional alignment', verified: true, date: '2026-04-16' }, { user: 'Mekonnen', rating: 5, comment: 'Great tire selection', verified: true, date: '2026-04-13' }] },

    // City Center Tire Shops
    { id: 23, name: 'Piazza Tire Service', type: 'tire_shop', lat: 12.6056, lng: 37.4623, status: 'open', price: null, phone: '+251 91 876 5443', services: ['tire_repair', 'air_fill', 'balancing'], lastUpdated: new Date().toISOString(), trustScore: 4.2, reviewCount: 41, isVerified: true, bookingSlots: ['08:00', '09:00', '10:00', '11:00', '13:00'], reviews: [{ user: 'Asfaw', rating: 4, comment: 'Good service', verified: true, date: '2026-04-10' }] },
    { id: 24, name: 'Arada Tire & Tube', type: 'tire_shop', lat: 12.6034, lng: 37.4601, status: 'busy', price: null, phone: '+251 91 876 5444', services: ['tire_repair', 'tube_replacement', 'patch_repair'], lastUpdated: new Date().toISOString(), trustScore: 3.8, reviewCount: 27, isVerified: true, bookingSlots: ['09:00', '10:00', '11:00', '14:00'], reviews: [{ user: 'Kidanemariam', rating: 4, comment: 'Good tube work', verified: true, date: '2026-04-09' }] },

    // Stadium Area
    { id: 25, name: 'Stadium Tire Shop', type: 'tire_shop', lat: 12.6145, lng: 37.4712, status: 'open', price: null, phone: '+251 91 876 5445', services: ['tire_repair', 'air_fill', 'tire_sales'], lastUpdated: new Date().toISOString(), trustScore: 4.1, reviewCount: 35, isVerified: true, bookingSlots: ['08:00', '09:00', '10:00', '13:00', '14:00'], reviews: [{ user: 'Tewodros', rating: 4, comment: 'Convenient', verified: true, date: '2026-04-12' }] },

    // ==================== CAR WASH ====================

    { id: 26, name: 'Sparkle Car Wash - Azezo', type: 'car_wash', lat: 12.5608, lng: 37.4502, status: 'open', price: 150, phone: '+251 91 876 5450', services: ['exterior_wash', 'interior_clean', 'engine_wash'], lastUpdated: new Date().toISOString(), trustScore: 4.4, reviewCount: 62, isVerified: true, bookingSlots: ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00'], reviews: [{ user: 'Ephrem', rating: 5, comment: 'Great wash!', verified: true, date: '2026-04-15' }] },
    { id: 27, name: 'Express Car Wash - Piazza', type: 'car_wash', lat: 12.6089, lng: 37.4667, status: 'open', price: 200, phone: '+251 91 876 5451', services: ['exterior_wash', 'wax', 'interior_clean'], lastUpdated: new Date().toISOString(), trustScore: 4.6, reviewCount: 89, isVerified: true, bookingSlots: ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'], reviews: [{ user: 'Nahom', rating: 5, comment: 'Fast and clean', verified: true, date: '2026-04-16' }, { user: 'Birtukan', rating: 5, comment: 'Best wax job', verified: true, date: '2026-04-13' }] },
    { id: 28, name: 'Premium Auto Spa', type: 'car_wash', lat: 12.6012, lng: 37.4589, status: 'busy', price: 300, phone: '+251 91 876 5452', services: ['full_detail', 'wax', 'polish', 'interior_deep_clean'], lastUpdated: new Date().toISOString(), trustScore: 4.8, reviewCount: 112, isVerified: true, bookingSlots: ['10:00', '11:00', '14:00', '15:00', '16:00'], reviews: [{ user: 'Henok', rating: 5, comment: 'Worth every birr!', verified: true, date: '2026-04-16' }, { user: 'Meron', rating: 5, comment: 'Luxury treatment', verified: true, date: '2026-04-14' }] },
];

let reports = [];
let bookings = [];
let reviews = [];

// Vehicle profiles for demo
let vehicles = [
    { id: 1, name: 'My Toyota Corolla', fuelType: 'petrol', range: 450, preferredGarage: 13, commonProblems: ['brakes'], costHistory: [{ date: '2026-04-01', type: 'fuel', amount: 2500, location: 'Total Energies - Azezo Main' }, { date: '2026-03-15', type: 'repair', amount: 3500, description: 'Brake service' }] },
    { id: 2, name: 'Work Truck', fuelType: 'diesel', range: 600, preferredGarage: 15, commonProblems: ['fuel_injection'], costHistory: [{ date: '2026-04-05', type: 'fuel', amount: 4500, location: 'Oilibya - Azezo' }] }
];

const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const pathname = url.pathname;
    const method = req.method;

    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // API Routes
    if (pathname.startsWith('/api/')) {
        handleApi(req, res, pathname, method);
        return;
    }

    // Static files
    if (pathname === '/' || pathname === '/index.html') {
        serveFile(res, path.join(__dirname, 'index.html'));
        return;
    }

    // Serve other static files
    const ext = path.extname(pathname).toLowerCase();
    const filePath = path.join(__dirname, pathname);

    if (MIME_TYPES[ext] && fs.existsSync(filePath)) {
        serveFile(res, filePath);
        return;
    }

    // 404
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 Not Found');
});

function handleApi(req, res, pathname, method) {
    // ==================== PHASE 2: SSE ENDPOINTS ====================

    // GET /api/events/station/:id - SSE for station updates
    if (pathname.match(/^\/api\/events\/station\/\d+$/) && method === 'GET') {
        const stationId = pathname.split('/')[4]; // Index 4 because path starts with /
        return handleStationSSE(req, res, stationId);
    }

    // GET /api/events/nearby - SSE for nearby station updates
    if (pathname === '/api/events/nearby' && method === 'GET') {
        return handleNearbySSE(req, res);
    }

    // GET /api/ws-token - Get SSE auth token (valid for 5 minutes)
    if (pathname === '/api/ws-token' && method === 'GET') {
        const user = requireAuth(req);
        if (!user) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Unauthorized' }));
            return true;
        }
        const token = generateSSEPolicy(user.id);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: true,
            token,
            expiresAt: Date.now() + 5 * 60 * 1000,
            endpoints: {
                station: '/api/events/station/{stationId}',
                nearby: '/api/events/nearby?lat={lat}&lng={lng}&radius={radius}'
            }
        }));
        return true;
    }

    // POST /api/subscribe/station/:id - REST fallback for station subscription
    if (pathname.match(/^\/api\/subscribe\/station\/\d+$/) && method === 'POST') {
        const stationId = parseInt(pathname.split('/')[4]); // Index 4 because path starts with /
        const station = services.find(s => s.id === stationId);
        if (!station) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Station not found' }));
            return true;
        }
        // Return subscription info for client to connect via SSE
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: true,
            subscription: {
                type: 'sse',
                endpoint: `/api/events/station/${stationId}`,
                station: {
                    id: station.id,
                    name: station.name,
                    status: station.status,
                    price: station.price
                }
            }
        }));
        return true;
    }

    // ==================== END SSE ENDPOINTS ====================

    if (pathname === '/api/services' && method === 'GET') {
        const url = new URL(req.url, `http://localhost:${PORT}`);
        const type = url.searchParams.get('type');
        const fuelType = url.searchParams.get('fuelType');
        const maxPrice = url.searchParams.get('maxPrice');
        const is24Hours = url.searchParams.get('is24Hours');

        let filtered = services;
        if (type) {
            filtered = filtered.filter(s => s.type === type);
        }
        if (fuelType) {
            filtered = filtered.filter(s => s.fuelTypes && s.fuelTypes.includes(fuelType));
        }
        if (maxPrice) {
            filtered = filtered.filter(s => s.price !== null && s.price <= parseFloat(maxPrice));
        }
        if (is24Hours === 'true') {
            filtered = filtered.filter(s => s.is24Hours === true);
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(filtered));
        return;
    }

    if (pathname === '/api/stations' && method === 'GET') {
        // Legacy endpoint - return only fuel stations
        const fuelStations = services.filter(s => s.type === 'fuel_station');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(fuelStations));
        return;
    }

    if (pathname.match(/^\/api\/services\/\d+$/) && method === 'GET') {
        const id = parseInt(pathname.split('/').pop());
        const service = services.find(s => s.id === id);
        if (service) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(service));
        } else {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Service not found' }));
        }
        return;
    }

    if (pathname.match(/^\/api\/services\/\d+\/reviews$/) && method === 'GET') {
        const id = parseInt(pathname.split('/')[3]);
        const service = services.find(s => s.id === id);
        if (service) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(service.reviews || []));
        } else {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Service not found' }));
        }
        return;
    }

    if (pathname === '/api/reviews' && method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const service = services.find(s => s.id === data.serviceId);

                if (service) {
                    const newReview = {
                        user: data.user || 'Anonymous',
                        rating: data.rating,
                        comment: data.comment,
                        verified: false, // Pending verification
                        date: new Date().toISOString().split('T')[0]
                    };

                    if (!service.reviews) service.reviews = [];
                    service.reviews.unshift(newReview);

                    // Update trust score
                    const avgRating = service.reviews.reduce((sum, r) => sum + r.rating, 0) / service.reviews.length;
                    service.trustScore = Math.round(avgRating * 10) / 10;
                    service.reviewCount = service.reviews.length;

                    console.log(`[REVIEW] ${service.name}: ${data.rating} stars - "${data.comment}"`);

                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true, review: newReview, trustScore: service.trustScore }));
                } else {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Service not found' }));
                }
            } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid JSON' }));
            }
        });
        return;
    }

    if (pathname === '/api/book' && method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const service = services.find(s => s.id === data.serviceId);

                if (service) {
                    const booking = {
                        id: bookings.length + 1,
                        serviceId: data.serviceId,
                        serviceName: service.name,
                        vehicleId: data.vehicleId,
                        timeSlot: data.timeSlot,
                        type: data.type || 'garage',
                        status: 'confirmed',
                        createdAt: new Date().toISOString()
                    };

                    bookings.push(booking);

                    console.log(`[BOOKING] ${service.name}: ${data.timeSlot} slot booked`);

                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true, booking }));
                } else {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Service not found' }));
                }
            } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid JSON' }));
            }
        });
        return;
    }

    if (pathname === '/api/report' && method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const service = services.find(s => s.id === data.serviceId || s.id === data.stationId);

                if (service) {
                    if (data.status) service.status = data.status;
                    if (data.price !== undefined && data.price !== null) service.price = data.price;
                    service.lastUpdated = new Date().toISOString();

                    reports.push({
                        serviceId: data.serviceId || data.stationId,
                        serviceName: service.name,
                        type: service.type,
                        status: data.status,
                        price: data.price,
                        timestamp: new Date().toISOString()
                    });

                    console.log(`[REPORT] ${service.name} (${service.type}) updated: ${data.status}`);

                    // Broadcast station update via SSE
                    if (service.type === 'fuel_station') {
                        broadcastStationUpdate(service.id, 'status_update', {
                            stationId: service.id,
                            name: service.name,
                            status: service.status,
                            price: service.price,
                            lastUpdated: service.lastUpdated
                        });
                    }

                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true, service }));
                } else {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Service not found' }));
                }
            } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid JSON' }));
            }
        });
        return;
    }

    if (pathname === '/api/reports' && method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(reports));
        return;
    }

    // Vehicle endpoints
    if (pathname === '/api/vehicles' && method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(vehicles));
        return;
    }

    if (pathname === '/api/vehicles' && method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const newVehicle = {
                    id: vehicles.length + 1,
                    name: data.name,
                    fuelType: data.fuelType,
                    range: data.range,
                    preferredGarage: data.preferredGarage,
                    commonProblems: data.commonProblems || [],
                    costHistory: []
                };
                vehicles.push(newVehicle);

                console.log(`[VEHICLE] Added: ${newVehicle.name}`);

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, vehicle: newVehicle }));
            } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid JSON' }));
            }
        });
        return;
    }

    if (pathname.match(/^\/api\/vehicles\/\d+$/) && method === 'GET') {
        const id = parseInt(pathname.split('/').pop());
        const vehicle = vehicles.find(v => v.id === id);
        if (vehicle) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(vehicle));
        } else {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Vehicle not found' }));
        }
        return;
    }

    if (pathname.match(/^\/api\/vehicles\/\d+\/costs$/) && method === 'GET') {
        const id = parseInt(pathname.split('/')[3]);
        const vehicle = vehicles.find(v => v.id === id);
        if (vehicle) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(vehicle.costHistory || []));
        } else {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Vehicle not found' }));
        }
        return;
    }

    if (pathname === '/api/stats' && method === 'GET') {
        const stats = {
            total: services.length,
            byType: {
                fuel_station: services.filter(s => s.type === 'fuel_station').length,
                mechanic: services.filter(s => s.type === 'mechanic').length,
                tire_shop: services.filter(s => s.type === 'tire_shop').length,
                car_wash: services.filter(s => s.type === 'car_wash').length
            },
            fuelStatus: {
                available: services.filter(s => s.type === 'fuel_station' && s.status === 'available').length,
                low: services.filter(s => s.type === 'fuel_station' && s.status === 'low').length,
                empty: services.filter(s => s.type === 'fuel_station' && s.status === 'empty').length
            },
            avgPrice: (() => {
                const fuelWithPrice = services.filter(s => s.type === 'fuel_station' && s.price !== null);
                if (fuelWithPrice.length === 0) return 0;
                return (fuelWithPrice.reduce((sum, s) => sum + s.price, 0) / fuelWithPrice.length).toFixed(2);
            })()
        };
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(stats));
        return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Endpoint not found' }));
}

function serveFile(res, filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
        if (err) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('500 Internal Server Error');
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content);
        }
    });
}

server.listen(PORT, () => {
    const fuelCount = services.filter(s => s.type === 'fuel_station').length;
    const mechanicCount = services.filter(s => s.type === 'mechanic').length;
    const tireCount = services.filter(s => s.type === 'tire_shop').length;
    const carWashCount = services.filter(s => s.type === 'car_wash').length;

    console.log('');
    console.log('=========================================');
    console.log('  GONDAR FUEL TRACKER - SERVER STARTED');
    console.log('=========================================');
    console.log('  Open: http://localhost:' + PORT);
    console.log('');
    console.log('  Services Loaded:');
    console.log('    - Fuel Stations: ' + fuelCount + ' (including Azezo)');
    console.log('    - Mechanics: ' + mechanicCount);
    console.log('    - Tire Shops: ' + tireCount);
    console.log('    - Car Washes: ' + carWashCount);
    console.log('');
    console.log('  New Features:');
    console.log('    - Trust scores & reviews');
    console.log('    - Booking system');
    console.log('    - Vehicle profiles');
    console.log('    - Cost tracking');
    console.log('');
    console.log('  Ready! Press Ctrl+C to stop.');
    console.log('=========================================');
    console.log('');
});
