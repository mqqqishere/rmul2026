import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Calendar, Trophy, Gamepad2 } from 'lucide-react';

interface Tournament {
  id: number;
  name: string;
  game: string;
  start_date: string;
  end_date: string;
  prize_pool: string;
  status: string;
  stages?: Array<{
    id: number;
    name: string;
    format: string;
    group_count?: number | null;
    teams_per_group?: number | null;
    swiss_rounds?: number | null;
  }>;
}

export default function Home() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/tournaments')
      .then(res => res.json())
      .then(data => {
        setTournaments(data);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="text-center py-12 text-slate-400">加载赛事中...</div>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">赛事列表</h1>
        <p className="text-slate-400 mt-2">探索即将到来、正在进行和过去的电竞赛事。</p>
      </div>

      <div className="grid gap-4">
        {tournaments.map(tournament => (
          <Link 
            key={tournament.id} 
            to={`/tournaments/${tournament.id}`}
            className="block bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-emerald-500/50 hover:bg-slate-800/50 transition-all group"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    tournament.status === 'Ongoing' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                    tournament.status === 'Upcoming' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                    'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                  }`}>
                    {tournament.status === 'Ongoing' ? '进行中' : tournament.status === 'Upcoming' ? '即将开始' : '已结束'}
                  </span>
                  <span className="flex items-center gap-1 text-xs font-medium text-slate-400 bg-slate-800 px-2.5 py-0.5 rounded-full">
                    <Gamepad2 className="w-3 h-3" /> {tournament.game}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-white group-hover:text-emerald-400 transition-colors">{tournament.name}</h2>
              </div>
              
              <div className="flex flex-wrap md:flex-nowrap gap-6 text-sm text-slate-400">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-500" />
                  <span>
                    {tournament.start_date ? format(new Date(tournament.start_date), 'yyyy-MM-dd') : '待定'} 
                    {' - '} 
                    {tournament.end_date ? format(new Date(tournament.end_date), 'yyyy-MM-dd') : '待定'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-slate-500" />
                  <span className="font-medium text-slate-300">{tournament.prize_pool || '待定'}</span>
                </div>
              </div>
            </div>
            {tournament.stages && tournament.stages.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-800 space-y-2">
                <p className="text-xs text-slate-500">赛制图表（阶段配置同步展示）</p>
                {tournament.stages.map(stage => {
                  const metric = stage.format === 'Swiss'
                    ? stage.swiss_rounds || 0
                    : stage.format === 'Round Robin'
                      ? (stage.group_count || 0) * (stage.teams_per_group || 0)
                      : 0;
                  const maxBar = Math.max(
                    ...tournament.stages!.map(s => s.format === 'Swiss'
                      ? s.swiss_rounds || 0
                      : s.format === 'Round Robin'
                        ? (s.group_count || 0) * (s.teams_per_group || 0)
                        : 0),
                    1
                  );
                  const widthPercent = Math.max(8, Math.round((metric / maxBar) * 100));
                  return (
                    <div key={stage.id} className="space-y-1">
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>{stage.name}</span>
                        <span>
                          {stage.format === 'Round Robin' && stage.group_count && stage.teams_per_group
                            ? `${stage.group_count}组 × ${stage.teams_per_group}队`
                            : stage.format === 'Swiss' && stage.swiss_rounds
                              ? `${stage.swiss_rounds}轮`
                              : stage.format}
                        </span>
                      </div>
                      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500/70 rounded-full" style={{ width: `${widthPercent}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
