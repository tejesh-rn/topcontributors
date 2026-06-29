import './index.css';

import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';

import { trpc } from './trpc';
import type { inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '../server/trpc';

type LeaderboardData = inferRouterOutputs<AppRouter>['leaderboard']['get'];
type InitData = inferRouterOutputs<AppRouter>['init']['get'];

export const App = () => {
  const [init, setInit] = useState<InitData | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardData | null>(null);
  const [activeTab, setActiveTab] = useState<'combined' | 'posts' | 'comments'>('combined');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const loadData = async () => {
    try {
      const [initRes, lbRes] = await Promise.all([
        trpc.init.get.query(),
        trpc.leaderboard.get.query(),
      ]);
      setInit(initRes);
      setLeaderboard(lbRes);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();

    const interval = setInterval(async () => {
      try {
        const updatedLb = await trpc.leaderboard.sync.mutate();
        setLeaderboard(updatedLb);
      } catch (err) {
        console.error('Auto-sync error:', err);
      }
    }, 60000); // 1 minute

    return () => clearInterval(interval);
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const updatedLb = await trpc.leaderboard.sync.mutate();
      setLeaderboard(updatedLb);
    } catch (err) {
      console.error('Error syncing leaderboard:', err);
    } finally {
      setSyncing(false);
    }
  };



  // Get current active tab list
  const currentList = leaderboard ? leaderboard[activeTab] : [];
  const top3 = currentList.slice(0, 3);
  const list4to10 = currentList.slice(3, 10);

  return (
    <div className="min-h-screen bg-checkered text-white font-sans flex flex-col items-center justify-center p-4 md:p-6 relative select-none">
      {/* Semi-transparent overlay to help readability */}
      <div className="absolute inset-0 bg-blue-900/10 pointer-events-none" />

      {/* Main Game Modal Container */}
      <div className="z-10 w-full max-w-2xl bg-blue-600 border-4 border-white rounded-[2rem] shadow-2xl flex flex-col relative overflow-hidden my-4">

        {/* Modal Header */}
        <div className="p-6 pb-2 text-center">
          <div className="inline-block mb-2 px-5 py-1 bg-amber-400 border-2 border-white rounded-full text-[10px] font-black uppercase tracking-widest text-slate-900 shadow-md">
            Lobby Stats
          </div>
          <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight text-white drop-shadow-[0_4px_0_rgba(0,0,0,0.4)]">
            Leaderboard
          </h1>
          <p className="text-xs uppercase font-black text-amber-200 drop-shadow-[0_2px_0_rgba(0,0,0,0.3)]">
            Top Subreddit Contributors
          </p>
        </div>

        {/* Tab Switcher styled as capsule gaming buttons */}
        <div className="flex justify-center gap-2 px-6 mb-6">
          <div className="flex bg-blue-800/60 p-1 border-2 border-white/20 rounded-2xl w-full max-w-md">
            {(['combined', 'posts', 'comments'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
                  activeTab === tab
                    ? 'bg-amber-400 text-slate-900 border-2 border-white shadow-md'
                    : 'text-blue-100 hover:text-white border-2 border-transparent'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Main Score Area */}
        <div className="flex-1 px-6 pb-6 overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="flex flex-col items-center justify-center min-h-[300px]">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/30 border-t-amber-400" />
              <p className="text-xs uppercase font-black text-blue-100 mt-4 tracking-wider">Loading lobby...</p>
            </div>
          ) : currentList.length === 0 ? (
            <div className="flex flex-col items-center justify-center bg-blue-700/50 border-2 border-white/10 rounded-2xl p-12 text-center">
              <p className="text-base font-black uppercase text-amber-200">No Contributions Yet</p>
              <p className="text-xs text-blue-100 font-bold mt-2 max-w-sm">
                Activity from posts and comments in this subreddit will appear here once users start earning karma.
              </p>
              <button
                onClick={handleSync}
                className="mt-6 px-6 py-3 bg-amber-400 border-b-4 border-amber-600 hover:border-b-2 hover:translate-y-[2px] transition-all font-black text-slate-900 rounded-xl text-xs uppercase tracking-wider cursor-pointer active:translate-y-[4px] active:border-b-0 shadow-lg"
              >
                Sync Subreddit
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {/* Podium View (Top 3) */}
              <div className="flex items-end justify-center gap-2 sm:gap-4 min-h-[180px] pt-8 border-b-4 border-blue-700/60 pb-6">
                {/* 2nd Place */}
                {top3[1] && (
                  <div className="flex-1 max-w-[90px] sm:max-w-[110px] flex flex-col items-center">
                    <div className="flex flex-col items-center justify-center pt-8 pb-3 w-full bg-blue-700 border-2 border-white rounded-t-2xl shadow-xl relative">
                      <div className="absolute -top-4 w-7 h-7 rounded-full bg-slate-300 border-2 border-white flex items-center justify-center text-[10px] font-black text-slate-950 shadow-md">
                        2
                      </div>
                      {top3[1].avatarUrl ? (
                        <img
                          src={top3[1].avatarUrl}
                          alt=""
                          className="w-8 h-8 rounded-full border border-white/55 object-cover mb-2 bg-slate-800"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full border border-white/55 bg-slate-500 flex items-center justify-center text-[10px] font-black text-white mb-2">
                          {top3[1].member.substring(0, 2).toUpperCase()}
                        </div>
                      )}
                      <span className="text-[9px] sm:text-[10px] font-black text-blue-100 text-center px-1 mb-1 break-all">
                        u/{top3[1].member}
                      </span>
                      <span className="text-[9px] sm:text-[10px] font-black text-amber-300 uppercase">{top3[1].score} KARMA</span>
                    </div>
                  </div>
                )}

                {/* 1st Place */}
                {top3[0] && (
                  <div className="flex-1 max-w-[100px] sm:max-w-[120px] flex flex-col items-center">
                    <div className="flex flex-col items-center justify-center pt-8 pb-3 w-full bg-amber-400 border-2 border-white rounded-t-2xl shadow-xl relative">
                      <div className="absolute -top-4.5 w-8 h-8 rounded-full bg-red-500 border-2 border-white flex items-center justify-center text-[10px] font-black text-white shadow-md">
                        1
                      </div>
                      {top3[0].avatarUrl ? (
                        <img
                          src={top3[0].avatarUrl}
                          alt=""
                          className="w-10 h-10 rounded-full border border-white object-cover mb-2 bg-slate-800"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full border border-white bg-slate-655 flex items-center justify-center text-[10px] font-black text-white mb-2">
                          {top3[0].member.substring(0, 2).toUpperCase()}
                        </div>
                      )}
                      <span className="text-[10px] sm:text-xs font-black text-red-700 text-center px-1 mb-1 break-all">
                        u/{top3[0].member}
                      </span>
                      <span className="text-[10px] sm:text-xs font-black text-red-600 uppercase">{top3[0].score} KARMA</span>
                    </div>
                  </div>
                )}

                {/* 3rd Place */}
                {top3[2] && (
                  <div className="flex-1 max-w-[90px] sm:max-w-[110px] flex flex-col items-center">
                    <div className="flex flex-col items-center justify-center pt-8 pb-3 w-full bg-blue-700 border-2 border-white rounded-t-2xl shadow-xl relative">
                      <div className="absolute -top-4 w-7 h-7 rounded-full bg-amber-700 border-2 border-white flex items-center justify-center text-[10px] font-black text-amber-100 shadow-md">
                        3
                      </div>
                      {top3[2].avatarUrl ? (
                        <img
                          src={top3[2].avatarUrl}
                          alt=""
                          className="w-8 h-8 rounded-full border border-white/55 object-cover mb-2 bg-slate-800"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full border border-white/55 bg-slate-500 flex items-center justify-center text-[10px] font-black text-white mb-2">
                          {top3[2].member.substring(0, 2).toUpperCase()}
                        </div>
                      )}
                      <span className="text-[9px] sm:text-[10px] font-black text-blue-100 text-center px-1 mb-1 break-all">
                        u/{top3[2].member}
                      </span>
                      <span className="text-[9px] sm:text-[10px] font-black text-amber-300 uppercase">{top3[2].score} KARMA</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Ranks 4-10 (Styled as Smash Karts Stats capsule items) */}
              {list4to10.length > 0 && (
                <div className="flex flex-col gap-2">
                  {list4to10.map((user, idx) => {
                    const rank = idx + 4;
                    return (
                      <div
                        key={user.member}
                        className="flex items-center justify-between bg-blue-700/80 hover:bg-blue-700 border-2 border-white/30 hover:border-white/50 rounded-2xl px-3 sm:px-4 py-3 shadow-md transition-all duration-150 transform hover:scale-[1.01] gap-2"
                      >
                        {/* Rank and Member details */}
                        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                          <div className="w-7 h-7 rounded-full bg-blue-900/60 border-2 border-white/40 flex items-center justify-center text-xs font-black text-white flex-shrink-0">
                            {rank}
                          </div>
                          {user.avatarUrl ? (
                            <img
                              src={user.avatarUrl}
                              alt=""
                              className="w-8 h-8 rounded-full border border-white/80 object-cover bg-slate-800 flex-shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full border border-white/80 bg-slate-500 flex items-center justify-center text-[10px] font-black text-white flex-shrink-0">
                              {user.member.substring(0, 2).toUpperCase()}
                            </div>
                          )}
                          <span className="text-xs sm:text-sm font-black text-white tracking-wide break-all">
                            u/{user.member}
                          </span>
                        </div>

                        {/* Score details */}
                        <div className="px-3 sm:px-4 py-1 rounded-full bg-blue-900 border-2 border-white/30 text-[10px] sm:text-xs font-black text-amber-300 uppercase shadow-inner flex-shrink-0">
                          {user.score} KARMA
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="bg-blue-800/60 p-4 border-t-2 border-white/20 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-col gap-0.5">
            <div className="text-[10px] font-black uppercase text-blue-200 tracking-wider">
              Player: <span className="text-white">{init?.username || 'Guest'}</span>
            </div>
            <div className="text-[9px] font-bold uppercase text-amber-200 tracking-wider">
              Leaderboard updated every minute
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSync}
              disabled={syncing || loading}
              className="px-4 py-2 rounded-xl bg-blue-600 border-b-4 border-blue-800 hover:border-b-2 hover:translate-y-[2px] transition-all font-black text-white text-xs uppercase tracking-wider cursor-pointer active:translate-y-[4px] active:border-b-0 disabled:opacity-50"
            >
              {syncing ? 'Syncing...' : 'Sync Live'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
