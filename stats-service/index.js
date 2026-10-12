const express = require('express');
const pool = require('./db');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3001;

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/clicks', async (req, res) => {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ error: 'Missing code' });
  }

  try {
    await pool.query(
      'INSERT INTO clicks (code) VALUES ($1)',
      [code]
    );
    return res.status(201).json({ recorded: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Database error' });
  }
});

app.get('/stats/:code', async (req, res) => {
  const { code } = req.params;

  try {
    const result = await pool.query(
      `SELECT COUNT(*)::int AS clicks, MAX(clicked_at) AS last_click
       FROM clicks
       WHERE code = $1`,
      [code]
    );

    const { clicks, last_click } = result.rows[0];
    return res.json({ code, clicks, lastClick: last_click });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Database error' });
  }
});

app.delete('/clicks/:code', async (req, res) => {
  const { code } = req.params;

  try {
    const result = await pool.query(
      'DELETE FROM clicks WHERE code = $1',
      [code]
    );
    return res.json({ deleted: result.rowCount });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Database error' });
  }
});

app.listen(PORT, () => {
  console.log(`stats-service listening on port ${PORT}`);
});