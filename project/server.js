const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();

app.use(express.json());

// ── Connect to MongoDB then load routes and start server ──
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected ✅');

    // ── API Routes (before static!) ───────────────────────
    const userRoutes = require('./routes/userRoutes');
    const carRoutes  = require('./routes/carRoutes');
    app.use('/api/auth', userRoutes);
    app.use('/api/cars', carRoutes);
    console.log('Routes registered ✅');

    // ── API Health Check ──────────────────────────────────
    app.get('/api', (req, res) => {
      res.json({ message: 'RevXChange API is running' });
    });

    // ── Static files (after API routes!) ─────────────────
    app.use(express.static(path.join(__dirname, 'public')));

    // ── Page Routes ───────────────────────────────────────
    app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, 'views', 'index.html'));
    });
    app.get('/used-cars.html', (req, res) => {
      res.sendFile(path.join(__dirname, 'views', 'used-cars.html'));
    });
    app.get('/buy-cars.html', (req, res) => {
      res.sendFile(path.join(__dirname, 'views', 'buy-cars.html'));
    });
    app.get('/communities.html', (req, res) => {
      res.sendFile(path.join(__dirname, 'views', 'communities.html'));
    });
    app.get('/sell-car.html', (req, res) => {
      res.sendFile(path.join(__dirname, 'views', 'sell-car.html'));
    });
    app.get('/login.html', (req, res) => {
      res.sendFile(path.join(__dirname, 'views', 'login.html'));
    });
    app.get('/dashboard.html', (req, res) => {
      res.sendFile(path.join(__dirname, 'views', 'dashboard.html'));
    });
    app.get('/admin.html', (req, res) => {
      res.sendFile(path.join(__dirname, 'views', 'admin.html'));
    });
    app.get('/Auctioned-cars.html', (req, res) => {
      res.sendFile(path.join(__dirname, 'views', 'Auctioned-cars.html'));
    });

    // ── Deep-link to a specific car — serves used-cars; JS opens the card
    app.get('/car/:id', (req, res) => {
      res.sendFile(path.join(__dirname, 'views', 'used-cars.html'));
    });

    app.listen(process.env.PORT || 3000, () => {
      console.log(`Server running on http://localhost:${process.env.PORT || 3000}`);
    });
  })
  .catch(err => console.error('MongoDB connection failed ❌', err));