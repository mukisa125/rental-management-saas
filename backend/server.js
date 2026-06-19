require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`\n=== ${req.method} ${req.path} ===`);
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  next();
});

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/properties', require('./routes/propertyRoutes'));
app.use('/api/tenants', require('./routes/tenantRoutes'));
app.use('/api/payments', require('./routes/paymentRoutes'));
app.use('/api/maintenance', require('./routes/maintenanceRoutes'));
app.use('/api/units', require('./routes/unitRoutes'));
app.use('/api/owner', require('./routes/ownerRoutes'));
app.use('/api/self-owner', require('./routes/selfOwnerRoutes'));
app.use('/api/super-admin', require('./routes/superAdminRoutes'));
app.use('/api/tenant-portal', require('./routes/tenantPortalRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/documents', require('./routes/documentRoutes'));

// Root route
app.get('/', (req, res) => {
  res.json({ message: 'Rental Management API', version: '1.0.0' });
});

// Debug: list registered routes (helpful during development)
try {
  const routes = [];
  app._router.stack.forEach((mw) => {
    if (!mw) return;
    if (mw.route && mw.route.path) {
      const methods = Object.keys(mw.route.methods || {}).join(',').toUpperCase();
      routes.push(`${methods} ${mw.route.path}`);
      return;
    }
    if (mw.name === 'router' && mw.handle && Array.isArray(mw.handle.stack)) {
      mw.handle.stack.forEach((r) => {
        if (r && r.route && r.route.path) {
          const methods = Object.keys(r.route.methods || {}).join(',').toUpperCase();
          routes.push(`${methods} ${r.route.path}`);
        }
      });
    }
  });
  console.log('\nRegistered routes:');
  routes.sort().forEach(r => console.log(r));
} catch (e) {
  console.error('Error listing routes', e);
}

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ message: 'Server is running' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Error handling middleware (MUST be last)
app.use((err, req, res, next) => {
  console.error('Error caught by error handler:', err);
  console.error('Stack:', err.stack);
  if (!res.headersSent) {
    res.status(err.status || 500).json({ 
      message: err.message,
      error: process.env.NODE_ENV === 'development' ? err : {}
    });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
