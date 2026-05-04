const { services } = require('./data');

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

  res.status(405).json({ error: 'Method not allowed' });
}
