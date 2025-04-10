const express = require('express');
const path = require('path');
const mysql = require('mysql2');
require('dotenv').config();
const { v4: uuidv4 } = require('uuid');
const session = require('express-session');
const axios = require('axios');
const app = express();
const port = 3000;

// Create MySQL connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'secure_api_db'
});

// Connect to the MySQL database
db.connect(err => {
  if (err) {
    console.error('Error connecting to the database:', err);
    return;
  }
  console.log('Connected to the MySQL database');
});

// Enable body parsing for forms and JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Set up session management
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: true
}));

// Serve static files (e.g., CSS files in /public)
app.use(express.static(path.join(__dirname, 'public')));

// Home route – shows registration form and login link with styling
app.get('/', (req, res) => {
  res.send(`
    <div style="max-width: 500px; margin: 50px auto; padding: 20px; font-family: Arial, sans-serif;">
      <h1 style="color: #2c3e50; text-align: center;">Welcome to the Country API App</h1>
      <h2 style="color: #34495e;">Register</h2>
      <form action="/register" method="POST" style="display: flex; flex-direction: column; gap: 15px;">
        <input type="text" name="username" placeholder="Enter username" required 
          style="padding: 10px; border: 1px solid #ddd; border-radius: 4px;" />
        <input type="password" name="password" placeholder="Enter password" required 
          style="padding: 10px; border: 1px solid #ddd; border-radius: 4px;" />
        <button type="submit" 
          style="padding: 10px; background-color: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer; transition: background-color 0.3s;">
          Register
        </button>
      </form>
      <p style="margin-top: 15px; text-align: center;">
        Already have an account? 
        <a href="/login" style="color: #3498db; text-decoration: none;">Login here</a>
      </p>
    </div>
  `);
});

// Handle user registration with styled response
app.post('/register', (req, res) => {
  const { username, password } = req.body;

  const query = 'SELECT * FROM users WHERE username = ?';
  db.query(query, [username], (err, result) => {
    if (err) {
      console.error('Error querying the database:', err);
      return res.send('<div style="text-align: center; color: #e74c3c;">An error occurred.</div>');
    }
    if (result.length > 0) {
      return res.send('<div style="text-align: center; color: #e74c3c;">Username already taken. Try a different one.</div>');
    }

    const insertQuery = 'INSERT INTO users (username, password) VALUES (?, ?)';
    db.query(insertQuery, [username, password], (err, result) => {
      if (err) {
        console.error('Error inserting user into database:', err);
        return res.send('<div style="text-align: center; color: #e74c3c;">An error occurred.</div>');
      }
      res.send(`
        <div style="text-align: center; padding: 20px;">
          <p style="color: #2ecc71;">Registered successfully!</p>
          You can now <a href="/login" style="color: #3498db; text-decoration: none;">login</a>.
        </div>
      `);
    });
  });
});

// Show login page (HTML form) - Assuming login.html exists in views folder
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

// Handle login form POST with styled response
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  const query = 'SELECT * FROM users WHERE username = ? AND password = ?';
  db.query(query, [username, password], (err, result) => {
    if (err) {
      console.error('Error querying the database:', err);
      return res.send('<div style="text-align: center; color: #e74c3c;">An error occurred.</div>');
    }

    if (result.length > 0) {
      req.session.user = result[0];
      res.send(`
        <div style="text-align: center; padding: 20px;">
          <p style="color: #2ecc71;">Login successful!</p>
          You can now <a href="/generate-api-key" style="color: #3498db; text-decoration: none;">generate an API key</a>.
        </div>
      `);
    } else {
      res.send('<div style="text-align: center; color: #e74c3c;">Login failed. Invalid username or password.</div>');
    }
  });
});

// Route to generate an API key with styled response
app.get('/generate-api-key', (req, res) => {
  if (!req.session.user) {
    return res.send('<div style="text-align: center; color: #e74c3c;">You must be logged in to generate an API key.</div>');
  }

  const userId = req.session.user.id;

  const checkSql = 'SELECT * FROM apikeys WHERE user_id = ?';
  db.query(checkSql, [userId], (err, rows) => {
    if (err) {
      console.error('Error checking API key:', err);
      return res.send(`<div style="text-align: center; color: #e74c3c;">Error: ${err.message}</div>`);
    }

    if (rows.length > 0) {
      return res.send(`
        <div style="text-align: center; padding: 20px;">
          You already have an API key: <strong style="color: #2c3e50;">${rows[0].api_key}</strong>
          <br><br>
          <a href="/country-details" 
            style="display: inline-block; padding: 10px 20px; background-color: #3498db; color: white; text-decoration: none; border-radius: 4px; transition: background-color 0.3s;">
            Let's Get Country Details
          </a>
        </div>
      `);
    }

    const newApiKey = uuidv4();
    const insertSql = 'INSERT INTO apikeys (user_id, api_key) VALUES (?, ?)';
    db.query(insertSql, [userId, newApiKey], (err, result) => {
      if (err) {
        console.error('Error inserting API key:', err);
        return res.send('<div style="text-align: center; color: #e74c3c;">Error generating API key.</div>');
      }
      res.send(`
        <div style="text-align: center; padding: 20px;">
          New API key is: <strong style="color: #2c3e50;">${newApiKey}</strong>
          <br><br>
          <a href="/country-details" 
            style="display: inline-block; padding: 10px 20px; background-color: #3498db; color: white; text-decoration: none; border-radius: 4px; transition: background-color 0.3s;">
            Let's Get Country Details
          </a>
        </div>
      `);
    });
  });
});

// Serve the Country Details Page (HTML with form)
app.get('/country-details', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'country-details.html'));
});

// Route to get country details from restcountries API
app.get('/country-details/:countryName', async (req, res) => {
  const countryName = req.params.countryName;
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return res.status(401).send('<div style="text-align: center; color: #e74c3c;">API key is required.</div>');
  }

  const checkApiKeyQuery = 'SELECT * FROM apikeys WHERE api_key = ?';
  db.query(checkApiKeyQuery, [apiKey], async (err, result) => {
    if (err) {
      console.error('Error querying the API key:', err);
      return res.status(500).send('<div style="text-align: center; color: #e74c3c;">Server error.</div>');
    }

    if (result.length === 0) {
      return res.status(403).send('<div style="text-align: center; color: #e74c3c;">Invalid API key.</div>');
    }

    try {
      const response = await axios.get(`https://restcountries.com/v3.1/name/${countryName}`);
      const country = response.data[0];
      const countryDetails = {
        name: country.name.common,
        capital: country.capital ? country.capital[0] : 'N/A',
        population: country.population,
        area: country.area,
        region: country.region,
        subregion: country.subregion,
        flag: country.flags[0]
      };

      res.json(countryDetails);
    } catch (error) {
      console.error('Error fetching country details:', error);
      res.status(500).send('<div style="text-align: center; color: #e74c3c;">Error fetching country details.</div>');
    }
  });
});

// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
