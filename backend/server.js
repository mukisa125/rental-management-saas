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

// Root route
app.get('/', (req, res) => {
  res.json({ message: 'Rental Management API', version: '1.0.0' });
});

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
