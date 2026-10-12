const { Pool } = require('pg');

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432', 10),
  user:     process.env.DB_USER     || 'shortener',
  password: process.env.DB_PASSWORD || 'shortener',
  database: process.env.DB_NAME     || 'shortener',
});

module.exports = pool;