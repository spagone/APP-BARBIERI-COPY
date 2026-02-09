const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();

// MIDDLEWARE
app.use(cors());
app.use(express.json());

// 🔗 CONNECT MONGODB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

// ROUTES
const authRoutes = require('./routes/authRoutes');
app.use('/api/auth', authRoutes);

// TEST ROUTE
app.get('/', (req, res) => {
  res.send('API MyBarber ONLINE');
});

// SERVER
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
