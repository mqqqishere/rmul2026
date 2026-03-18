import React, { useState, useEffect, FormEvent, useRef } from 'react';
import { Tournament, Team, TournamentStage, Match } from '../types';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { zhCN } from 'date-fns/locale';

export default function Admin() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  
  // Forms state
  const [newTournament, setNewTournament] = useState({ name: '', game: '', start_date: new Date(), end_date: new Date(), prize_pool: '', status: 'Upcoming', description: '', format: 'Swiss' });
  const [newTeam, setNewTeam] = useState({ name: '', logo_url: '', region: '', description: '', reference_links: '' });
  
  // Add team to tournament state
  const [selectedTournamentId, setSelectedTournamentId] = useState('');
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);

  // Edit team state
  const [editingTeamId, setEditingTeamId] = useState('');
  const [editTeam, setEditTeam] = useState({ name: '', logo_url: '', region: '', description: '', reference_links: '', historical_records: '' });

  const handleEditTeamSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const teamId = e.target.value;
    setEditingTeamId(teamId);
    if (teamId) {
      const team = teams.find(t => t.id.toString() === teamId);
      if (team) {
        setEditTeam({
          name: team.name || '',
          logo_url: team.logo_url || '',
          region: team.region || '',
          description: team.description || '',
          reference_links: team.reference_links || '',
          historical_records: team.historical_records || ''
        });
      }
    } else {
      setEditTeam({ name: '', logo_url: '', region: '', description: '', reference_links: '', historical_records: '' });
    }
  };

  const handleUpdateTeam = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingTeamId) return;
    await fetch(`/api/teams/${editingTeamId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editTeam)
    });
    alert('队伍已更新！');
    setEditingTeamId('');
    setEditTeam({ name: '', logo_url: '', region: '', description: '', reference_links: '', historical_records: '' });
    fetchData();
  };

  // Edit tournament state
  const [editingTournamentId, setEditingTournamentId] = useState('');
  const [editTournament, setEditTournament] = useState({ name: '', game: '', start_date: new Date(), end_date: new Date(), prize_pool: '', status: 'Upcoming', description: '', format: 'Swiss' });

  const handleEditTournamentSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const tid = e.target.value;
    setEditingTournamentId(tid);
    if (tid) {
      const t = tournaments.find(x => x.id.toString() === tid);
      if (t) {
        setEditTournament({
          name: t.name || '',
          game: t.game || '',
          start_date: t.start_date ? new Date(t.start_date) : new Date(),
          end_date: t.end_date ? new Date(t.end_date) : new Date(),
          prize_pool: t.prize_pool || '',
          status: t.status || 'Upcoming',
          description: t.description || '',
          format: t.format || 'Swiss'
        });
      }
    } else {
      setEditTournament({ name: '', game: '', start_date: new Date(), end_date: new Date(), prize_pool: '', status: 'Upcoming', description: '', format: 'Swiss' });
    }
  };

  const handleUpdateTournament = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingTournamentId) return;
    await fetch(`/api/tournaments/${editingTournamentId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...editTournament,
        start_date: editTournament.start_date.toISOString().split('T')[0],
        end_date: editTournament.end_date.toISOString().split('T')[0]
      })
    });
    alert('赛事已更新！');
    setEditingTournamentId('');
    setEditTournament({ name: '', game: '', start_date: new Date(), end_date: new Date(), prize_pool: '', status: 'Upcoming', description: '', format: 'Swiss' });
    fetchData();
  };

  const handleDeleteTournament = async () => {
    if (!editingTournamentId) return;
    if (!window.confirm('确定要删除此赛事？相关的比赛记录也会被删除。')) return;
    await fetch(`/api/tournaments/${editingTournamentId}`, { method: 'DELETE' });
    alert('赛事已删除！');
    setEditingTournamentId('');
    setEditTournament({ name: '', game: '', start_date: new Date(), end_date: new Date(), prize_pool: '', status: 'Upcoming', description: '', format: 'Swiss' });
    fetchData();
  };

  // Delete team
  const handleDeleteTeam = async () => {
    if (!editingTeamId) return;
    if (!window.confirm('确定要删除此队伍？相关比赛记录也会被删除。')) return;
    await fetch(`/api/teams/${editingTeamId}`, { method: 'DELETE' });
    alert('队伍已删除！');
    setEditingTeamId('');
    setEditTeam({ name: '', logo_url: '', region: '', description: '', reference_links: '', historical_records: '' });
    fetchData();
  };

  // Matches management state
  const [allMatches, setAllMatches] = useState<(Match & { tournament_name?: string })[]>([]);
  const [editingMatchId, setEditingMatchId] = useState('');
  const [editMatch, setEditMatch] = useState({ tournament_id: '', stage: '', round: 1, team1_id: '', team2_id: '', team1_score: 0, team2_score: 0, status: 'Scheduled', match_date: new Date() });
  const [editMatchDetails, setEditMatchDetails] = useState('');

  const handleEditMatchSelect = (matchId: string) => {
    setEditingMatchId(matchId);
    if (matchId) {
      const m = allMatches.find(x => x.id.toString() === matchId);
      if (m) {
        setEditMatch({
          tournament_id: m.tournament_id?.toString() || '',
          stage: m.stage || '',
          round: m.round || 1,
          team1_id: m.team1_id?.toString() || '',
          team2_id: m.team2_id?.toString() || '',
          team1_score: m.team1_score || 0,
          team2_score: m.team2_score || 0,
          status: m.status || 'Scheduled',
          match_date: m.match_date ? new Date(m.match_date) : new Date()
        });
        setEditMatchDetails(m.raw_report || '');
      }
    } else {
      setEditMatch({ tournament_id: '', stage: '', round: 1, team1_id: '', team2_id: '', team1_score: 0, team2_score: 0, status: 'Scheduled', match_date: new Date() });
      setEditMatchDetails('');
    }
  };

  const handleUpdateMatch = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingMatchId) return;

    let report = '';
    const existingMatch = allMatches.find(x => x.id.toString() === editingMatchId);
    if (editMatchDetails && editUseAiSummary) {
      setIsGeneratingReport(true);
      try {
        const res = await fetch('/api/ai/summarize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rawDetails: editMatchDetails })
        });
        if (res.ok) {
          const data = await res.json();
          report = data.summary;
        } else {
          const errorData = await res.json();
          alert(`AI 总结生成失败: ${errorData.error || '未知错误'}`);
        }
      } catch (error) {
        console.error("AI Error:", error);
        alert('AI 总结生成失败。');
      } finally {
        setIsGeneratingReport(false);
      }
    } else {
      report = existingMatch?.report || '';
    }

    await fetch(`/api/matches/${editingMatchId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...editMatch,
        match_date: editMatch.match_date.toISOString(),
        raw_report: editMatchDetails,
        report
      })
    });
    alert('比赛已更新！');
    setEditingMatchId('');
    setEditMatch({ tournament_id: '', stage: '', round: 1, team1_id: '', team2_id: '', team1_score: 0, team2_score: 0, status: 'Scheduled', match_date: new Date() });
    setEditMatchDetails('');
    setEditUseAiSummary(false);
    fetchData();
  };

  const handleDeleteMatch = async (matchId: string) => {
    if (!window.confirm('确定要删除此比赛记录？')) return;
    await fetch(`/api/matches/${matchId}`, { method: 'DELETE' });
    setAllMatches(prev => prev.filter(m => m.id.toString() !== matchId));
    if (editingMatchId === matchId) {
      setEditingMatchId('');
      setEditMatch({ tournament_id: '', stage: '', round: 1, team1_id: '', team2_id: '', team1_score: 0, team2_score: 0, status: 'Scheduled', match_date: new Date() });
    }
  };

  // AI Import state
  const [importText, setImportText] = useState('');
  const [importPreview, setImportPreview] = useState<{ teams: any[]; matches: any[] } | null>(null);
  const [importMatchTournamentIds, setImportMatchTournamentIds] = useState<string[]>([]);
  const [isParsingImport, setIsParsingImport] = useState(false);
  const [isConfirmingImport, setIsConfirmingImport] = useState(false);
  const [importLog, setImportLog] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImportText(ev.target?.result as string || '');
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleParseImport = async () => {
    if (!importText.trim()) { alert('请先输入或上传表格数据'); return; }
    setIsParsingImport(true);
    setImportPreview(null);
    setImportLog([]);
    setImportMatchTournamentIds([]);
    try {
      const res = await fetch('/api/ai/import-table', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableData: importText })
      });
      if (!res.ok) {
        const err = await res.json();
        alert(`AI 解析失败: ${err.error}`);
        return;
      }
      const data = await res.json();
      const matches = data.matches || [];
      setImportPreview({ teams: data.teams || [], matches });
      setImportMatchTournamentIds(matches.map(() => ''));
    } catch (err: any) {
      alert(`请求失败: ${err.message}`);
    } finally {
      setIsParsingImport(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!importPreview) return;
    setIsConfirmingImport(true);
    const logs: string[] = [];
    const teamNameToId: Record<string, string> = {};

    // Fetch existing teams to avoid duplicates
    let existingTeams: Team[] = [];
    try {
      const teamsRes = await fetch('/api/teams');
      if (teamsRes.ok) existingTeams = await teamsRes.json();
    } catch { /* use empty list */ }
    existingTeams.forEach(t => { teamNameToId[t.name] = t.id.toString(); });

    // Create teams
    for (const t of importPreview.teams) {
      if (!t.name) continue;
      if (teamNameToId[t.name]) {
        // Update existing team's historical_records
        await fetch(`/api/teams/${teamNameToId[t.name]}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: t.name, logo_url: '', region: t.region || '', description: t.description || '', reference_links: '', historical_records: t.historical_records || '' })
        });
        logs.push(`✏️ 更新队伍：${t.name}`);
      } else {
        const res = await fetch('/api/teams', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: t.name, logo_url: '', region: t.region || '', description: t.description || '', reference_links: '', historical_records: t.historical_records || '' })
        });
        const data = await res.json();
        teamNameToId[t.name] = data.id?.toString() || '';
        logs.push(`✅ 创建队伍：${t.name}`);
      }
    }

    // Create matches if any
    if (importPreview.matches.length > 0) {
      // Fetch all tournaments for fallback "历史数据"
      let allTournaments: Tournament[] = [];
      try {
        const tourRes = await fetch('/api/tournaments');
        if (tourRes.ok) allTournaments = await tourRes.json();
      } catch { /* use empty list */ }

      // Ensure fallback "历史数据" tournament exists
      let histTournamentId = '';
      const histTournament = allTournaments.find(t => t.name === '历史数据');
      if (histTournament) {
        histTournamentId = histTournament.id.toString();
      }

      for (let idx = 0; idx < importPreview.matches.length; idx++) {
        const m = importPreview.matches[idx];
        const t1id = teamNameToId[m.team1_name];
        const t2id = teamNameToId[m.team2_name];
        if (!t1id || !t2id) { logs.push(`⚠️ 跳过比赛（队伍未找到）：${m.team1_name} vs ${m.team2_name}`); continue; }

        // Use per-match tournament selection, fallback to "历史数据"
        let tournamentId = importMatchTournamentIds[idx] || '';
        if (!tournamentId) {
          if (!histTournamentId) {
            const res = await fetch('/api/tournaments', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: '历史数据', game: '综合', start_date: '2020-01-01', end_date: '2024-12-31', prize_pool: '', status: 'Completed', description: 'AI 导入的历史数据', format: 'Round Robin' })
            });
            const data = await res.json();
            histTournamentId = data.id?.toString() || '';
            logs.push(`📁 创建历史数据赛事`);
          }
          tournamentId = histTournamentId;
        }

        await fetch('/api/matches', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tournament_id: tournamentId, stage: m.stage || '历史记录', round: 1, team1_id: t1id, team2_id: t2id, team1_score: m.team1_score || 0, team2_score: m.team2_score || 0, status: 'Completed', match_date: new Date().toISOString(), report: m.notes || '', raw_report: m.notes || '' })
        });
        const selectedTour = allTournaments.find(t => t.id.toString() === tournamentId);
        logs.push(`✅ 创建比赛：${m.team1_name} ${m.team1_score}-${m.team2_score} ${m.team2_name}（赛事：${selectedTour?.name || tournamentId}）`);
      }
    }

    setImportLog(logs);
    setIsConfirmingImport(false);
    setImportPreview(null);
    setImportText('');
    setImportMatchTournamentIds([]);
    fetchData();
    alert('导入完成！');
  };



  // Settings state
  const [apiKey, setApiKey] = useState('');
  const [apiUrl, setApiUrl] = useState('');
  const [aiModel, setAiModel] = useState('');
  const [isSavingApiKey, setIsSavingApiKey] = useState(false);
  const [isTestingApi, setIsTestingApi] = useState(false);
  const [apiTestResult, setApiTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Add match state
  const [newMatch, setNewMatch] = useState({ tournament_id: '', stage: '', round: 1, team1_id: '', team2_id: '', team1_score: 0, team2_score: 0, status: 'Scheduled', match_date: new Date() });
  const [matchDetails, setMatchDetails] = useState('');
  const [useAiSummary, setUseAiSummary] = useState(true);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  // Edit match AI toggle
  const [editUseAiSummary, setEditUseAiSummary] = useState(false);

  // Add stage state (for edit tournament section)
  const [newStage, setNewStage] = useState({ name: '', format: 'Swiss', group_count: 4, teams_per_group: 4, swiss_rounds: 5 });

  const fetchData = () => {
    fetch('/api/tournaments').then(res => res.json()).then(setTournaments);
    fetch('/api/teams').then(res => res.json()).then(setTeams);
    fetch('/api/matches').then(res => res.json()).then(setAllMatches);
    fetch('/api/settings/ai').then(res => res.json()).then(data => {
      setApiKey(data.apiKey || '');
      setApiUrl(data.apiUrl || '');
      setAiModel(data.aiModel || '');
    });
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateTournament = async (e: FormEvent) => {
    e.preventDefault();
    await fetch('/api/tournaments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...newTournament,
        start_date: newTournament.start_date.toISOString().split('T')[0],
        end_date: newTournament.end_date.toISOString().split('T')[0]
      })
    });
    setNewTournament({ name: '', game: '', start_date: new Date(), end_date: new Date(), prize_pool: '', status: 'Upcoming', description: '', format: 'Swiss' });
    fetchData();
  };

  const handleCreateTeam = async (e: FormEvent) => {
    e.preventDefault();
    await fetch('/api/teams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newTeam)
    });
    setNewTeam({ name: '', logo_url: '', region: '', description: '', reference_links: '' });
    fetchData();
  };

  const handleAddTeamToTournament = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedTournamentId || selectedTeamIds.length === 0) return;

    const results = await Promise.allSettled(
      selectedTeamIds.map(teamId => fetch(`/api/tournaments/${selectedTournamentId}/teams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team_id: teamId })
      }))
    );
    const successCount = results.filter(r => r.status === 'fulfilled' && r.value?.ok).length;
    const failedCount = selectedTeamIds.length - successCount;
    alert(`批量添加完成：成功 ${successCount} 支${failedCount > 0 ? `，失败 ${failedCount} 支（可能已存在）` : ''}`);
    setSelectedTeamIds([]);
    fetchData();
  };

  const handleAddStage = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingTournamentId) return;
    
    await fetch(`/api/tournaments/${editingTournamentId}/stages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newStage.name,
        format: newStage.format,
        group_count: newStage.format === 'Round Robin' ? newStage.group_count : null,
        teams_per_group: newStage.format === 'Round Robin' ? newStage.teams_per_group : null,
        swiss_rounds: newStage.format === 'Swiss' ? newStage.swiss_rounds : null
      })
    });
    alert('赛事阶段已添加！');
    setNewStage({ name: '', format: 'Swiss', group_count: 4, teams_per_group: 4, swiss_rounds: 5 });
    fetchData();
  };

  const handleDeleteStage = async (stageId: number) => {
    if (!editingTournamentId) return;
    if (!window.confirm('确定要删除此阶段？')) return;
    await fetch(`/api/tournaments/${editingTournamentId}/stages/${stageId}`, { method: 'DELETE' });
    fetchData();
  };

  const handleAddMatch = async (e: FormEvent) => {
    e.preventDefault();
    if (!newMatch.tournament_id || !newMatch.team1_id || !newMatch.team2_id) return;
    
    let report = '';
    if (matchDetails && useAiSummary) {
      setIsGeneratingReport(true);
      try {
        const res = await fetch('/api/ai/summarize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rawDetails: matchDetails })
        });
        if (res.ok) {
          const data = await res.json();
          report = data.summary;
        } else {
          const errorData = await res.json();
          alert(`AI 总结生成失败: ${errorData.error || '未知错误'}`);
        }
      } catch (error) {
        console.error("AI Error:", error);
        alert('AI 总结生成失败。');
      } finally {
        setIsGeneratingReport(false);
      }
    }

    await fetch('/api/matches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...newMatch,
        match_date: newMatch.match_date.toISOString(),
        report: report,
        raw_report: matchDetails
      })
    });
    alert('比赛已添加！');
    setNewMatch({ tournament_id: '', stage: '', round: 1, team1_id: '', team2_id: '', team1_score: 0, team2_score: 0, status: 'Scheduled', match_date: new Date() });
    setMatchDetails('');
  };

  const selectedTournament = tournaments.find(t => t.id.toString() === newMatch.tournament_id);
  const selectedEditMatchTournament = tournaments.find(t => t.id.toString() === editMatch.tournament_id);

  const handleSaveApiKey = async (e: FormEvent) => {
    e.preventDefault();
    setIsSavingApiKey(true);
    try {
      const res = await fetch('/api/settings/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, apiUrl, aiModel })
      });
      if (res.ok) {
        alert('AI 设置已保存！');
      } else {
        alert('保存失败');
      }
    } catch (error) {
      console.error(error);
      alert('保存失败');
    } finally {
      setIsSavingApiKey(false);
    }
  };

  const handleTestApi = async () => {
    setIsTestingApi(true);
    setApiTestResult(null);
    try {
      const res = await fetch('/api/ai/test', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setApiTestResult({ success: true, message: `✅ 连接成功！响应：${data.response}` });
      } else {
        setApiTestResult({ success: false, message: `❌ 连接失败：${data.error}` });
      }
    } catch (err: any) {
      setApiTestResult({ success: false, message: `❌ 请求失败：${err.message}` });
    } finally {
      setIsTestingApi(false);
    }
  };

  const getSuggestedModels = () => {
    const url = apiUrl.toLowerCase();
    if (url.includes('deepseek')) return ['deepseek-chat', 'deepseek-reasoner'];
    if (url.includes('aliyuncs') || url.includes('qwen')) return ['qwen-max', 'qwen-plus', 'qwen-turbo'];
    if (url.includes('volces') || url.includes('doubao')) return ['ep-20240101-xxx'];
    if (url.includes('anthropic') || url.includes('claude')) return ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229'];
    if (url.includes('openai') || url.includes('gpt')) return ['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'];
    if (url.includes('google') || url.includes('gemini')) return ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-2.5-flash'];
    return ['gpt-4o', 'deepseek-chat', 'qwen-max', 'claude-3-5-sonnet-20241022', 'gemini-1.5-pro'];
  };

  return (
    <div className="space-y-12">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">后台管理</h1>
        <p className="text-slate-400 mt-2">管理赛事、队伍和比赛。</p>
      </div>

      {/* AI Settings */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h2 className="text-xl font-bold text-white mb-4">AI 设置 (OpenAI 兼容格式)</h2>
        <form onSubmit={handleSaveApiKey} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">API Base URL</label>
              <input 
                type="text" 
                value={apiUrl} 
                onChange={e => setApiUrl(e.target.value)} 
                placeholder="例如: https://api.deepseek.com/v1" 
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">API Key</label>
              <input 
                type="password" 
                value={apiKey} 
                onChange={e => setApiKey(e.target.value)} 
                placeholder="sk-..." 
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500" 
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">模型名称 (Model)</label>
            <input 
              type="text" 
              list="model-suggestions"
              value={aiModel} 
              onChange={e => setAiModel(e.target.value)} 
              placeholder="例如: deepseek-chat" 
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500" 
            />
            <datalist id="model-suggestions">
              {getSuggestedModels().map(model => (
                <option key={model} value={model} />
              ))}
            </datalist>
            <p className="text-xs text-slate-500 mt-2">支持 DeepSeek, Qwen, Doubao, Claude, GPT, Gemini 等任何兼容 OpenAI 格式的接口。如果不填，将使用系统默认配置。</p>
          </div>
          <button 
            type="submit" 
            disabled={isSavingApiKey} 
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {isSavingApiKey ? '保存中...' : '保存 AI 设置'}
          </button>
          <button
            type="button"
            onClick={handleTestApi}
            disabled={isTestingApi}
            className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 ml-3"
          >
            {isTestingApi ? '测试中...' : '🔌 测试 AI 连接'}
          </button>
          {apiTestResult && (
            <p className={`mt-2 text-sm ${apiTestResult.success ? 'text-emerald-400' : 'text-red-400'}`}>
              {apiTestResult.message}
            </p>
          )}
        </form>
      </div>

      {/* AI Batch Import */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h2 className="text-xl font-bold text-white mb-2">🤖 AI 批量导入战队数据</h2>
        <p className="text-slate-400 text-sm mb-4">
          请按以下格式准备 CSV/文本数据（支持粘贴或上传 <strong>.csv / .txt</strong> 文件）：<br />
          <span className="font-mono text-emerald-400">战队名, 历史比分1, 历史比分2, 历史奖项1, 历史奖项2, ...</span><br />
          <span className="text-slate-500">第1列必须为战队名；其余列可为历史比分（如 <code>2-1 vs TeamB</code>）或历史奖项（如 <code>2023年冠军</code>），AI 会自动识别。</span>
        </p>
        <div className="space-y-3">
          <div className="flex gap-2 items-center">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="bg-slate-700 hover:bg-slate-600 text-white text-sm px-4 py-2 rounded-lg transition-colors"
            >
              📂 选择文件 (.csv / .tsv / .txt)
            </button>
            <span className="text-slate-500 text-sm">或直接在下方粘贴文本</span>
            <input ref={fileInputRef} type="file" accept=".csv,.tsv,.txt" className="hidden" onChange={handleImportFileUpload} />
          </div>
          <textarea
            value={importText}
            onChange={e => setImportText(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500 font-mono text-sm"
            rows={6}
            placeholder={"战队名,历史比分1,历史比分2,历史奖项1,历史奖项2\nTeamA,2-1 vs TeamB,3-0 vs TeamC,2023年冠军,2022年亚军\nTeamB,1-2 vs TeamA,0-3 vs TeamC,2022年季军,"}
          />
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleParseImport}
              disabled={isParsingImport || !importText.trim()}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              {isParsingImport ? 'AI 解析中...' : '🔍 AI 解析'}
            </button>
            {importPreview && (
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={isConfirmingImport}
                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                {isConfirmingImport ? '导入中...' : '✅ 确认导入'}
              </button>
            )}
          </div>

          {importPreview && (
            <div className="mt-4 space-y-4">
              <div className="bg-slate-950 border border-slate-700 rounded-lg p-4">
                <h3 className="text-white font-semibold mb-2">📋 解析预览（共 {importPreview.teams.length} 支队伍，{importPreview.matches.length} 场比赛）</h3>
                {importPreview.teams.length > 0 && (
                  <div className="mb-3">
                    <p className="text-slate-400 text-sm font-medium mb-1">队伍：</p>
                    <div className="space-y-1">
                      {importPreview.teams.map((t, i) => (
                        <div key={i} className="text-sm text-slate-300 bg-slate-900 rounded px-3 py-1">
                          <span className="text-emerald-400 font-semibold">{t.name}</span>
                          {t.region && <span className="text-slate-500 ml-2">[{t.region}]</span>}
                          {t.historical_records && <span className="text-slate-400 ml-2">— {t.historical_records}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {importPreview.matches.length > 0 && (
                  <div>
                    <p className="text-slate-400 text-sm font-medium mb-2">比赛记录（请为每场比赛选择赛事，不选则导入至"历史数据"）：</p>
                    <div className="space-y-2">
                      {importPreview.matches.map((m, i) => (
                        <div key={i} className="bg-slate-900 rounded px-3 py-2 space-y-1">
                          <div className="text-sm text-slate-300 flex items-center gap-1 flex-wrap">
                            <span className="text-emerald-400">{m.team1_name}</span>
                            <span className="text-white font-bold">{m.team1_score} - {m.team2_score}</span>
                            <span className="text-emerald-400">{m.team2_name}</span>
                            {m.stage && <span className="text-slate-500 ml-1">[{m.stage}]</span>}
                          </div>
                          <select
                            value={importMatchTournamentIds[i] || ''}
                            onChange={e => {
                              const newIds = [...importMatchTournamentIds];
                              newIds[i] = e.target.value;
                              setImportMatchTournamentIds(newIds);
                            }}
                            className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-emerald-500"
                          >
                            <option value="">自动（导入至"历史数据"）</option>
                            {tournaments.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {importLog.length > 0 && (
            <div className="bg-slate-950 border border-slate-700 rounded-lg p-4 mt-3">
              <h3 className="text-white font-semibold mb-2">导入日志</h3>
              <div className="space-y-1">
                {importLog.map((log, i) => <p key={i} className="text-sm text-slate-300">{log}</p>)}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Create Tournament */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-4">创建赛事</h2>
          <form onSubmit={handleCreateTournament} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">名称</label>
              <input required type="text" value={newTournament.name} onChange={e => setNewTournament({...newTournament, name: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">游戏</label>
                <input required type="text" value={newTournament.game} onChange={e => setNewTournament({...newTournament, game: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">赛制 (默认)</label>
                <select value={newTournament.format} onChange={e => setNewTournament({...newTournament, format: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500">
                  <option value="Swiss">瑞士轮 (Swiss)</option>
                  <option value="Round Robin">循环赛 (Round Robin)</option>
                  <option value="Single Elimination">单败淘汰 (Single Elimination)</option>
                  <option value="Double Elimination">双败淘汰 (Double Elimination)</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">开始日期</label>
                <DatePicker 
                  selected={newTournament.start_date} 
                  onChange={(date: Date | null) => date && setNewTournament({...newTournament, start_date: date})} 
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500"
                  dateFormat="yyyy-MM-dd"
                  locale={zhCN}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">结束日期</label>
                <DatePicker 
                  selected={newTournament.end_date} 
                  onChange={(date: Date | null) => date && setNewTournament({...newTournament, end_date: date})} 
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500"
                  dateFormat="yyyy-MM-dd"
                  locale={zhCN}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">总奖金</label>
                <input type="text" value={newTournament.prize_pool} onChange={e => setNewTournament({...newTournament, prize_pool: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">状态</label>
                <select value={newTournament.status} onChange={e => setNewTournament({...newTournament, status: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500">
                  <option value="Upcoming">即将开始</option>
                  <option value="Ongoing">进行中</option>
                  <option value="Completed">已结束</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">描述</label>
              <textarea value={newTournament.description} onChange={e => setNewTournament({...newTournament, description: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500" rows={3}></textarea>
            </div>
            <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-medium py-2 px-4 rounded-lg transition-colors">
              创建赛事
            </button>
          </form>
        </div>

        {/* Edit / Delete Tournament */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-4">编辑 / 删除赛事</h2>
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-400 mb-1">选择赛事</label>
            <select value={editingTournamentId} onChange={handleEditTournamentSelect} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500">
              <option value="">选择要编辑的赛事...</option>
              {tournaments.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          {editingTournamentId && (
            <form onSubmit={handleUpdateTournament} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">名称</label>
                <input required type="text" value={editTournament.name} onChange={e => setEditTournament({...editTournament, name: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">游戏</label>
                  <input required type="text" value={editTournament.game} onChange={e => setEditTournament({...editTournament, game: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">赛制</label>
                  <select value={editTournament.format} onChange={e => setEditTournament({...editTournament, format: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500">
                    <option value="Swiss">瑞士轮 (Swiss)</option>
                    <option value="Round Robin">循环赛 (Round Robin)</option>
                    <option value="Single Elimination">单败淘汰 (Single Elimination)</option>
                    <option value="Double Elimination">双败淘汰 (Double Elimination)</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">开始日期</label>
                  <DatePicker selected={editTournament.start_date} onChange={(date: Date | null) => date && setEditTournament({...editTournament, start_date: date})} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500" dateFormat="yyyy-MM-dd" locale={zhCN} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">结束日期</label>
                  <DatePicker selected={editTournament.end_date} onChange={(date: Date | null) => date && setEditTournament({...editTournament, end_date: date})} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500" dateFormat="yyyy-MM-dd" locale={zhCN} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">总奖金</label>
                  <input type="text" value={editTournament.prize_pool} onChange={e => setEditTournament({...editTournament, prize_pool: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">状态</label>
                  <select value={editTournament.status} onChange={e => setEditTournament({...editTournament, status: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500">
                    <option value="Upcoming">即将开始</option>
                    <option value="Ongoing">进行中</option>
                    <option value="Completed">已结束</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">描述</label>
                <textarea value={editTournament.description} onChange={e => setEditTournament({...editTournament, description: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500" rows={3}></textarea>
              </div>
              <button type="submit" className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors">
                更新赛事
              </button>
              <button type="button" onClick={handleDeleteTournament} className="w-full bg-red-700 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-lg transition-colors">
                🗑 删除赛事
              </button>
            </form>
          )}
          {editingTournamentId && (
            <div className="mt-6 pt-6 border-t border-slate-800">
              <h3 className="text-lg font-bold text-white mb-3">赛事阶段管理</h3>
              {/* Current stages */}
              {(() => {
                const t = tournaments.find(x => x.id.toString() === editingTournamentId);
                const stages = t?.stages || [];
                return stages.length > 0 ? (
                  <div className="space-y-2 mb-4">
                    {stages.map(s => (
                      <div key={s.id} className="flex items-center justify-between bg-slate-950 rounded-lg px-3 py-2">
                        <span className="text-slate-300 text-sm">
                          {s.name} <span className="text-slate-500">({s.format})</span>
                          {s.format === 'Round Robin' && s.group_count && s.teams_per_group && (
                            <span className="text-emerald-400 ml-2">[{s.group_count} 组 / 每组 {s.teams_per_group} 队]</span>
                          )}
                          {s.format === 'Swiss' && s.swiss_rounds && (
                            <span className="text-emerald-400 ml-2">[{s.swiss_rounds} 轮]</span>
                          )}
                        </span>
                        <button type="button" onClick={() => handleDeleteStage(s.id)} className="text-red-500 hover:text-red-400 text-xs">删除</button>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-slate-500 text-sm mb-4">暂无阶段</p>;
              })()}
              {/* Add stage */}
              <form onSubmit={handleAddStage} className="flex gap-2 items-end flex-wrap">
                <div className="flex-1 min-w-32">
                  <label className="block text-xs font-medium text-slate-400 mb-1">阶段名称</label>
                  <input required type="text" value={newStage.name} onChange={e => setNewStage({...newStage, name: e.target.value})} placeholder="如 小组赛" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500" />
                </div>
                <div className="flex-1 min-w-32">
                  <label className="block text-xs font-medium text-slate-400 mb-1">赛制</label>
                  <select value={newStage.format} onChange={e => setNewStage({...newStage, format: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500">
                    <option value="Swiss">瑞士轮</option>
                    <option value="Round Robin">循环赛</option>
                    <option value="Single Elimination">单败淘汰</option>
                    <option value="Double Elimination">双败淘汰</option>
                  </select>
                </div>
                {newStage.format === 'Round Robin' && (
                  <>
                    <div className="flex-1 min-w-28">
                      <label className="block text-xs font-medium text-slate-400 mb-1">小组数</label>
                      <input
                        required
                        type="number"
                        min="1"
                        value={newStage.group_count}
                        onChange={e => setNewStage({...newStage, group_count: parseInt(e.target.value) || 1})}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div className="flex-1 min-w-28">
                      <label className="block text-xs font-medium text-slate-400 mb-1">每组队伍</label>
                      <input
                        required
                        type="number"
                        min="2"
                        value={newStage.teams_per_group}
                        onChange={e => setNewStage({...newStage, teams_per_group: parseInt(e.target.value) || 2})}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </>
                )}
                {newStage.format === 'Swiss' && (
                  <div className="flex-1 min-w-28">
                    <label className="block text-xs font-medium text-slate-400 mb-1">瑞士轮轮数</label>
                    <input
                      required
                      type="number"
                      min="1"
                      value={newStage.swiss_rounds}
                      onChange={e => setNewStage({...newStage, swiss_rounds: parseInt(e.target.value) || 1})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                )}
                <button type="submit" className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                  添加阶段
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-8 max-w-2xl">
        <div className="space-y-8">
          {/* Create Team */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">创建队伍</h2>
            <form onSubmit={handleCreateTeam} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">名称</label>
                <input required type="text" value={newTeam.name} onChange={e => setNewTeam({...newTeam, name: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">赛区</label>
                  <input type="text" value={newTeam.region} onChange={e => setNewTeam({...newTeam, region: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Logo URL</label>
                  <input type="url" value={newTeam.logo_url} onChange={e => setNewTeam({...newTeam, logo_url: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">描述</label>
                <textarea value={newTeam.description} onChange={e => setNewTeam({...newTeam, description: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500" rows={2}></textarea>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">相关引用/文章 (每行一个链接)</label>
                <textarea value={newTeam.reference_links} onChange={e => setNewTeam({...newTeam, reference_links: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500" rows={3} placeholder="https://example.com/article1&#10;https://example.com/article2"></textarea>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">历史战绩</label>
                <textarea value={(newTeam as any).historical_records || ''} onChange={e => setNewTeam({...newTeam, historical_records: e.target.value} as any)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500" rows={3} placeholder="例如：2023年全球总决赛冠军"></textarea>
              </div>
              <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-medium py-2 px-4 rounded-lg transition-colors">
                创建队伍
              </button>
            </form>
          </div>

          {/* Edit Team */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">编辑队伍</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-400 mb-1">选择队伍</label>
              <select value={editingTeamId} onChange={handleEditTeamSelect} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500">
                <option value="">选择要编辑的队伍...</option>
                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            {editingTeamId && (
              <form onSubmit={handleUpdateTeam} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">名称</label>
                  <input required type="text" value={editTeam.name} onChange={e => setEditTeam({...editTeam, name: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">赛区</label>
                    <input type="text" value={editTeam.region} onChange={e => setEditTeam({...editTeam, region: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Logo URL</label>
                    <input type="url" value={editTeam.logo_url} onChange={e => setEditTeam({...editTeam, logo_url: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">描述</label>
                  <textarea value={editTeam.description} onChange={e => setEditTeam({...editTeam, description: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500" rows={2}></textarea>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">相关引用/文章 (每行一个链接)</label>
                  <textarea value={editTeam.reference_links} onChange={e => setEditTeam({...editTeam, reference_links: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500" rows={3} placeholder="https://example.com/article1&#10;https://example.com/article2"></textarea>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">历史战绩</label>
                  <textarea value={editTeam.historical_records} onChange={e => setEditTeam({...editTeam, historical_records: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500" rows={3} placeholder="例如：2023年全球总决赛冠军"></textarea>
                </div>
                <button type="submit" className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors">
                  更新队伍
                </button>
                <button type="button" onClick={handleDeleteTeam} className="w-full bg-red-700 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-lg transition-colors">
                  🗑 删除队伍
                </button>
              </form>
            )}
          </div>

          {/* Add Team to Tournament */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">添加队伍到赛事</h2>
            <form onSubmit={handleAddTeamToTournament} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">赛事</label>
                <select required value={selectedTournamentId} onChange={e => setSelectedTournamentId(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500">
                  <option value="">选择赛事...</option>
                  {tournaments.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">队伍</label>
                <select
                  required
                  multiple
                  value={selectedTeamIds}
                  onChange={e => {
                    const values = Array.from(e.target.selectedOptions, option => option.value);
                    setSelectedTeamIds(values);
                  }}
                  aria-describedby="batch-team-select-help"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500 min-h-40"
                >
                  {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <p id="batch-team-select-help" className="text-xs text-slate-500 mt-1">支持批量选择：按住 Ctrl/Cmd 或 Shift 多选。</p>
              </div>
              <button type="submit" className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors">
                批量添加队伍
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Add Match */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-4xl">
        <h2 className="text-xl font-bold text-white mb-4">添加比赛记录</h2>
        <form onSubmit={handleAddMatch} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">赛事</label>
              <select required value={newMatch.tournament_id} onChange={e => setNewMatch({...newMatch, tournament_id: e.target.value, stage: ''})} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500">
                <option value="">选择赛事...</option>
                {tournaments.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">阶段</label>
              <select required value={newMatch.stage} onChange={e => setNewMatch({...newMatch, stage: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500" disabled={!newMatch.tournament_id}>
                <option value="">选择阶段...</option>
                {selectedTournament?.stages?.map(s => <option key={s.id} value={s.name}>{s.name} ({s.format})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">轮次 (Round)</label>
              <input required type="number" min="1" value={newMatch.round} onChange={e => setNewMatch({...newMatch, round: parseInt(e.target.value)})} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center bg-slate-950/50 p-4 rounded-lg border border-slate-800">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">队伍 1</label>
                <select required value={newMatch.team1_id} onChange={e => setNewMatch({...newMatch, team1_id: e.target.value})} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500">
                  <option value="">选择队伍 1...</option>
                  {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">队伍 1 得分</label>
                <input required type="number" min="0" value={newMatch.team1_score} onChange={e => setNewMatch({...newMatch, team1_score: parseInt(e.target.value)})} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500" />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">队伍 2</label>
                <select required value={newMatch.team2_id} onChange={e => setNewMatch({...newMatch, team2_id: e.target.value})} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500">
                  <option value="">选择队伍 2...</option>
                  {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">队伍 2 得分</label>
                <input required type="number" min="0" value={newMatch.team2_score} onChange={e => setNewMatch({...newMatch, team2_score: parseInt(e.target.value)})} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">状态</label>
              <select required value={newMatch.status} onChange={e => setNewMatch({...newMatch, status: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500">
                <option value="Scheduled">未开始 (Scheduled)</option>
                <option value="Ongoing">进行中 (Ongoing)</option>
                <option value="Completed">已结束 (Completed)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">比赛时间</label>
              <DatePicker 
                selected={newMatch.match_date} 
                onChange={(date: Date | null) => date && setNewMatch({...newMatch, match_date: date})} 
                showTimeSelect
                timeFormat="HH:mm"
                timeIntervals={15}
                timeCaption="时间"
                dateFormat="yyyy-MM-dd HH:mm"
                locale={zhCN}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">比赛详细数据</label>
            <textarea 
              value={matchDetails} 
              onChange={e => setMatchDetails(e.target.value)} 
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500" 
              rows={4}
              placeholder="例如：第一局队伍A选了... 队伍B选了... 20分钟爆发团战..."
            ></textarea>
            <label className="flex items-center gap-2 mt-2 cursor-pointer">
              <input
                type="checkbox"
                checked={useAiSummary}
                onChange={e => setUseAiSummary(e.target.checked)}
                className="w-4 h-4 accent-emerald-500"
              />
              <span className="text-sm text-slate-400">使用 AI 自动生成总结（关闭则仅保存原始数据）</span>
            </label>
          </div>

          <button type="submit" disabled={isGeneratingReport} className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-800 text-white font-medium py-2 px-4 rounded-lg transition-colors flex justify-center items-center">
            {isGeneratingReport ? 'AI 正在生成总结并添加比赛...' : '添加比赛'}
          </button>
        </form>
      </div>

      {/* Manage Match Records */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h2 className="text-xl font-bold text-white mb-4">管理比赛记录（编辑 / 删除）</h2>
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-400 mb-1">选择比赛</label>
          <select value={editingMatchId} onChange={e => handleEditMatchSelect(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500">
            <option value="">选择要编辑的比赛...</option>
            {allMatches.map(m => (
              <option key={m.id} value={m.id}>
                [{m.tournament_name}] {m.team1_name} {m.team1_score}-{m.team2_score} {m.team2_name} ({m.stage || ''} R{m.round})
              </option>
            ))}
          </select>
        </div>
        {editingMatchId && (
          <form onSubmit={handleUpdateMatch} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">赛事</label>
                <select required value={editMatch.tournament_id} onChange={e => setEditMatch({...editMatch, tournament_id: e.target.value, stage: ''})} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500">
                  <option value="">选择赛事...</option>
                  {tournaments.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">阶段</label>
                <select required value={editMatch.stage} onChange={e => setEditMatch({...editMatch, stage: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500">
                  <option value="">选择阶段...</option>
                  {selectedEditMatchTournament?.stages?.map(s => <option key={s.id} value={s.name}>{s.name} ({s.format})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">轮次</label>
                <input required type="number" min="1" value={editMatch.round} onChange={e => setEditMatch({...editMatch, round: parseInt(e.target.value)})} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center bg-slate-950/50 p-4 rounded-lg border border-slate-800">
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">队伍 1</label>
                  <select required value={editMatch.team1_id} onChange={e => setEditMatch({...editMatch, team1_id: e.target.value})} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500">
                    <option value="">选择队伍 1...</option>
                    {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">队伍 1 得分</label>
                  <input required type="number" min="0" value={editMatch.team1_score} onChange={e => setEditMatch({...editMatch, team1_score: parseInt(e.target.value)})} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500" />
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">队伍 2</label>
                  <select required value={editMatch.team2_id} onChange={e => setEditMatch({...editMatch, team2_id: e.target.value})} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500">
                    <option value="">选择队伍 2...</option>
                    {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">队伍 2 得分</label>
                  <input required type="number" min="0" value={editMatch.team2_score} onChange={e => setEditMatch({...editMatch, team2_score: parseInt(e.target.value)})} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500" />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">状态</label>
                <select required value={editMatch.status} onChange={e => setEditMatch({...editMatch, status: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500">
                  <option value="Scheduled">未开始 (Scheduled)</option>
                  <option value="Ongoing">进行中 (Ongoing)</option>
                  <option value="Completed">已结束 (Completed)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">比赛时间</label>
                <DatePicker
                  selected={editMatch.match_date}
                  onChange={(date: Date | null) => date && setEditMatch({...editMatch, match_date: date})}
                  showTimeSelect
                  timeFormat="HH:mm"
                  timeIntervals={15}
                  timeCaption="时间"
                  dateFormat="yyyy-MM-dd HH:mm"
                  locale={zhCN}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">比赛详细记录</label>
              <textarea value={editMatchDetails} onChange={e => setEditMatchDetails(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500" rows={4} placeholder="例如：第一局队伍A选了..."></textarea>
              <label className="flex items-center gap-2 mt-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editUseAiSummary}
                  onChange={e => setEditUseAiSummary(e.target.checked)}
                  className="w-4 h-4 accent-emerald-500"
                />
                <span className="text-sm text-slate-400">重新用 AI 生成总结（关闭则保留原有总结）</span>
              </label>
            </div>
            <div className="flex gap-3">
              <button type="submit" className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors">
                更新比赛
              </button>
              <button type="button" onClick={() => handleDeleteMatch(editingMatchId)} className="flex-1 bg-red-700 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-lg transition-colors">
                🗑 删除比赛
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
