const express = require('express');
const cors = require('cors');
const { query } = require('./db');
const config = require('./config');
const { authenticate, isAdmin } = require('./authMiddleware');
const userController = require('./userController');
const creditController = require('./creditController');
const adminController = require('./adminController');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Initialize database tables
async function initializeDatabase() {
  try {
    // Users table
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(10) DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Credit inputs table
    await query(`
      CREATE TABLE IF NOT EXISTS credit_inputs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        income DECIMAL(12, 2) NOT NULL,
        debts DECIMAL(12, 2) NOT NULL,
        employment_years INTEGER NOT NULL,
        credit_history_score INTEGER NOT NULL CHECK (credit_history_score >= 0 AND credit_history_score <= 100),
        requested_amount DECIMAL(12, 2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Credit results table
    await query(`
      CREATE TABLE IF NOT EXISTS credit_results (
        id SERIAL PRIMARY KEY,
        credit_input_id INTEGER REFERENCES credit_inputs(id) ON DELETE CASCADE,
        credit_score INTEGER NOT NULL CHECK (credit_score >= 0 AND credit_score <= 100),
        risk_level VARCHAR(10) NOT NULL,
        recommendation TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Database tables initialized');
  } catch (err) {
    console.error('Error initializing database:', err);
  }
}

// Routes
app.post('/api/register', userController.registerUser);
app.post('/api/login', userController.loginUser);
app.get('/api/me', authenticate, userController.getCurrentUser);

app.post('/api/credit-inputs', authenticate, creditController.submitCreditData);
app.get('/api/credit-inputs', authenticate, creditController.getCreditHistory);
app.get('/api/credit-results/:inputId', authenticate, creditController.getCreditResult);

app.get('/api/admin/users', authenticate, isAdmin, adminController.getAllUsers);
app.get('/api/admin/stats', authenticate, isAdmin, adminController.getUserStats);
app.patch('/api/admin/users/:userId', authenticate, isAdmin, adminController.updateUserRole);

// Start server
const PORT = config.PORT;
app.listen(PORT, async () => {
  await initializeDatabase();
  console.log(`Server running on port ${PORT}`);
});
