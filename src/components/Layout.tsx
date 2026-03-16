import { useState } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { Trophy, Settings, GitCompare, Menu, X } from 'lucide-react';

export default function Layout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans">
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <Link to="/" className="flex items-center gap-2 text-emerald-400 hover:text-emerald-300 transition-colors">
                <Trophy className="w-6 h-6" />
                <span className="font-bold text-xl tracking-tight">电竞中心</span>
              </Link>
              <nav className="hidden md:flex gap-6">
                <Link to="/" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">赛事列表</Link>
                <Link to="/compare" className="text-sm font-medium text-slate-300 hover:text-white transition-colors flex items-center gap-1">
                  <GitCompare className="w-4 h-4" /> 队伍对比
                </Link>
                <Link to="/admin" className="text-sm font-medium text-slate-300 hover:text-white transition-colors flex items-center gap-1">
                  <Settings className="w-4 h-4" /> 后台管理
                </Link>
              </nav>
            </div>
            
            {/* Mobile menu button */}
            <div className="md:hidden flex items-center">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="text-slate-400 hover:text-white focus:outline-none"
              >
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-slate-900 border-b border-slate-800">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              <Link 
                to="/" 
                className="block px-3 py-2 rounded-md text-base font-medium text-slate-300 hover:text-white hover:bg-slate-800"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                赛事列表
              </Link>
              <Link 
                to="/compare" 
                className="block px-3 py-2 rounded-md text-base font-medium text-slate-300 hover:text-white hover:bg-slate-800 flex items-center gap-2"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <GitCompare className="w-5 h-5" /> 队伍对比
              </Link>
              <Link 
                to="/admin" 
                className="block px-3 py-2 rounded-md text-base font-medium text-slate-300 hover:text-white hover:bg-slate-800 flex items-center gap-2"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Settings className="w-5 h-5" /> 后台管理
              </Link>
            </div>
          </div>
        )}
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
}
