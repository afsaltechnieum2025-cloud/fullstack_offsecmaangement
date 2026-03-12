const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:8080'] }));
app.use(express.json());

// Routes — ALL must be before app.listen
const authRoutes = require('./routes/auth');
const trendingRoutes = require('./routes/trending');
const usersRoutes = require('./routes/user');  // ← 'users' not 'user'

app.use('/api/auth', authRoutes);
app.use('/api/trending', trendingRoutes);
app.use('/api/users', usersRoutes);  // ← '/api/users' not '/api/user'

app.get('/', (req, res) => {
  res.json({ message: 'Backend is running!' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});