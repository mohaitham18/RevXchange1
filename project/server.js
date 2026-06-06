const express  = require('express');
const mongoose = require('mongoose');
const dotenv   = require('dotenv');
const path     = require('path');

dotenv.config();

const app = express();
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected ✅');

    // ── Routes ──────────────────────────────────────────────
    const userRoutes = require('./routes/userRoutes');
    const carRoutes = require('./routes/carRoutes');
    const adminRoutes = require('./routes/adminRoutes');
    const requestRoutes = require('./routes/requestRoutes');
    const communityRoutes = require('./routes/communityRoutes');
    const feedRoutes = require('./routes/feedRoutes');
    const postRoutes = require('./routes/postRoutes');

    app.use('/api/auth', userRoutes);
    app.use('/api/users', userRoutes);
    app.use('/api/cars', carRoutes);
    app.use('/api/admin',  adminRoutes);
    app.use('/api/requests', requestRoutes);
    app.use('/api/communities', communityRoutes);
    app.use('/api/feed',feedRoutes);
    app.use('/api/posts', postRoutes);
    app.use('/api/search', require('./routes/searchRoutes'));
   

    
    console.log('Routes registered ✅');

    app.get('/api', (req, res) => {
      res.json({ message: 'RevXChange API is running' });
    });

    // 404 for unknown API routes
    app.use('/api', (req, res) => {
      res.status(404).json({ message: 'API route not found', path: req.originalUrl });
    });

    // ── Static + HTML pages ──────────────────────────────────
    app.use(express.static(path.join(__dirname, 'public')));

    const views = path.join(__dirname, 'views');
    app.get('/',                   (_, res) => res.sendFile(path.join(views, 'index.html')));
    app.get('/used-cars.html',     (_, res) => res.sendFile(path.join(views, 'used-cars.html')));
    app.get('/buy-cars.html',      (_, res) => res.sendFile(path.join(views, 'buy-cars.html')));
    app.get('/rent-cars.html',     (_, res) => res.sendFile(path.join(views, 'rent-cars.html')));
    app.get('/communities.html',   (_, res) => res.sendFile(path.join(views, 'communities.html')));
    app.get('/feed.html',          (_, res) => res.sendFile(path.join(views, 'feed.html')));
    app.get('/sell-car.html',      (_, res) => res.sendFile(path.join(views, 'sell-car.html')));
    app.get('/login.html',         (_, res) => res.sendFile(path.join(views, 'login.html')));
    app.get('/dashboard.html',     (_, res) => res.sendFile(path.join(views, 'dashboard.html')));
    app.get('/admin.html',         (_, res) => res.sendFile(path.join(views, 'admin.html')));
    app.get('/Auctioned-cars.html',(_, res) => res.sendFile(path.join(views, 'Auctioned-cars.html')));
    app.get('/car/:id',            (_, res) => res.sendFile(path.join(views, 'used-cars.html')));

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
  })
  .catch(err => console.error('MongoDB connection failed ❌', err));