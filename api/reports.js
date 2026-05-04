const { reports } = require('./data');

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

  if (method === 'GET') {
    res.status(200).json(reports);
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}
