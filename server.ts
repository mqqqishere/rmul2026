import express from 'express';
import { createServer as createViteServer } from 'vite';
import Database from 'better-sqlite3';
import path from 'path';
import { GoogleGenAI } from '@google/genai';

const db = new Database('esports.db');

// Initialize database schema
db.exec(`
  CREATE TABLE IF NOT EXISTS tournaments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    game TEXT NOT NULL,
    start_date TEXT,
    end_date TEXT,
    prize_pool TEXT,
    status TEXT DEFAULT 'Upcoming',
    description TEXT,
    format TEXT
  );

  CREATE TABLE IF NOT EXISTS teams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    logo_url TEXT,
    region TEXT,
    description TEXT,
    reference_links TEXT,
    historical_records TEXT
  );

  CREATE TABLE IF NOT EXISTS tournament_teams (
    tournament_id INTEGER,
    team_id INTEGER,
    PRIMARY KEY (tournament_id, team_id),
    FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS tournament_stages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tournament_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    format TEXT NOT NULL,
    FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS matches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
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
    FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
    FOREIGN KEY (team1_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY (team2_id) REFERENCES teams(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

// Add historical_records column if it doesn't exist
try {
  db.exec('ALTER TABLE teams ADD COLUMN historical_records TEXT;');
} catch (e) {
  // Column might already exist
}

// Insert some seed data if empty
const countTournaments = db.prepare('SELECT COUNT(*) as count FROM tournaments').get() as { count: number };
if (countTournaments.count === 0) {
  const insertTournament = db.prepare('INSERT INTO tournaments (name, game, start_date, end_date, prize_pool, status, description, format) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  const t1 = insertTournament.run('Global Championship 2026', 'CS2', '2026-05-01', '2026-05-15', '$1,000,000', 'Upcoming', 'The biggest CS2 tournament of the year.', 'Swiss Stage into Single Elimination Playoffs');
  const t2 = insertTournament.run('Spring Invitational', 'Valorant', '2026-04-10', '2026-04-20', '$250,000', 'Ongoing', 'Top teams from around the world compete.', 'Round Robin Groups into Double Elimination');

  const insertTeam = db.prepare('INSERT INTO teams (name, logo_url, region, description) VALUES (?, ?, ?, ?)');
  const team1 = insertTeam.run('Team Alpha', 'https://picsum.photos/seed/alpha/100/100', 'Europe', 'A top-tier European team.');
  const team2 = insertTeam.run('Team Beta', 'https://picsum.photos/seed/beta/100/100', 'North America', 'NA powerhouse.');
  const team3 = insertTeam.run('Team Gamma', 'https://picsum.photos/seed/gamma/100/100', 'Asia', 'Rising stars from Asia.');
  const team4 = insertTeam.run('Team Delta', 'https://picsum.photos/seed/delta/100/100', 'South America', 'SA champions.');

  const insertTournamentTeam = db.prepare('INSERT INTO tournament_teams (tournament_id, team_id) VALUES (?, ?)');
  insertTournamentTeam.run(t1.lastInsertRowid, team1.lastInsertRowid);
  insertTournamentTeam.run(t1.lastInsertRowid, team2.lastInsertRowid);
  insertTournamentTeam.run(t1.lastInsertRowid, team3.lastInsertRowid);
  insertTournamentTeam.run(t1.lastInsertRowid, team4.lastInsertRowid);

  const insertStage = db.prepare('INSERT INTO tournament_stages (tournament_id, name, format) VALUES (?, ?, ?)');
  insertStage.run(t1.lastInsertRowid, 'Swiss', 'Swiss');
  insertStage.run(t1.lastInsertRowid, 'Playoffs', 'Single Elimination');

  const insertMatch = db.prepare('INSERT INTO matches (tournament_id, stage, round, team1_id, team2_id, team1_score, team2_score, status, match_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
  insertMatch.run(t1.lastInsertRowid, 'Swiss', 1, team1.lastInsertRowid, team2.lastInsertRowid, 0, 0, 'Scheduled', '2026-05-01T15:00:00Z');
  insertMatch.run(t1.lastInsertRowid, 'Swiss', 1, team3.lastInsertRowid, team4.lastInsertRowid, 0, 0, 'Scheduled', '2026-05-01T18:00:00Z');
}

try {
  db.exec('ALTER TABLE teams ADD COLUMN reference_links TEXT;');
} catch (e) {
  // Column might already exist
}

try {
  db.exec('ALTER TABLE matches ADD COLUMN raw_report TEXT;');
} catch (e) {
  // Column might already exist
}

try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS tournament_stages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tournament_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      format TEXT NOT NULL,
      FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE
    );
  `);
} catch (e) {}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Generic AI Generation Function
  async function generateAIContent(prompt: string) {
    try {
      const apiKeySetting = db.prepare("SELECT value FROM settings WHERE key = 'ai_api_key'").get() as { value: string } | undefined;
      const apiUrlSetting = db.prepare("SELECT value FROM settings WHERE key = 'ai_api_url'").get() as { value: string } | undefined;
      const aiModelSetting = db.prepare("SELECT value FROM settings WHERE key = 'ai_model'").get() as { value: string } | undefined;

      const apiKey = apiKeySetting?.value;
      const apiUrl = apiUrlSetting?.value;
      const aiModel = aiModelSetting?.value;

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
          model: "gemini-3.1-pro-preview",
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

  // API Routes
  
  // Settings Endpoints
  app.get('/api/settings/ai', (req, res) => {
    try {
      const apiKey = db.prepare("SELECT value FROM settings WHERE key = 'ai_api_key'").get() as { value: string } | undefined;
      const apiUrl = db.prepare("SELECT value FROM settings WHERE key = 'ai_api_url'").get() as { value: string } | undefined;
      const aiModel = db.prepare("SELECT value FROM settings WHERE key = 'ai_model'").get() as { value: string } | undefined;
      
      res.json({ 
        apiKey: apiKey?.value || '',
        apiUrl: apiUrl?.value || '',
        aiModel: aiModel?.value || ''
      });
    } catch (e) {
      res.json({ apiKey: '', apiUrl: '', aiModel: '' });
    }
  });

  app.post('/api/settings/ai', (req, res) => {
    try {
      const { apiKey, apiUrl, aiModel } = req.body;
      const stmt = db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)");
      stmt.run('ai_api_key', apiKey || '');
      stmt.run('ai_api_url', apiUrl || '');
      stmt.run('ai_model', aiModel || '');
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
  app.get('/api/tournaments', (req, res) => {
    const tournaments = db.prepare('SELECT * FROM tournaments ORDER BY start_date DESC').all();
    const stages = db.prepare('SELECT * FROM tournament_stages').all();
    
    const tournamentsWithStages = tournaments.map((t: any) => ({
      ...t,
      stages: stages.filter((s: any) => s.tournament_id === t.id)
    }));
    
    res.json(tournamentsWithStages);
  });

  app.get('/api/tournaments/:id', (req, res) => {
    const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
    if (!tournament) return res.status(404).json({ error: 'Tournament not found' });
    
    const teams = db.prepare(`
      SELECT t.* FROM teams t
      JOIN tournament_teams tt ON t.id = tt.team_id
      WHERE tt.tournament_id = ?
    `).all(req.params.id);

    const matches = db.prepare(`
      SELECT m.*, t1.name as team1_name, t1.logo_url as team1_logo, t2.name as team2_name, t2.logo_url as team2_logo
      FROM matches m
      LEFT JOIN teams t1 ON m.team1_id = t1.id
      LEFT JOIN teams t2 ON m.team2_id = t2.id
      WHERE m.tournament_id = ?
      ORDER BY m.stage, m.round, m.match_date
    `).all(req.params.id);

    const stages = db.prepare('SELECT * FROM tournament_stages WHERE tournament_id = ?').all(req.params.id);

    res.json({ ...tournament, teams, matches, stages });
  });

  app.post('/api/tournaments', (req, res) => {
    const { name, game, start_date, end_date, prize_pool, status, description, format } = req.body;
    const stmt = db.prepare('INSERT INTO tournaments (name, game, start_date, end_date, prize_pool, status, description, format) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    const info = stmt.run(name, game, start_date, end_date, prize_pool, status, description, format);
    res.json({ id: info.lastInsertRowid });
  });

  app.put('/api/tournaments/:id', (req, res) => {
    const { name, game, start_date, end_date, prize_pool, status, description, format } = req.body;
    const stmt = db.prepare('UPDATE tournaments SET name = ?, game = ?, start_date = ?, end_date = ?, prize_pool = ?, status = ?, description = ?, format = ? WHERE id = ?');
    stmt.run(name, game, start_date, end_date, prize_pool, status, description, format, req.params.id);
    res.json({ success: true });
  });

  // Tournament Stages
  app.get('/api/tournaments/:id/stages', (req, res) => {
    const stages = db.prepare('SELECT * FROM tournament_stages WHERE tournament_id = ?').all(req.params.id);
    res.json(stages);
  });

  app.post('/api/tournaments/:id/stages', (req, res) => {
    const { name, format } = req.body;
    const stmt = db.prepare('INSERT INTO tournament_stages (tournament_id, name, format) VALUES (?, ?, ?)');
    const info = stmt.run(req.params.id, name, format);
    res.json({ id: info.lastInsertRowid });
  });

  // Teams
  app.get('/api/teams', (req, res) => {
    const teams = db.prepare('SELECT * FROM teams ORDER BY name').all();
    res.json(teams);
  });

  app.get('/api/teams/:id', (req, res) => {
    const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(req.params.id);
    if (!team) return res.status(404).json({ error: 'Team not found' });

    const tournaments = db.prepare(`
      SELECT t.* FROM tournaments t
      JOIN tournament_teams tt ON t.id = tt.tournament_id
      WHERE tt.team_id = ?
    `).all(req.params.id);

    const matches = db.prepare(`
      SELECT m.*, t1.name as team1_name, t1.logo_url as team1_logo, t2.name as team2_name, t2.logo_url as team2_logo, tr.name as tournament_name
      FROM matches m
      LEFT JOIN teams t1 ON m.team1_id = t1.id
      LEFT JOIN teams t2 ON m.team2_id = t2.id
      JOIN tournaments tr ON m.tournament_id = tr.id
      WHERE m.team1_id = ? OR m.team2_id = ?
      ORDER BY m.match_date DESC
    `).all(req.params.id, req.params.id);

    res.json({ ...team, tournaments, matches });
  });

  app.post('/api/teams', (req, res) => {
    const { name, logo_url, region, description, reference_links, historical_records } = req.body;
    const stmt = db.prepare('INSERT INTO teams (name, logo_url, region, description, reference_links, historical_records) VALUES (?, ?, ?, ?, ?, ?)');
    const info = stmt.run(name, logo_url, region, description, reference_links, historical_records);
    res.json({ id: info.lastInsertRowid });
  });

  app.put('/api/teams/:id', (req, res) => {
    const { name, logo_url, region, description, reference_links, historical_records } = req.body;
    const stmt = db.prepare('UPDATE teams SET name = ?, logo_url = ?, region = ?, description = ?, reference_links = ?, historical_records = ? WHERE id = ?');
    stmt.run(name, logo_url, region, description, reference_links, historical_records, req.params.id);
    res.json({ success: true });
  });

  // Matches
  app.get('/api/matches/compare/:team1/:team2', (req, res) => {
    const { team1, team2 } = req.params;
    const matches = db.prepare(`
      SELECT m.*, t1.name as team1_name, t1.logo_url as team1_logo, t2.name as team2_name, t2.logo_url as team2_logo, tr.name as tournament_name
      FROM matches m
      LEFT JOIN teams t1 ON m.team1_id = t1.id
      LEFT JOIN teams t2 ON m.team2_id = t2.id
      JOIN tournaments tr ON m.tournament_id = tr.id
      WHERE (m.team1_id = ? AND m.team2_id = ?) OR (m.team1_id = ? AND m.team2_id = ?)
      ORDER BY m.match_date DESC
    `).all(team1, team2, team2, team1);
    res.json(matches);
  });

  app.post('/api/matches', (req, res) => {
    const { tournament_id, stage, round, team1_id, team2_id, team1_score, team2_score, status, match_date, report, raw_report } = req.body;
    const stmt = db.prepare('INSERT INTO matches (tournament_id, stage, round, team1_id, team2_id, team1_score, team2_score, status, match_date, report, raw_report) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    const info = stmt.run(tournament_id, stage, round, team1_id, team2_id, team1_score, team2_score, status, match_date, report, raw_report);
    res.json({ id: info.lastInsertRowid });
  });

  app.put('/api/matches/:id', (req, res) => {
    const { stage, round, team1_id, team2_id, team1_score, team2_score, status, match_date, report, raw_report } = req.body;
    const stmt = db.prepare('UPDATE matches SET stage = ?, round = ?, team1_id = ?, team2_id = ?, team1_score = ?, team2_score = ?, status = ?, match_date = ?, report = ?, raw_report = ? WHERE id = ?');
    stmt.run(stage, round, team1_id, team2_id, team1_score, team2_score, status, match_date, report, raw_report, req.params.id);
    res.json({ success: true });
  });

  // Tournament Teams
  app.post('/api/tournaments/:id/teams', (req, res) => {
    const { team_id } = req.body;
    try {
      db.prepare('INSERT INTO tournament_teams (tournament_id, team_id) VALUES (?, ?)').run(req.params.id, team_id);
      res.json({ success: true });
    } catch (e) {
      res.status(400).json({ error: 'Team already added or invalid' });
    }
  });

  app.delete('/api/tournaments/:id/teams/:teamId', (req, res) => {
    db.prepare('DELETE FROM tournament_teams WHERE tournament_id = ? AND team_id = ?').run(req.params.id, req.params.teamId);
    res.json({ success: true });
  });


  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
