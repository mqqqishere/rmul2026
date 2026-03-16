import express from 'express';
import { createServer as createViteServer } from 'vite';
import { sql } from '@vercel/postgres';
import path from 'path';
import { GoogleGenAI } from '@google/genai';

const app = express();
app.use(express.json());

// 初始化数据库表（异步 Postgres 语法）
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

// 获取赛事列表
app.get('/api/tournaments', async (req, res) => {
  try {
    const { rows } = await sql`SELECT * FROM tournaments ORDER BY id DESC`;
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 创建赛事
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

// 获取所有战队
app.get('/api/teams', async (req, res) => {
  try {
    const { rows } = await sql`SELECT * FROM teams ORDER BY name ASC`;
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

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

  // 重要：只有在非 Vercel 环境下才手动监听端口
  if (!process.env.VERCEL) {
    const port = process.env.PORT || 3000;
    app.listen(port, () => console.log(`Server running on http://localhost:${port}`));
  }
}

startServer();

// 重要：必须导出 app 供 Vercel 调用
export default app;