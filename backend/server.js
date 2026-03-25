const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// CORS configuration
app.use(cors({ 
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:8080'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
const authRoutes      = require('./routes/auth');
const trendingRoutes  = require('./routes/trending');
const usersRoutes     = require('./routes/user');
const projectsRoutes  = require('./routes/projects');
const findingsRoutes  = require('./routes/findings');
const halloffameRoutes = require('./routes/halloffame');

// Static files
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API routes
app.use('/api/auth',      authRoutes);
app.use('/api/trending',  trendingRoutes);
app.use('/api/users',     usersRoutes);
app.use('/api/projects',  projectsRoutes);
app.use('/api/findings',  findingsRoutes);
app.use('/api/wof',       halloffameRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Backend is running!',
    endpoints: {
      hallOfFame: '/api/wof',
      users: '/api/users',
      projects: '/api/projects',
      findings: '/api/findings'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`📍 Hall of Fame API: http://localhost:${PORT}/api/wof`);
  console.log(`📍 Test endpoint: http://localhost:${PORT}/api/wof/test`);
});