const { services, reports } = require('./data');

export default function handler(req, res) {
  const { method } = req;

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (method === 'POST') {
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

  res.status(405).json({ error: 'Method not allowed' });
}
