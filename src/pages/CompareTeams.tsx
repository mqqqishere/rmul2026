import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Team, Match, Tournament } from '../types';
import { GitCompare, Trophy, Sparkles, FileText, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function CompareTeams() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [team1Id, setTeam1Id] = useState<string>('');
  const [team2Id, setTeam2Id] = useState<string>('');
  const [matches, setMatches] = useState<Match[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [currentTournamentId, setCurrentTournamentId] = useState<string>('');
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState<string | null>(null);
  const [loadingPrediction, setLoadingPrediction] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [reportTab, setReportTab] = useState<'ai' | 'raw'>('ai');

  useEffect(() => {
    fetch('/api/teams')
      .then(res => res.json())
      .then(data => setTeams(data));
    fetch('/api/tournaments')
      .then(res => res.json())
      .then(data => setTournaments(data));
  }, []);

  useEffect(() => {
    if (team1Id && team2Id && team1Id !== team2Id) {
      setLoading(true);
      fetch(`/api/matches/compare/${team1Id}/${team2Id}`)
        .then(res => res.json())
        .then(data => {
          setMatches(data);
          setLoading(false);
        });
    } else {
      setMatches([]);
      setPrediction(null);
    }
  }, [team1Id, team2Id]);

  const handlePredict = async () => {
    if (!team1Id || !team2Id || team1Id === team2Id) return;
    
    setLoadingPrediction(true);
    try {
      const [team1Res, team2Res] = await Promise.all([
        fetch(`/api/teams/${team1Id}`),
        fetch(`/api/teams/${team2Id}`)
      ]);
      const team1Data = team1Res.ok ? await team1Res.json() : teams.find(t => t.id.toString() === team1Id);
      const team2Data = team2Res.ok ? await team2Res.json() : teams.find(t => t.id.toString() === team2Id);
      const currentTournamentMatches = currentTournamentId
        ? await fetch(`/api/matches/compare/${team1Id}/${team2Id}/current/${currentTournamentId}`).then(res => res.ok ? res.json() : [])
        : [];

      const response = await fetch('/api/ai/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          team1Name: team1Data?.name,
          team2Name: team2Data?.name,
          team1Details: {
            historical_records: team1Data?.historical_records || '',
            description: team1Data?.description || '',
            region: team1Data?.region || ''
          },
          team2Details: {
            historical_records: team2Data?.historical_records || '',
            description: team2Data?.description || '',
            region: team2Data?.region || ''
          },
          historicalMatches: matches,
          currentTournamentMatches,
          customPrompt
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate prediction');
      }
      
      const data = await response.json();
      setPrediction(data.prediction);
    } catch (error) {
      console.error('Error generating prediction:', error);
      alert('生成预测失败，请检查 AI API 配置。');
    } finally {
      setLoadingPrediction(false);
    }
  };

  const team1 = teams.find(t => t.id.toString() === team1Id);
  const team2 = teams.find(t => t.id.toString() === team2Id);

  // Calculate stats
  let team1Wins = 0;
  let team2Wins = 0;
  let draws = 0;

  matches.forEach(m => {
    if (m.status !== 'Completed') return;
    const isTeam1First = m.team1_id.toString() === team1Id;
    const t1Score = isTeam1First ? m.team1_score : m.team2_score;
    const t2Score = isTeam1First ? m.team2_score : m.team1_score;

    if (t1Score > t2Score) team1Wins++;
    else if (t2Score > t1Score) team2Wins++;
    else draws++;
  });

  return (
    <div className="space-y-12">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
          <GitCompare className="w-8 h-8 text-emerald-400" />
          队伍对比
        </h1>
        <p className="text-slate-400 mt-2">选择两支队伍查看历史交锋记录和 AI 赛前预测。</p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8">
        <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16">
          {/* Team 1 Selector */}
          <div className="w-full md:w-1/3 space-y-4 text-center">
            <select 
              value={team1Id} 
              onChange={e => setTeam1Id(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-emerald-500 text-center text-lg font-medium"
            >
              <option value="">选择队伍 A...</option>
              {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            
            {team1 && (
              <div className="flex flex-col items-center gap-4 pt-4">
                {team1.logo_url ? (
                  <img src={team1.logo_url} alt={team1.name} className="w-32 h-32 rounded-full object-cover bg-slate-800 border-4 border-slate-700" />
                ) : (
                  <div className="w-32 h-32 rounded-full bg-slate-800 flex items-center justify-center text-slate-500 font-bold text-4xl border-4 border-slate-700">
                    {team1.name.charAt(0)}
                  </div>
                )}
                <h2 className="text-2xl font-bold text-white">{team1.name}</h2>
              </div>
            )}
          </div>

          {/* VS Badge */}
          <div className="flex flex-col items-center justify-center shrink-0">
            <div className="w-16 h-16 rounded-full bg-slate-800 border-4 border-slate-950 flex items-center justify-center text-slate-400 font-black italic text-xl z-10">
              VS
            </div>
          </div>

          {/* Team 2 Selector */}
          <div className="w-full md:w-1/3 space-y-4 text-center">
            <select 
              value={team2Id} 
              onChange={e => setTeam2Id(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-emerald-500 text-center text-lg font-medium"
            >
              <option value="">选择队伍 B...</option>
              {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            
            {team2 && (
              <div className="flex flex-col items-center gap-4 pt-4">
                {team2.logo_url ? (
                  <img src={team2.logo_url} alt={team2.name} className="w-32 h-32 rounded-full object-cover bg-slate-800 border-4 border-slate-700" />
                ) : (
                  <div className="w-32 h-32 rounded-full bg-slate-800 flex items-center justify-center text-slate-500 font-bold text-4xl border-4 border-slate-700">
                    {team2.name.charAt(0)}
                  </div>
                )}
                <h2 className="text-2xl font-bold text-white">{team2.name}</h2>
              </div>
            )}
          </div>
        </div>

        {/* Head to Head Stats */}
        {team1 && team2 && (
          <div className="mt-12 pt-8 border-t border-slate-800">
            <h3 className="text-center text-slate-400 font-medium mb-6 uppercase tracking-widest text-sm">历史交锋战绩</h3>
            <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-3">
              <select
                value={currentTournamentId}
                onChange={e => setCurrentTournamentId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500 text-sm"
              >
                <option value="">当前比赛：不指定（仅用历史）</option>
                {tournaments.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              <input
                type="text"
                value={customPrompt}
                onChange={e => setCustomPrompt(e.target.value)}
                placeholder="可选：自定义提示词（如提高近3场权重）"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500 text-sm"
              />
            </div>
            <div className="flex items-center justify-center gap-8 md:gap-24">
              <div className="text-center">
                <div className="text-5xl font-black text-emerald-400">{team1Wins}</div>
                <div className="text-slate-500 text-sm mt-2">胜</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-slate-600">{draws}</div>
                <div className="text-slate-500 text-sm mt-2">平</div>
              </div>
              <div className="text-center">
                <div className="text-5xl font-black text-blue-400">{team2Wins}</div>
                <div className="text-slate-500 text-sm mt-2">胜</div>
              </div>
            </div>
            
            <div className="mt-12 flex justify-center">
              <button
                onClick={handlePredict}
                disabled={loadingPrediction}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Sparkles className="w-5 h-5" />
                {loadingPrediction ? 'AI 预测生成中...' : '生成 AI 赛前预测'}
              </button>
            </div>
            
            {prediction && (
              <div className="mt-8 bg-slate-950 border border-emerald-900/50 rounded-xl p-6">
                <h4 className="text-emerald-400 font-bold mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  AI 预测报告
                </h4>
                <div className="prose prose-invert prose-emerald max-w-none">
                  <ReactMarkdown>{prediction}</ReactMarkdown>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Match History List */}
      {team1 && team2 && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-white tracking-tight">对战记录</h2>
          
          {loading ? (
            <div className="text-center py-12 text-slate-400">加载记录中...</div>
          ) : matches.length > 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-800/50">
              {matches.map(match => {
                return (
                  <div 
                    key={match.id} 
                    className={`p-4 transition-colors flex flex-col sm:flex-row items-center justify-between gap-4 ${(match.report || match.raw_report) ? 'cursor-pointer hover:bg-slate-800/40' : 'hover:bg-slate-800/20'}`}
                    onClick={() => {
                      if (match.report || match.raw_report) {
                        setSelectedMatch(match);
                        setReportTab(match.report ? 'ai' : 'raw');
                      }
                    }}
                  >
                    <div className="flex flex-col w-full sm:w-1/4 text-sm">
                      <Link to={`/tournaments/${match.tournament_id}`} className="text-emerald-400 hover:text-emerald-300 font-medium truncate" onClick={(e) => e.stopPropagation()}>
                        {(match as any).tournament_name}
                      </Link>
                      <span className="text-slate-500 text-xs">{match.stage} - 第 {match.round} 轮</span>
                    </div>

                    <div className="flex items-center justify-center gap-4 w-full sm:w-2/4">
                      <div className={`font-medium ${match.team1_id.toString() === team1Id ? 'text-emerald-400' : match.team1_id.toString() === team2Id ? 'text-blue-400' : 'text-slate-400'}`}>
                        {match.team1_name}
                      </div>
                      
                      <div className="flex items-center gap-2 bg-slate-950 px-3 py-1 rounded-lg border border-slate-800">
                        <span className="font-mono text-white font-bold">{match.team1_score}</span>
                        <span className="text-slate-600 text-xs">-</span>
                        <span className="font-mono text-white font-bold">{match.team2_score}</span>
                      </div>

                      <div className={`font-medium ${match.team2_id.toString() === team1Id ? 'text-emerald-400' : match.team2_id.toString() === team2Id ? 'text-blue-400' : 'text-slate-400'}`}>
                        {match.team2_name}
                      </div>
                    </div>

                    <div className="flex flex-col items-end w-full sm:w-1/4 text-sm">
                      <span className="font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                        {match.status === 'Completed' ? '已结束' : match.status === 'Ongoing' ? '进行中' : '未开始'}
                        {(match.report || match.raw_report) && <FileText className="w-4 h-4 text-emerald-400" />}
                      </span>
                      <span className="text-slate-500 text-xs">
                        {match.match_date ? format(new Date(match.match_date), 'yyyy-MM-dd') : '待定'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-12 text-center text-slate-500 bg-slate-900 border border-slate-800 border-dashed rounded-xl">
              这两支队伍暂无历史交锋记录。
            </div>
          )}
        </div>
      )}

      {/* Match Report Modal */}
      {selectedMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-900/50">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-400" />
                比赛详情
              </h3>
              <button 
                onClick={() => setSelectedMatch(null)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              <div className="flex items-center justify-center gap-8 mb-8 pb-6 border-b border-slate-800/50">
                <div className="flex flex-col items-center gap-2">
                  {selectedMatch.team1_logo && <img src={selectedMatch.team1_logo} alt={selectedMatch.team1_name} className="w-16 h-16 rounded-full object-cover bg-slate-800" />}
                  <span className="font-bold text-slate-200">{selectedMatch.team1_name}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-3xl font-mono font-bold text-emerald-400">{selectedMatch.team1_score}</span>
                  <span className="text-slate-600">-</span>
                  <span className="text-3xl font-mono font-bold text-emerald-400">{selectedMatch.team2_score}</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  {selectedMatch.team2_logo && <img src={selectedMatch.team2_logo} alt={selectedMatch.team2_name} className="w-16 h-16 rounded-full object-cover bg-slate-800" />}
                  <span className="font-bold text-slate-200">{selectedMatch.team2_name}</span>
                </div>
              </div>

              <div className="flex gap-4 mb-6 border-b border-slate-800">
                <button
                  className={`pb-2 px-1 font-medium transition-colors ${reportTab === 'ai' ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-slate-400 hover:text-slate-300'}`}
                  onClick={() => setReportTab('ai')}
                >
                  AI 总结报告
                </button>
                <button
                  className={`pb-2 px-1 font-medium transition-colors ${reportTab === 'raw' ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-slate-400 hover:text-slate-300'}`}
                  onClick={() => setReportTab('raw')}
                >
                  战报原文
                </button>
              </div>

              <div className="prose prose-invert prose-emerald max-w-none">
                {reportTab === 'ai' ? (
                  <ReactMarkdown>{selectedMatch.report || '暂无 AI 总结报告'}</ReactMarkdown>
                ) : (
                  <div className="whitespace-pre-wrap text-slate-300">{selectedMatch.raw_report || '暂无战报原文'}</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
