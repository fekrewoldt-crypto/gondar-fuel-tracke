const { services, reports } = require('./data');

module.exports = (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { url } = req;
  const urlParts = url.split('?');
  const pathname = urlParts[0];
  const queryString = urlParts[1] || '';
  const searchParams = new URLSearchParams(queryString);

  // GET /api/services
  if (pathname === '/api/services' && req.method === 'GET') {
    const type = searchParams.get('type');
    let filtered = services;
    
    if (type) {
      filtered = services.filter(s => s.type === type);
    }

    res.status(200).json(filtered);
    return;
  }

  // GET /api/services/:id
  if (pathname.startsWith('/api/services/') && req.method === 'GET') {
    const id = parseInt(pathname.split('/').pop());
    const service = services.find(s => s.id === id);
    
    if (service) {
      res.status(200).json(service);
    } else {
      res.status(404).json({ error: 'Service not found' });
    }
    return;
  }

  // POST /api/report
  if (pathname === '/api/report' && req.method === 'POST') {
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

          res.status(200).json({ success: true, service });
        } else {
          res.status(404).json({ error: 'Service not found' });
        }
      } catch (e) {
        res.status(400).json({ error: 'Invalid JSON' });
      }
    });
    return;
  }

  // GET /api/reports
  if (pathname === '/api/reports' && req.method === 'GET') {
    res.status(200).json(reports);
    return;
  }

  // GET /api/stats
  if (pathname === '/api/stats' && req.method === 'GET') {
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
    res.status(200).json(stats);
    return;
  }

  // GET /api/stations (legacy endpoint)
  if (pathname === '/api/stations' && req.method === 'GET') {
    const fuelStations = services.filter(s => s.type === 'fuel_station');
    res.status(200).json(fuelStations);
    return;
  }

  res.status(404).json({ error: 'Endpoint not found' });
};
