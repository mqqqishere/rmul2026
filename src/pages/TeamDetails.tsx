import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Trophy, Globe, History, Link as LinkIcon, FileText, X } from 'lucide-react';
import { Team, Tournament, Match } from '../types';
import ReactMarkdown from 'react-markdown';

interface TeamData extends Team {
  tournaments: Tournament[];
  matches: Match[];
}

export default function TeamDetails() {
  const { id } = useParams<{ id: string }>();
  const [team, setTeam] = useState<TeamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [reportTab, setReportTab] = useState<'ai' | 'raw'>('ai');

  useEffect(() => {
    fetch(`/api/teams/${id}`)
      .then(res => res.json())
      .then(data => {
        setTeam(data);
        setLoading(false);
      });
  }, [id]);

  if (loading) return <div className="text-center py-12 text-slate-400">加载队伍信息中...</div>;
  if (!team) return <div className="text-center py-12 text-red-400">未找到队伍。</div>;

  const referenceLinks = team.reference_links ? team.reference_links.split('\n').filter(l => l.trim()) : [];

  return (
    <div className="space-y-12">
      {/* Header Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
          <Globe className="w-64 h-64" />
        </div>
        
        <div className="relative z-10 shrink-0">
          {team.logo_url ? (
            <img src={team.logo_url} alt={team.name} className="w-32 h-32 md:w-48 md:h-48 rounded-full object-cover bg-slate-800 border-4 border-slate-700 shadow-2xl" />
          ) : (
            <div className="w-32 h-32 md:w-48 md:h-48 rounded-full bg-slate-800 flex items-center justify-center text-slate-500 font-bold text-5xl border-4 border-slate-700 shadow-2xl">
              {team.name.charAt(0)}
            </div>
          )}
        </div>

        <div className="relative z-10 space-y-4 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-3">
            <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
              <Globe className="w-4 h-4" /> {team.region}
            </span>
          </div>

          <div>
            <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">{team.name}</h1>
            <p className="text-lg text-slate-400 mt-4 max-w-2xl leading-relaxed">{team.description}</p>
            {team.historical_records && (
              <div className="mt-4 p-4 bg-slate-950/50 rounded-lg border border-slate-800/50 inline-block">
                <h3 className="text-sm font-semibold text-emerald-400 mb-2 flex items-center gap-2">
                  <Trophy className="w-4 h-4" /> 历史战绩
                </h3>
                <p className="text-slate-300 text-sm whitespace-pre-line">{team.historical_records}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Matches */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center gap-2">
            <History className="w-6 h-6 text-emerald-400" />
            <h2 className="text-2xl font-bold text-white tracking-tight">近期比赛</h2>
          </div>
          
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-800/50">
            {team.matches?.map(match => {
              const isTeam1 = match.team1_id === team.id;
              const isWin = isTeam1 ? match.team1_score > match.team2_score : match.team2_score > match.team1_score;
              const isLoss = isTeam1 ? match.team1_score < match.team2_score : match.team2_score < match.team1_score;
              const isDraw = match.team1_score === match.team2_score;
              
              const resultClass = match.status === 'Completed' 
                ? isWin ? 'text-emerald-400' : isLoss ? 'text-red-400' : 'text-slate-400'
                : 'text-slate-500';

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
                    <span className="text-slate-400 font-medium truncate">{(match as any).tournament_name}</span>
                    <span className="text-slate-500 text-xs">{match.stage} - 第 {match.round} 轮</span>
                  </div>

                  <div className="flex items-center justify-center gap-4 w-full sm:w-2/4">
                    <div className={`font-medium ${isTeam1 ? 'text-white' : 'text-slate-400'}`}>
                      {match.team1_name}
                    </div>
                    
                    <div className="flex items-center gap-2 bg-slate-950 px-3 py-1 rounded-lg border border-slate-800">
                      <span className={`font-mono ${match.team1_score > match.team2_score ? 'text-emerald-400 font-bold' : 'text-slate-400'}`}>
                        {match.team1_score}
                      </span>
                      <span className="text-slate-600 text-xs">-</span>
                      <span className={`font-mono ${match.team2_score > match.team1_score ? 'text-emerald-400 font-bold' : 'text-slate-400'}`}>
                        {match.team2_score}
                      </span>
                    </div>

                    <div className={`font-medium ${!isTeam1 ? 'text-white' : 'text-slate-400'}`}>
                      {match.team2_name}
                    </div>
                  </div>

                  <div className="flex flex-col items-end w-full sm:w-1/4 text-sm">
                    <span className={`font-bold uppercase tracking-wider flex items-center gap-2 ${resultClass}`}>
                      {match.status === 'Completed' ? (isWin ? '胜' : isLoss ? '负' : '平') : (match.status === 'Ongoing' ? '进行中' : '未开始')}
                      {(match.report || match.raw_report) && <FileText className="w-4 h-4 text-emerald-400" />}
                    </span>
                    <span className="text-slate-500 text-xs">
                      {match.match_date ? format(new Date(match.match_date), 'yyyy-MM-dd') : '待定'}
                    </span>
                  </div>
                </div>
              );
            })}
            {(!team.matches || team.matches.length === 0) && (
              <div className="p-8 text-center text-slate-500">暂无历史战绩。</div>
            )}
          </div>
        </div>

        {/* Tournaments Attended & References */}
        <div className="space-y-8">
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <Trophy className="w-6 h-6 text-emerald-400" />
              <h2 className="text-2xl font-bold text-white tracking-tight">参赛记录</h2>
            </div>
            
            <div className="grid gap-4">
              {team.tournaments?.map(tournament => (
                <Link 
                  key={tournament.id} 
                  to={`/tournaments/${tournament.id}`}
                  className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-emerald-500/50 hover:bg-slate-800/50 transition-all group"
                >
                  <div className="font-semibold text-slate-200 group-hover:text-emerald-400 transition-colors mb-2">
                    {tournament.name}
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>{tournament.game}</span>
                    <span>{tournament.start_date ? format(new Date(tournament.start_date), 'yyyy') : ''}</span>
                  </div>
                </Link>
              ))}
              {(!team.tournaments || team.tournaments.length === 0) && (
                <div className="p-8 text-center text-slate-500 bg-slate-900 border border-slate-800 border-dashed rounded-xl">
                  暂无参赛记录。
                </div>
              )}
            </div>
          </div>

          {/* References Section */}
          {referenceLinks.length > 0 && (
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <LinkIcon className="w-6 h-6 text-emerald-400" />
                <h2 className="text-2xl font-bold text-white tracking-tight">相关引用/文章</h2>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
                {referenceLinks.map((link, idx) => (
                  <a 
                    key={idx} 
                    href={link.startsWith('http') ? link : `https://${link}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors break-all"
                  >
                    <LinkIcon className="w-4 h-4 shrink-0" />
                    {link}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

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
