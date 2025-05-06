const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const port = 4000;

app.use(cors());
app.use(bodyParser.json());

// Initialize SQLite database
const dbPath = path.resolve(__dirname, 'votes.db');
let db;
try {
  db = new Database(dbPath);
  console.log('Connected to SQLite database.');
} catch (err) {
  console.error('Error opening database', err.message);
}

// Create votes table if not exists
db.prepare(`CREATE TABLE IF NOT EXISTS votes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  candidateId INTEGER,
  region TEXT,
  ageGroup TEXT,
  gender TEXT,
  timestamp INTEGER,
  ip TEXT UNIQUE
)`).run();

// Get all votes
app.get('/votes', (req, res) => {
  try {
    const rows = db.prepare('SELECT candidateId, region, ageGroup, gender, timestamp FROM votes').all();
    res.json(rows);
  } catch (err) {
    console.error('Error fetching votes:', err.message);
    res.status(500).json({ error: 'Failed to fetch votes' });
  }
});

// Add a new vote
app.post('/votes', (req, res) => {
  const vote = req.body;
  if (!vote || typeof vote !== 'object') {
    return res.status(400).json({ error: 'Invalid vote data' });
  }
  const ip = req.ip || req.connection.remoteAddress;
  console.log('Received vote:', vote, 'from IP:', ip);

  try {
    const stmt = db.prepare(`INSERT INTO votes (candidateId, region, ageGroup, gender, timestamp, ip)
                             VALUES (?, ?, ?, ?, ?, ?)`);
    stmt.run(vote.candidateId, vote.region, vote.ageGroup, vote.gender, Date.now(), ip);
    res.status(201).json({ message: 'Vote added' });
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      return res.status(403).json({ error: 'ten Adres IP już wziął udział w głosowaniu' });
    }
    console.error('Error adding vote:', err.message);
    res.status(500).json({ error: 'Failed to add vote' });
  }
});

app.listen(port, () => {
  console.log(`Backend server running on http://localhost:${port}`);
});
