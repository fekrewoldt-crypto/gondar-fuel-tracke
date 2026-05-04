const { services } = require('../data');

export default function handler(req, res) {
  const { method, query } = req;

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (method === 'GET') {
    const { type } = query;
    let filtered = services;
    
    if (type) {
      filtered = services.filter(s => s.type === type);
    }

    res.status(200).json(filtered);
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}
