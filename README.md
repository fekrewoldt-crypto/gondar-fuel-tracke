# Gondar Fuel Management System

Real-time fuel availability tracking platform for Gondar, Ethiopia.

## 🚀 Deployment

### GitHub Setup

1. **Create a new GitHub repository**
   - Go to https://github.com/new
   - Name it something like `gondar-fuel-tracker`
   - Make it public or private (your choice)
   - Don't initialize with README (we already have one)

2. **Connect your local project to GitHub**
   ```bash
   cd /Users/fikrewoldtadegegn/Desktop/Proto
   git init
   git add .
   git commit -m "Initial commit - Gondar Fuel Management System"
   
   # Add your GitHub repository as remote
   git remote add origin https://github.com/YOUR_USERNAME/gondar-fuel-tracker.git
   
   # Push to GitHub
   git branch -M main
   git push -u origin main
   ```

### Vercel Deployment

1. **Install Vercel CLI** (if not already installed)
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy to Vercel**
   ```bash
   cd /Users/fikrewoldtadegegn/Desktop/Proto
   vercel
   ```

4. **Follow the prompts**
   - Set up and deploy? Yes
   - Link to existing project? No (create new)
   - Project name: gondar-fuel-tracker (or your choice)
   - Directory: ./ (current directory)
   - Settings: Use defaults

5. **Connect to GitHub** (recommended)
   - Go to https://vercel.com/dashboard
   - Find your project
   - Go to Settings → Git
   - Connect to your GitHub repository
   - Enable automatic deployments on push

## 📁 Project Structure

```
Proto/
├── api/
│   ├── data.js          # Shared data (services, reports)
│   └── services.js      # Main API handler
├── index.html           # Frontend application
├── server.js            # Local development server
├── package.json         # Node.js dependencies
├── vercel.json          # Vercel configuration
└── README.md           # This file
```

## 🔧 API Endpoints

- `GET /api/services` - Get all services (filter by `?type=fuel_station`)
- `GET /api/services/:id` - Get specific service by ID
- `POST /api/report` - Submit status update
- `GET /api/stats` - Get aggregated statistics
- `GET /api/reports` - Get all reports
- `GET /api/stations` - Legacy endpoint (fuel stations only)

## 🧪 Local Development

```bash
# Run local server
node server.js

# Or use Vercel dev
npm run dev
```

Open http://localhost:3000

## 📝 Notes

- Demo uses in-memory storage; data resets on server restart
- For production, consider adding a database (PostgreSQL, MongoDB, etc.)
- All locations are within Gondar city bounds
- Includes 28 service locations (12 fuel, 7 mechanic, 6 tire, 3 car wash)

## 🎯 Features

- Real-time fuel availability tracking
- Interactive map with service locations
- Status reporting system
- Multiple service types (fuel, mechanics, tire shops, car washes)
- Price tracking for fuel stations
- Mobile-responsive design
- Dark theme UI

## 📱 Technology Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript, Leaflet.js
- **Backend**: Node.js, Vercel Serverless Functions
- **Deployment**: Vercel
- **Version Control**: Git & GitHub

## 🤝 Contributing

This is a demo project. For full production features, see ARCHITECTURE.md.

## 📄 License

MIT License - Feel free to use and modify as needed.
