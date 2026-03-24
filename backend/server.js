const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:8080'] }));
app.use(express.json());

// Routes
const authRoutes      = require('./routes/auth');
const trendingRoutes  = require('./routes/trending');
const usersRoutes     = require('./routes/user');
const projectsRoutes  = require('./routes/projects');
const findingsRoutes  = require('./routes/findings');
const halloffameRoutes = require('./routes/halloffame'); // ← move require here

const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth',      authRoutes);
app.use('/api/trending',  trendingRoutes);
app.use('/api/users',     usersRoutes);
app.use('/api/projects',  projectsRoutes);
app.use('/api/findings',  findingsRoutes);
app.use('/api/wof',       halloffameRoutes); // ← register here with others

app.get('/', (req, res) => {
  res.json({ message: 'Backend is running!' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});