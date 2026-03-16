import express from 'express';
import { createServer as createViteServer } from 'vite';
import { sql } from '@vercel/postgres';
import path from 'path';
import { GoogleGenAI } from '@google/genai';

const app = express();
app.use(express.json());

// 初始化数据库表（异步）
async function initDb() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS tournaments (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        game TEXT NOT NULL,
        start_date TEXT,
        end_date TEXT,
        prize_pool TEXT,
        status TEXT DEFAULT 'Upcoming',
        description TEXT,
        format TEXT
      );
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS teams (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        logo_url TEXT,
        region TEXT,
        description TEXT,
        reference_links TEXT,
        historical_records TEXT
      );
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS tournament_teams (
        tournament_id INTEGER,
        team_id INTEGER,
        PRIMARY KEY (tournament_id, team_id)
      );
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS matches (
        id SERIAL PRIMARY KEY,
        tournament_id INTEGER,
        stage TEXT,
        round INTEGER,
        team1_id INTEGER,
        team2_id INTEGER,
        team1_score INTEGER DEFAULT 0,
        team2_score INTEGER DEFAULT 0,
        status TEXT DEFAULT 'Scheduled',
        match_date TEXT,
        report TEXT
      );
    `;
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
  }
}

// 修改 API 路由为异步处理
app.get('/api/tournaments', async (req, res) => {
  try {
    const { rows } = await sql`SELECT * FROM tournaments ORDER BY id DESC`;
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/tournaments', async (req, res) => {
  const { name, game, start_date, end_date, prize_pool, status, description, format } = req.body;
  try {
    const result = await sql`
      INSERT INTO tournaments (name, game, start_date, end_date, prize_pool, status, description, format)
      VALUES (${name}, ${game}, ${start_date}, ${end_date}, ${prize_pool}, ${status}, ${description}, ${format})
      RETURNING id
    `;
    res.json({ id: result.rows[0].id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取特定赛事详情
app.get('/api/tournaments/:id', async (req, res) => {
  try {
    const { rows } = await sql`SELECT * FROM tournaments WHERE id = ${req.params.id}`;
    if (rows.length === 0) return res.status(404).send('Not found');
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ... 其他 API (teams, matches) 也要按照这个模式 async/await 改写 ...

async function startServer() {
  await initDb();
  
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
  }

  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`Server running on http://localhost:${port}`));
}

startServer();