const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;

// Comprehensive Gondar service data
// Categories: fuel_station, mechanic, tire_shop, car_wash

let services = [
    // ==================== FUEL STATIONS ====================

    // Azezo Area - Major fuel corridor (south of Gondar, on highway to Bahir Dar)
    { id: 1, name: 'Total Energies - Azezo Main', type: 'fuel_station', lat: 12.5589, lng: 37.4521, status: 'available', price: 54.50, phone: '+251 58 111 2345', services: ['diesel', 'petrol', 'lubricants'], lastUpdated: new Date().toISOString() },
    { id: 2, name: 'Oilibya - Azezo', type: 'fuel_station', lat: 12.5612, lng: 37.4498, status: 'available', price: 54.00, phone: '+251 58 111 3456', services: ['diesel', 'petrol', 'convenience_store'], lastUpdated: new Date().toISOString() },
    { id: 3, name: 'Nile Petroleum - Azezo', type: 'fuel_station', lat: 12.5634, lng: 37.4476, status: 'low', price: 55.00, phone: '+251 58 111 4567', services: ['diesel', 'petrol'], lastUpdated: new Date().toISOString() },
    { id: 4, name: 'Libya Oil - Azezo', type: 'fuel_station', lat: 12.5578, lng: 37.4535, status: 'available', price: 53.50, phone: '+251 58 111 5678', services: ['diesel', 'petrol', 'lubricants', 'car_wash'], lastUpdated: new Date().toISOString() },
    { id: 5, name: 'Ola Energy - Azezo', type: 'fuel_station', lat: 12.5656, lng: 37.4455, status: 'low', price: 54.50, phone: '+251 58 111 6789', services: ['diesel', 'petrol'], lastUpdated: new Date().toISOString() },

    // City Center / Piazza Area
    { id: 6, name: 'Total Energies - Piazza', type: 'fuel_station', lat: 12.6089, lng: 37.4654, status: 'available', price: 55.00, phone: '+251 58 111 7890', services: ['diesel', 'petrol', 'lubricants'], lastUpdated: new Date().toISOString() },
    { id: 7, name: 'Oilibya - Arada', type: 'fuel_station', lat: 12.6045, lng: 37.4612, status: 'available', price: 55.00, phone: '+251 58 111 8901', services: ['diesel', 'petrol', 'convenience_store'], lastUpdated: new Date().toISOString() },

    // Stadium / Fasilides Area
    { id: 8, name: 'Nile Petroleum - Stadium', type: 'fuel_station', lat: 12.6123, lng: 37.4723, status: 'available', price: 54.00, phone: '+251 58 111 9012', services: ['diesel', 'petrol'], lastUpdated: new Date().toISOString() },

    // Maraki Area
    { id: 9, name: 'Libya Oil - Maraki', type: 'fuel_station', lat: 12.5934, lng: 37.4456, status: 'empty', price: null, phone: '+251 58 112 0123', services: ['diesel', 'petrol'], lastUpdated: new Date().toISOString() },

    // Airport Road
    { id: 10, name: 'Total Energies - Airport Rd', type: 'fuel_station', lat: 12.6234, lng: 37.4812, status: 'low', price: 56.00, phone: '+251 58 112 1234', services: ['diesel', 'petrol', 'lubricants'], lastUpdated: new Date().toISOString() },

    // Kebele 08 / Addis Alem Area
    { id: 11, name: 'Ola Energy - Addis Alem', type: 'fuel_station', lat: 12.5978, lng: 37.4689, status: 'available', price: 54.50, phone: '+251 58 112 2345', services: ['diesel', 'petrol'], lastUpdated: new Date().toISOString() },

    // Near University of Gondar
    { id: 12, name: 'Total Energies - University', type: 'fuel_station', lat: 12.6189, lng: 37.4534, status: 'available', price: 54.00, phone: '+251 58 112 3456', services: ['diesel', 'petrol', 'convenience_store'], lastUpdated: new Date().toISOString() },

    // ==================== MECHANIC SHOPS ====================

    // Azezo Area Mechanics
    { id: 13, name: 'Azezo Auto Repair', type: 'mechanic', lat: 12.5601, lng: 37.4510, status: 'open', price: null, phone: '+251 91 876 5432', services: ['engine_repair', 'oil_change', 'brake_service', 'electrical'], lastUpdated: new Date().toISOString() },
    { id: 14, name: 'Quick Fix Garage - Azezo', type: 'mechanic', lat: 12.5623, lng: 37.4488, status: 'open', price: null, phone: '+251 91 876 5433', services: ['general_repair', 'suspension', 'transmission'], lastUpdated: new Date().toISOString() },
    { id: 15, name: 'Diesel Specialist - Azezo', type: 'mechanic', lat: 12.5645, lng: 37.4467, status: 'busy', price: null, phone: '+251 91 876 5434', services: ['diesel_engine', 'fuel_injection', 'turbo_repair'], lastUpdated: new Date().toISOString() },

    // City Center Mechanics
    { id: 16, name: 'Central Auto Garage', type: 'mechanic', lat: 12.6067, lng: 37.4634, status: 'open', price: null, phone: '+251 91 876 5435', services: ['general_repair', 'oil_change', 'tire_rotation'], lastUpdated: new Date().toISOString() },
    { id: 17, name: 'Piazza Auto Repair', type: 'mechanic', lat: 12.6078, lng: 37.4645, status: 'open', price: null, phone: '+251 91 876 5436', services: ['engine_repair', 'brake_service', 'ac_repair'], lastUpdated: new Date().toISOString() },

    // Stadium Area
    { id: 18, name: 'Stadium Garage', type: 'mechanic', lat: 12.6134, lng: 37.4701, status: 'open', price: null, phone: '+251 91 876 5437', services: ['general_repair', 'suspension', 'wheel_alignment'], lastUpdated: new Date().toISOString() },

    // Maraki Area
    { id: 19, name: 'Maraki Auto Service', type: 'mechanic', lat: 12.5912, lng: 37.4478, status: 'closed', price: null, phone: '+251 91 876 5438', services: ['engine_repair', 'electrical', 'transmission'], lastUpdated: new Date().toISOString() },

    // ==================== TIRE SHOPS ====================

    // Azezo Area Tire Shops
    { id: 20, name: 'Azezo Tire & Wheel', type: 'tire_shop', lat: 12.5595, lng: 37.4515, status: 'open', price: null, phone: '+251 91 876 5440', services: ['tire_repair', 'tire_sales', 'balancing', 'air_fill'], lastUpdated: new Date().toISOString() },
    { id: 21, name: 'Quick Air - Azezo', type: 'tire_shop', lat: 12.5618, lng: 37.4492, status: 'open', price: null, phone: '+251 91 876 5441', services: ['air_fill', 'patch_repair', 'tube_replacement'], lastUpdated: new Date().toISOString() },
    { id: 22, name: 'Modern Tire Center', type: 'tire_shop', lat: 12.5640, lng: 37.4470, status: 'open', price: null, phone: '+251 91 876 5442', services: ['tire_sales', 'balancing', 'rotation', 'alignment'], lastUpdated: new Date().toISOString() },

    // City Center Tire Shops
    { id: 23, name: 'Piazza Tire Service', type: 'tire_shop', lat: 12.6056, lng: 37.4623, status: 'open', price: null, phone: '+251 91 876 5443', services: ['tire_repair', 'air_fill', 'balancing'], lastUpdated: new Date().toISOString() },
    { id: 24, name: 'Arada Tire & Tube', type: 'tire_shop', lat: 12.6034, lng: 37.4601, status: 'busy', price: null, phone: '+251 91 876 5444', services: ['tire_repair', 'tube_replacement', 'patch_repair'], lastUpdated: new Date().toISOString() },

    // Stadium Area
    { id: 25, name: 'Stadium Tire Shop', type: 'tire_shop', lat: 12.6145, lng: 37.4712, status: 'open', price: null, phone: '+251 91 876 5445', services: ['tire_repair', 'air_fill', 'tire_sales'], lastUpdated: new Date().toISOString() },

    // ==================== CAR WASH ====================

    { id: 26, name: 'Sparkle Car Wash - Azezo', type: 'car_wash', lat: 12.5608, lng: 37.4502, status: 'open', price: 150, phone: '+251 91 876 5450', services: ['exterior_wash', 'interior_clean', 'engine_wash'], lastUpdated: new Date().toISOString() },
    { id: 27, name: 'Express Car Wash - Piazza', type: 'car_wash', lat: 12.6089, lng: 37.4667, status: 'open', price: 200, phone: '+251 91 876 5451', services: ['exterior_wash', 'wax', 'interior_clean'], lastUpdated: new Date().toISOString() },
    { id: 28, name: 'Premium Auto Spa', type: 'car_wash', lat: 12.6012, lng: 37.4589, status: 'busy', price: 300, phone: '+251 91 876 5452', services: ['full_detail', 'wax', 'polish', 'interior_deep_clean'], lastUpdated: new Date().toISOString() },
];

let reports = [];

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
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
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
    if (pathname === '/api/services' && method === 'GET') {
        const url = new URL(req.url, `http://localhost:${PORT}`);
        const type = url.searchParams.get('type');

        let filtered = services;
        if (type) {
            filtered = services.filter(s => s.type === type);
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

    if (pathname === '/api/services/:id' && method === 'GET') {
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
    console.log('  Ready! Press Ctrl+C to stop.');
    console.log('=========================================');
    console.log('');
});
