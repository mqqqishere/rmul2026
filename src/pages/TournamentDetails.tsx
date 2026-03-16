import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Calendar, Trophy, Gamepad2, Users, GitMerge, GitBranch, RefreshCw, List } from 'lucide-react';
import { Tournament, Match, TournamentStage } from '../types';
import SwissBracket from '../components/SwissBracket';
import RoundRobinBracket from '../components/RoundRobinBracket';

export default function TournamentDetails() {
  const { id } = useParams<{ id: string }>();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedStage, setSelectedStage] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/tournaments/${id}`)
      .then(res => res.json())
      .then(data => {
        setTournament(data);
        if (data.stages && data.stages.length > 0) {
          setSelectedStage(data.stages[0].name);
        } else if (data.matches && data.matches.length > 0) {
          setSelectedStage(data.matches[0].stage);
        }
        setLoading(false);
      });
  }, [id]);

  if (loading) return <div className="text-center py-12 text-slate-400">正在加载赛事详情...</div>;
  if (!tournament) return <div className="text-center py-12 text-red-400">未找到赛事。</div>;

  // Group matches by stage
  const stages: Record<string, Match[]> = tournament.matches?.reduce((acc, match) => {
    if (!acc[match.stage]) acc[match.stage] = [];
    acc[match.stage].push(match);
    return acc;
  }, {} as Record<string, Match[]>) || {};

  const getStageIcon = (format: string) => {
    const lower = format.toLowerCase();
    if (lower.includes('swiss') || lower.includes('瑞士')) return <GitMerge className="w-5 h-5" />;
    if (lower.includes('double') || lower.includes('双败')) return <GitBranch className="w-5 h-5" />;
    if (lower.includes('single') || lower.includes('knockout') || lower.includes('单败') || lower.includes('淘汰')) return <Trophy className="w-5 h-5" />;
    if (lower.includes('group') || lower.includes('round robin') || lower.includes('小组') || lower.includes('循环')) return <RefreshCw className="w-5 h-5" />;
    return <List className="w-5 h-5" />;
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'Ongoing': return '进行中';
      case 'Upcoming': return '未开始';
      case 'Completed': return '已结束';
      default: return status;
    }
  };

  const currentStageMatches = selectedStage ? stages[selectedStage] || [] : [];
  const currentStageFormat = tournament.stages?.find(s => s.name === selectedStage)?.format || 'Swiss';

  return (
    <div className="space-y-12">
      {/* Header Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
          <Trophy className="w-64 h-64" />
        </div>
        
        <div className="relative z-10 space-y-6">
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              tournament.status === 'Ongoing' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
              tournament.status === 'Upcoming' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
              'bg-slate-500/10 text-slate-400 border border-slate-500/20'
            }`}>
              {getStatusText(tournament.status)}
            </span>
            <span className="flex items-center gap-1.5 text-sm font-medium text-slate-400 bg-slate-800 px-3 py-1 rounded-full border border-slate-700">
              <Gamepad2 className="w-4 h-4" /> {tournament.game}
            </span>
          </div>

          <div>
            <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">{tournament.name}</h1>
            <p className="text-lg text-slate-400 mt-4 max-w-3xl leading-relaxed">{tournament.description}</p>
          </div>

          <div className="flex flex-wrap gap-8 pt-4 border-t border-slate-800/50">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">日期</span>
              <div className="flex items-center gap-2 text-slate-300 font-medium">
                <Calendar className="w-4 h-4 text-emerald-400" />
                <span>
                  {tournament.start_date ? format(new Date(tournament.start_date), 'yyyy年MM月dd日') : '待定'} 
                  {' - '} 
                  {tournament.end_date ? format(new Date(tournament.end_date), 'yyyy年MM月dd日') : '待定'}
                </span>
              </div>
            </div>
            
            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">奖金池</span>
              <div className="flex items-center gap-2 text-slate-300 font-medium">
                <Trophy className="w-4 h-4 text-emerald-400" />
                <span>{tournament.prize_pool || '待定'}</span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">赛制</span>
              <div className="flex items-center gap-2 text-slate-300 font-medium">
                <span className="text-emerald-400">#</span>
                <span>{tournament.format || '待定'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Teams Section */}
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Users className="w-6 h-6 text-emerald-400" />
          <h2 className="text-2xl font-bold text-white tracking-tight">参赛队伍</h2>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {tournament.teams?.map(team => (
            <Link 
              key={team.id} 
              to={`/teams/${team.id}`}
              className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col items-center gap-3 hover:border-emerald-500/50 hover:bg-slate-800/50 transition-all group"
            >
              {team.logo_url ? (
                <img src={team.logo_url} alt={team.name} className="w-16 h-16 rounded-full object-cover bg-slate-800 group-hover:scale-105 transition-transform" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center text-slate-500 font-bold text-xl group-hover:scale-105 transition-transform">
                  {team.name.charAt(0)}
                </div>
              )}
              <div className="text-center">
                <div className="font-semibold text-slate-200 group-hover:text-emerald-400 transition-colors">{team.name}</div>
                <div className="text-xs text-slate-500">{team.region}</div>
              </div>
            </Link>
          ))}
          {(!tournament.teams || tournament.teams.length === 0) && (
            <div className="col-span-full text-slate-500 py-8 text-center bg-slate-900/50 rounded-xl border border-slate-800 border-dashed">
              暂无队伍参赛。
            </div>
          )}
        </div>
      </div>

      {/* Stages Navigation */}
      {tournament.stages && tournament.stages.length > 0 && (
        <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-4">
          {tournament.stages.map(stage => (
            <button
              key={stage.id}
              onClick={() => setSelectedStage(stage.name)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedStage === stage.name 
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                  : 'bg-slate-900 text-slate-400 border border-slate-800 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              {getStageIcon(stage.format)}
              {stage.name}
            </button>
          ))}
        </div>
      )}

      {/* Matches Section */}
      <div className="space-y-12">
        {selectedStage ? (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
              <span className="w-2 h-8 bg-emerald-500 rounded-full"></span>
              <span className="text-emerald-400">{getStageIcon(currentStageFormat)}</span>
              {selectedStage} 阶段
            </h2>
            
            {currentStageMatches.length > 0 ? (
              currentStageFormat.toLowerCase().includes('swiss') || currentStageFormat.toLowerCase().includes('瑞士') ? (
                <SwissBracket matches={currentStageMatches} />
              ) : currentStageFormat.toLowerCase().includes('group') || currentStageFormat.toLowerCase().includes('round robin') || currentStageFormat.toLowerCase().includes('小组') || currentStageFormat.toLowerCase().includes('循环') ? (
                <RoundRobinBracket matches={currentStageMatches} teams={tournament.teams || []} />
              ) : (
                <SwissBracket matches={currentStageMatches} /> // Fallback
              )
            ) : (
              <div className="text-slate-500 py-12 text-center bg-slate-900/50 rounded-xl border border-slate-800 border-dashed">
                此阶段暂无比赛安排。
              </div>
            )}
          </div>
        ) : (
          <div className="text-slate-500 py-12 text-center bg-slate-900/50 rounded-xl border border-slate-800 border-dashed">
            暂无比赛阶段信息。
          </div>
        )}
      </div>
    </div>
  );
}
