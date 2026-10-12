const express = require('express');
const pool = require('./db');

const app = express();
app.use(express.json());
app.use(express.static('public'));

const PORT = process.env.PORT || 3000;
const STATS_SERVICE_URL = process.env.STATS_SERVICE_URL || 'http://localhost:3001';

const ALPHABET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

function generateCode(length = 6) {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return code;
}

function isValidUrl(str) {
  try {
    const u = new URL(str);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/shorten', async (req, res) => {
  const { url } = req.body;

  if (!url || !isValidUrl(url)) {
    return res.status(400).json({ error: 'Invalid or missing URL' });
  }

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateCode();
    try {
      await pool.query(
        'INSERT INTO urls (code, original_url) VALUES ($1, $2)',
        [code, url]
      );
      return res.status(201).json({
        code,
        shortUrl: `/r/${code}`,
        originalUrl: url,
      });
    } catch (err) {
      if (err.code === '23505') continue;
      console.error(err);
      return res.status(500).json({ error: 'Database error' });
    }
  }
  return res.status(500).json({ error: 'Could not generate unique code' });
});

app.get('/search', async (req, res) => {
  const q = req.query.q;
  if (!q || q.trim() === '') {
    return res.status(400).json({ error: 'Missing query parameter q' });
  }

  try {
    const result = await pool.query(
      `SELECT code, original_url, created_at
       FROM urls
       WHERE original_url ILIKE $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [`%${q}%`]
    );
    return res.json(result.rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Database error' });
  }
});

app.put('/urls/:code', async (req, res) => {
  const { code } = req.params;
  const { url } = req.body;

  if (!url || !isValidUrl(url)) {
    return res.status(400).json({ error: 'Invalid or missing URL' });
  }

  try {
    const result = await pool.query(
      'UPDATE urls SET original_url = $1 WHERE code = $2 RETURNING code, original_url',
      [url, code]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Code not found' });
    }

    return res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Database error' });
  }
});

app.delete('/urls/:code', async (req, res) => {
  const { code } = req.params;

  try {
    const result = await pool.query(
      'DELETE FROM urls WHERE code = $1 RETURNING code',
      [code]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Code not found' });
    }

    // Tell stats-service to delete its click history for this code.
    // Fire-and-forget: if stats-service is down, the URL is still deleted.
    fetch(`${STATS_SERVICE_URL}/clicks/${code}`, {
      method: 'DELETE',
    }).catch(err => console.error('stats-service delete failed:', err.message));

    return res.json({ deleted: code });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Database error' });
  }
});

app.get('/r/:code', async (req, res) => {
  const { code } = req.params;

  try {
    const result = await pool.query(
      'SELECT original_url FROM urls WHERE code = $1',
      [code]
    );

    if (result.rowCount === 0) {
      return res.status(404).send('Short link not found');
    }

    const { original_url } = result.rows[0];

    // Fire-and-forget call to stats-service. It doesn't exist yet, so this
    // will fail in the background — but the redirect still works.
    fetch(`${STATS_SERVICE_URL}/clicks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    }).catch(err => console.error('stats-service call failed:', err.message));

    return res.redirect(302, original_url);
  } catch (err) {
    console.error(err);
    return res.status(500).send('Server error');
  }
});

app.listen(PORT, () => {
  console.log(`shortener-service listening on port ${PORT}`);
});