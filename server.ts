import express from 'express';
import { sql } from '@vercel/postgres';
import { GoogleGenAI } from '@google/genai';

const app = express();
app.use(express.json());

// 数据库懒初始化，避免冷启动竞争条件
let dbReady: Promise<void> | null = null;
function ensureDbReady() {
  if (!dbReady) {
    dbReady = initDb();
  }
  return dbReady;
}
app.use((req, res, next) => {
  ensureDbReady().then(() => next()).catch(next);
});

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
      CREATE TABLE IF NOT EXISTS tournament_teams (
        tournament_id INTEGER,
        team_id INTEGER,
        PRIMARY KEY (tournament_id, team_id),
        FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
        FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
      );
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS tournament_stages (
        id SERIAL PRIMARY KEY,
        tournament_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        format TEXT NOT NULL,
        FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE
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
        report TEXT,
        raw_report TEXT,
        FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
        FOREIGN KEY (team1_id) REFERENCES teams(id) ON DELETE CASCADE,
        FOREIGN KEY (team2_id) REFERENCES teams(id) ON DELETE CASCADE
      );
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      );
    `;
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
  }
}

// Generic AI Generation Function
async function generateAIContent(prompt: string) {
  try {
    const { rows: apiKeyRows } = await sql`SELECT value FROM settings WHERE key = 'ai_api_key'`;
    const { rows: apiUrlRows } = await sql`SELECT value FROM settings WHERE key = 'ai_api_url'`;
    const { rows: aiModelRows } = await sql`SELECT value FROM settings WHERE key = 'ai_model'`;

    const apiKey = apiKeyRows[0]?.value;
    const apiUrl = apiUrlRows[0]?.value;
    const aiModel = aiModelRows[0]?.value;

    if (apiUrl && apiKey && aiModel) {
      // Use OpenAI compatible API
      let endpoint = apiUrl.replace(/\/+$/, '');
      if (!endpoint.endsWith('/chat/completions')) {
        endpoint += '/chat/completions';
      }
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: aiModel,
          messages: [{ role: 'user', content: prompt }]
        })
      });
      if (!response.ok) {
        const err = await response.text();
        throw new Error(`API Error: ${response.status} ${err}`);
      }
      const data = await response.json();
      return data.choices?.[0]?.message?.content || '';
    } else if (process.env.GEMINI_API_KEY) {
      // Fallback to Gemini SDK
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
      });
      return response.text;
    } else {
      throw new Error('AI API Key not configured');
    }
  } catch (e) {
    console.error("AI Generation Error:", e);
    throw e;
  }
}

// Settings Endpoints
app.get('/api/settings/ai', async (req, res) => {
  try {
    const { rows: apiKeyRows } = await sql`SELECT value FROM settings WHERE key = 'ai_api_key'`;
    const { rows: apiUrlRows } = await sql`SELECT value FROM settings WHERE key = 'ai_api_url'`;
    const { rows: aiModelRows } = await sql`SELECT value FROM settings WHERE key = 'ai_model'`;
    
    res.json({ 
      apiKey: apiKeyRows[0]?.value || '',
      apiUrl: apiUrlRows[0]?.value || '',
      aiModel: aiModelRows[0]?.value || ''
    });
  } catch (e) {
    res.json({ apiKey: '', apiUrl: '', aiModel: '' });
  }
});

app.post('/api/settings/ai', async (req, res) => {
  try {
    const { apiKey, apiUrl, aiModel } = req.body;
    await sql`INSERT INTO settings (key, value) VALUES ('ai_api_key', ${apiKey || ''}) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`;
    await sql`INSERT INTO settings (key, value) VALUES ('ai_api_url', ${apiUrl || ''}) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`;
    await sql`INSERT INTO settings (key, value) VALUES ('ai_model', ${aiModel || ''}) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`;
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to save AI settings' });
  }
});

// AI Endpoints
app.post('/api/ai/summarize', async (req, res) => {
  try {
    const { rawDetails } = req.body;
    const prompt = `请将以下电竞比赛的详细记录总结成一份精炼的中文战报（包含关键转折点、高光时刻和最终结果）：\n\n${rawDetails}`;
    const summary = await generateAIContent(prompt);
    res.json({ summary });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message || 'AI 总结失败' });
  }
});

app.post('/api/ai/predict', async (req, res) => {
  try {
    const { team1Name, team2Name, history } = req.body;
    const prompt = `请根据以下两支队伍（${team1Name} vs ${team2Name}）的历史交锋记录和近期战绩，生成一份专业的中文赛前预测报告（包含胜率预测、关键对局分析和战术侧重点）：\n\n历史数据：\n${JSON.stringify(history)}`;
    const prediction = await generateAIContent(prompt);
    res.json({ prediction });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message || 'AI 预测失败' });
  }
});

// Tournaments
app.get('/api/tournaments', async (req, res) => {
  try {
    const { rows: tournaments } = await sql`SELECT * FROM tournaments ORDER BY start_date DESC`;
    const { rows: stages } = await sql`SELECT * FROM tournament_stages`;
    
    const tournamentsWithStages = tournaments.map((t: any) => ({
      ...t,
      stages: stages.filter((s: any) => s.tournament_id === t.id)
    }));
    
    res.json(tournamentsWithStages);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/tournaments/:id', async (req, res) => {
  try {
    const { rows: tournamentRows } = await sql`SELECT * FROM tournaments WHERE id = ${req.params.id}`;
    if (tournamentRows.length === 0) return res.status(404).json({ error: 'Tournament not found' });
    
    const { rows: teams } = await sql`
      SELECT t.* FROM teams t
      JOIN tournament_teams tt ON t.id = tt.team_id
      WHERE tt.tournament_id = ${req.params.id}
    `;

    const { rows: matches } = await sql`
      SELECT m.*, t1.name as team1_name, t1.logo_url as team1_logo, t2.name as team2_name, t2.logo_url as team2_logo
      FROM matches m
      LEFT JOIN teams t1 ON m.team1_id = t1.id
      LEFT JOIN teams t2 ON m.team2_id = t2.id
      WHERE m.tournament_id = ${req.params.id}
      ORDER BY m.stage, m.round, m.match_date
    `;

    const { rows: stages } = await sql`SELECT * FROM tournament_stages WHERE tournament_id = ${req.params.id}`;

    res.json({ ...tournamentRows[0], teams, matches, stages });
  } catch (error: any) {
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
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/tournaments/:id', async (req, res) => {
  const { name, game, start_date, end_date, prize_pool, status, description, format } = req.body;
  try {
    await sql`
      UPDATE tournaments SET name = ${name}, game = ${game}, start_date = ${start_date}, end_date = ${end_date}, prize_pool = ${prize_pool}, status = ${status}, description = ${description}, format = ${format} WHERE id = ${req.params.id}
    `;
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Tournament Stages
app.get('/api/tournaments/:id/stages', async (req, res) => {
  try {
    const { rows: stages } = await sql`SELECT * FROM tournament_stages WHERE tournament_id = ${req.params.id}`;
    res.json(stages);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/tournaments/:id/stages', async (req, res) => {
  const { name, format } = req.body;
  try {
    const result = await sql`
      INSERT INTO tournament_stages (tournament_id, name, format) VALUES (${req.params.id}, ${name}, ${format}) RETURNING id
    `;
    res.json({ id: result.rows[0].id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Teams
app.get('/api/teams', async (req, res) => {
  try {
    const { rows } = await sql`SELECT * FROM teams ORDER BY name ASC`;
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/teams/:id', async (req, res) => {
  try {
    const { rows: teamRows } = await sql`SELECT * FROM teams WHERE id = ${req.params.id}`;
    if (teamRows.length === 0) return res.status(404).json({ error: 'Team not found' });

    const { rows: tournaments } = await sql`
      SELECT t.* FROM tournaments t
      JOIN tournament_teams tt ON t.id = tt.tournament_id
      WHERE tt.team_id = ${req.params.id}
    `;

    const { rows: matches } = await sql`
      SELECT m.*, t1.name as team1_name, t1.logo_url as team1_logo, t2.name as team2_name, t2.logo_url as team2_logo, tr.name as tournament_name
      FROM matches m
      LEFT JOIN teams t1 ON m.team1_id = t1.id
      LEFT JOIN teams t2 ON m.team2_id = t2.id
      JOIN tournaments tr ON m.tournament_id = tr.id
      WHERE m.team1_id = ${req.params.id} OR m.team2_id = ${req.params.id}
      ORDER BY m.match_date DESC
    `;

    res.json({ ...teamRows[0], tournaments, matches });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/teams', async (req, res) => {
  const { name, logo_url, region, description, reference_links, historical_records } = req.body;
  try {
    const result = await sql`
      INSERT INTO teams (name, logo_url, region, description, reference_links, historical_records) VALUES (${name}, ${logo_url}, ${region}, ${description}, ${reference_links}, ${historical_records}) RETURNING id
    `;
    res.json({ id: result.rows[0].id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/teams/:id', async (req, res) => {
  const { name, logo_url, region, description, reference_links, historical_records } = req.body;
  try {
    await sql`
      UPDATE teams SET name = ${name}, logo_url = ${logo_url}, region = ${region}, description = ${description}, reference_links = ${reference_links}, historical_records = ${historical_records} WHERE id = ${req.params.id}
    `;
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Matches
app.get('/api/matches/compare/:team1/:team2', async (req, res) => {
  const { team1, team2 } = req.params;
  try {
    const { rows: matches } = await sql`
      SELECT m.*, t1.name as team1_name, t1.logo_url as team1_logo, t2.name as team2_name, t2.logo_url as team2_logo, tr.name as tournament_name
      FROM matches m
      LEFT JOIN teams t1 ON m.team1_id = t1.id
      LEFT JOIN teams t2 ON m.team2_id = t2.id
      JOIN tournaments tr ON m.tournament_id = tr.id
      WHERE (m.team1_id = ${team1} AND m.team2_id = ${team2}) OR (m.team1_id = ${team2} AND m.team2_id = ${team1})
      ORDER BY m.match_date DESC
    `;
    res.json(matches);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/matches', async (req, res) => {
  const { tournament_id, stage, round, team1_id, team2_id, team1_score, team2_score, status, match_date, report, raw_report } = req.body;
  try {
    const result = await sql`
      INSERT INTO matches (tournament_id, stage, round, team1_id, team2_id, team1_score, team2_score, status, match_date, report, raw_report) VALUES (${tournament_id}, ${stage}, ${round}, ${team1_id}, ${team2_id}, ${team1_score}, ${team2_score}, ${status}, ${match_date}, ${report}, ${raw_report}) RETURNING id
    `;
    res.json({ id: result.rows[0].id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/matches/:id', async (req, res) => {
  const { stage, round, team1_id, team2_id, team1_score, team2_score, status, match_date, report, raw_report } = req.body;
  try {
    await sql`
      UPDATE matches SET stage = ${stage}, round = ${round}, team1_id = ${team1_id}, team2_id = ${team2_id}, team1_score = ${team1_score}, team2_score = ${team2_score}, status = ${status}, match_date = ${match_date}, report = ${report}, raw_report = ${raw_report} WHERE id = ${req.params.id}
    `;
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Tournament Teams
app.post('/api/tournaments/:id/teams', async (req, res) => {
  const { team_id } = req.body;
  try {
    await sql`INSERT INTO tournament_teams (tournament_id, team_id) VALUES (${req.params.id}, ${team_id})`;
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: 'Team already added or invalid' });
  }
});

app.delete('/api/tournaments/:id/teams/:teamId', async (req, res) => {
  try {
    await sql`DELETE FROM tournament_teams WHERE tournament_id = ${req.params.id} AND team_id = ${req.params.teamId}`;
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

async function startServer() {
  // 只有在本地开发（非 Vercel）时才启动 Vite 或监听端口
  if (!process.env.VERCEL) {
    if (process.env.NODE_ENV !== 'production') {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'custom'
      });
      app.use(vite.middlewares);
    } else {
      app.use(express.static('dist'));
    }

    const port = process.env.PORT || 3000;
    app.listen(port, () => console.log(`Local server running on http://localhost:${port}`));
  }
}

// 执行启动逻辑
await startServer();

// 必须导出 app，Vercel 才能调用它作为 Serverless Function
export default app;
