const { services } = require('../data');

export default function handler(req, res) {
  const { method, query } = req;
  const { id } = query;

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (method === 'GET') {
    const service = services.find(s => s.id === parseInt(id));
    
    if (service) {
      res.status(200).json(service);
    } else {
      res.status(404).json({ error: 'Service not found' });
    }
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}
