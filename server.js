require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 6120;

app.use(cors());
app.use(express.json());

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'osteo',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// API Route to fetch all data
app.get('/api/getalldata', async (req, res) => {
  try {
    const [results] = await pool.query('SELECT * FROM leap_certificate_details');
    res.json({ success: true, data: results });
  } catch (error) {
    console.error("Database Query Error:", error);
    res.status(500).json({ success: false, message: "Database query failed", error });
  }
});

(async () => {
  try {
    const connection = await pool.getConnection();
    console.log('Connected to MySQL database');
    connection.release();
  } catch (error) {
    console.error('Database connection failed:', error.message);
  }
})();

app.get('/api/data-summary', async (req, res) => {
  try {
    const queries = [
      "SELECT COUNT(*) AS total_count FROM leap_certificate_details",
      `SELECT rm_name, COUNT(rm_name) AS rm_count 
       FROM leap_certificate_details 
       GROUP BY rm_name 
       ORDER BY rm_count DESC 
       LIMIT 5`,
      `SELECT mr_name, COUNT(mr_name) AS mr_count 
       FROM leap_certificate_details 
       WHERE date >= NOW() - INTERVAL 7 DAY 
       GROUP BY mr_name 
       ORDER BY mr_count DESC 
       LIMIT 5`,
      `SELECT mr_name, COUNT(mr_name) AS mr_count 
       FROM leap_certificate_details 
       WHERE DATE(date) = CURDATE() 
       GROUP BY mr_name 
       ORDER BY mr_count DESC 
       LIMIT 5`
    ];

    const [totalCount, topRMs, topMRs, todayMRs] = await Promise.all(
      queries.map(query => pool.query(query))
    );

    res.json({
      success: true,
      total_count: totalCount[0][0].total_count,
      top_rms: topRMs[0],
      top_mrs: topMRs[0],
      today_mrs: todayMRs[0]
    });

  } catch (error) {
    console.error("Database Query Error:", error);
    res.status(500).json({ success: false, message: "Database query failed", error });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
