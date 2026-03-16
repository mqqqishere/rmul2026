import { useState } from 'react';
import { Match, Team } from '../types';
import { format } from 'date-fns';
import { FileText, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface RoundRobinBracketProps {
  matches: Match[];
  teams: Team[];
}

export default function RoundRobinBracket({ matches, teams }: RoundRobinBracketProps) {
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [reportTab, setReportTab] = useState<'ai' | 'raw'>('ai');

  // Calculate standings
  const standings = teams.map(team => {
    let wins = 0;
    let losses = 0;
    let points = 0;

    matches.forEach(match => {
      if (match.status !== 'Completed') return;
      
      if (match.team1_id === team.id) {
        if (match.team1_score > match.team2_score) { wins++; points += 3; }
        else if (match.team1_score < match.team2_score) { losses++; }
        else { points += 1; } // Draw
      } else if (match.team2_id === team.id) {
        if (match.team2_score > match.team1_score) { wins++; points += 3; }
        else if (match.team2_score < match.team1_score) { losses++; }
        else { points += 1; } // Draw
      }
    });

    return { ...team, wins, losses, points };
  }).sort((a, b) => b.points - a.points || b.wins - a.wins);

  return (
    <>
      <div className="space-y-8">
        {/* Standings Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="bg-slate-800/50 px-6 py-4 border-b border-slate-800">
            <h3 className="font-semibold text-slate-200">小组积分榜</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-400">
              <thead className="text-xs uppercase bg-slate-950/50 text-slate-500 border-b border-slate-800">
                <tr>
                  <th className="px-6 py-3 font-medium">排名</th>
                  <th className="px-6 py-3 font-medium">队伍</th>
                  <th className="px-6 py-3 font-medium text-center">胜</th>
                  <th className="px-6 py-3 font-medium text-center">负</th>
                  <th className="px-6 py-3 font-medium text-center">积分</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {standings.map((team, index) => (
                  <tr key={team.id} className="hover:bg-slate-800/20 transition-colors">
                    <td className="px-6 py-4 font-mono text-slate-500">{index + 1}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {team.logo_url ? (
                          <img src={team.logo_url} alt={team.name} className="w-6 h-6 rounded-full object-cover bg-slate-800" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-slate-800" />
                        )}
                        <span className="font-medium text-slate-200">{team.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center text-emerald-400 font-medium">{team.wins}</td>
                    <td className="px-6 py-4 text-center text-red-400 font-medium">{team.losses}</td>
                    <td className="px-6 py-4 text-center text-blue-400 font-bold">{team.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Matches List */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="bg-slate-800/50 px-6 py-4 border-b border-slate-800">
            <h3 className="font-semibold text-slate-200">比赛列表</h3>
          </div>
          <div className="divide-y divide-slate-800/50">
            {matches.map(match => (
              <div 
                key={match.id} 
                className={`flex flex-col sm:flex-row items-center justify-between p-4 transition-colors ${(match.report || match.raw_report) ? 'cursor-pointer hover:bg-slate-800/40' : 'hover:bg-slate-800/20'}`}
                onClick={() => {
                  if (match.report || match.raw_report) {
                    setSelectedMatch(match);
                    setReportTab(match.report ? 'ai' : 'raw');
                  }
                }}
              >
                <div className="flex items-center gap-4 w-full sm:w-2/5 justify-end">
                  <span className="font-medium text-slate-300">{match.team1_name}</span>
                  {match.team1_logo ? (
                    <img src={match.team1_logo} alt={match.team1_name} className="w-8 h-8 rounded-full object-cover bg-slate-800" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-slate-800" />
                  )}
                </div>
                
                <div className="flex flex-col items-center justify-center w-full sm:w-1/5 my-4 sm:my-0 relative">
                  <div className="flex items-center gap-3 bg-slate-950 px-4 py-1.5 rounded-lg border border-slate-800">
                    <span className={`font-mono text-lg ${match.team1_score > match.team2_score ? 'text-emerald-400 font-bold' : 'text-slate-400'}`}>
                      {match.team1_score}
                    </span>
                    <span className="text-slate-600 text-sm">-</span>
                    <span className={`font-mono text-lg ${match.team2_score > match.team1_score ? 'text-emerald-400 font-bold' : 'text-slate-400'}`}>
                      {match.team2_score}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                    {match.match_date ? format(new Date(match.match_date), 'MM月dd日 HH:mm') : '待定'}
                    {(match.report || match.raw_report) && <FileText className="w-3 h-3 text-emerald-400 ml-1" />}
                  </span>
                </div>

                <div className="flex items-center gap-4 w-full sm:w-2/5 justify-start">
                  {match.team2_logo ? (
                    <img src={match.team2_logo} alt={match.team2_name} className="w-8 h-8 rounded-full object-cover bg-slate-800" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-slate-800" />
                  )}
                  <span className="font-medium text-slate-300">{match.team2_name}</span>
                </div>
              </div>
            ))}
          </div>
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
    </>
  );
}
