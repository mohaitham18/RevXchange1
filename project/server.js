const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();

app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected ✅');

    const userRoutes = require('./routes/userRoutes');
    const carRoutes = require('./routes/carRoutes');

    app.use('/api/auth', userRoutes);
    app.use('/api/users', userRoutes);
    app.use('/api/cars', carRoutes);

    console.log('Routes registered ✅');

    app.get('/api', (req, res) => {
      res.json({ message: 'RevXChange API is running' });
    });

    app.use('/api', (req, res) => {
      res.status(404).json({
        message: 'API route not found',
        path: req.originalUrl
      });
    });

    app.use(express.static(path.join(__dirname, 'public')));

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

    app.get('/car/:id', (req, res) => {
      res.sendFile(path.join(__dirname, 'views', 'used-cars.html'));
    });

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch(err => console.error('MongoDB connection failed ❌', err));
