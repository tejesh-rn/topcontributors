import './index.css';

import { useEffect, useState } from 'react';
import { navigateTo, requestExpandedMode } from '@devvit/web/client';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { trpc } from './trpc';
import type { inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '../server/trpc';

type LeaderboardData = inferRouterOutputs<AppRouter>['leaderboard']['get'];

export const Splash = () => {
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await trpc.leaderboard.get.query();
        setData(res);
      } catch (err) {
        console.error('Error fetching leaderboard:', err);
      } finally {
        setLoading(false);
      }
    };
    void loadData();

    const interval = setInterval(async () => {
      try {
        const res = await trpc.leaderboard.get.query();
        setData(res);
      } catch (err) {
        console.error('Auto-refresh error:', err);
      }
    }, 60000); // 1 minute

    return () => clearInterval(interval);
  }, []);

  const top3 = data?.combined.slice(0, 3) || [];
  const hasData = top3.length > 0;

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-checkered text-white p-6 font-sans select-none">
      {/* Semi-transparent overlay to help text readability */}
      <div className="absolute inset-0 bg-blue-900/10 pointer-events-none" />

      {/* Main Container styled like Smash Karts modal */}
      <div className="z-10 flex flex-col items-center text-center max-w-md w-full bg-blue-600 border-4 border-white rounded-[2rem] shadow-2xl p-6 relative overflow-hidden">
        {/* Header Ribbon / Badge */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-amber-400" />

        <div className="mb-2 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest bg-amber-400 text-slate-900 border-2 border-white shadow-md">
          Subreddit Leaderboard
        </div>

        <h1 className="text-3xl font-black uppercase tracking-tight text-white drop-shadow-[0_4px_0_rgba(0,0,0,0.4)] mb-0.5">
          Top Contributors
        </h1>
        <p className="text-xs uppercase font-black text-amber-200 drop-shadow-[0_2px_0_rgba(0,0,0,0.3)] mb-6">
          Real-Time Activity Tracker
        </p>

        {loading ? (
          <div className="flex h-36 items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/30 border-t-amber-400" />
          </div>
        ) : !hasData ? (
          <div className="flex h-36 flex-col items-center justify-center bg-blue-700/80 rounded-2xl p-6 border-2 border-white/10 w-full">
            <p className="text-sm font-black uppercase text-amber-200">No Activity Yet</p>
            <p className="text-xs text-blue-100 font-bold mt-1.5 max-w-[240px]">
              Submit posts and comments in this subreddit to claim your spot on the leaderboard.
            </p>
          </div>
        ) : (
          <div className="flex items-end justify-center gap-2 h-44 w-full mb-6 pt-6">
            {/* 2nd Place */}
            {top3[1] && (
              <div className="flex-1 max-w-[90px] sm:max-w-[110px] flex flex-col items-center">
                <div className="flex flex-col items-center justify-center pt-8 pb-2 w-full bg-blue-700 border-2 border-white rounded-t-xl shadow-lg relative">
                  <div className="absolute -top-3 w-6 h-6 rounded-full bg-slate-300 border-2 border-white flex items-center justify-center text-[10px] font-black text-slate-950 shadow-md">
                    2
                  </div>
                  {top3[1].avatarUrl ? (
                    <img
                      src={top3[1].avatarUrl}
                      alt=""
                      className="w-8 h-8 rounded-full border border-white/50 object-cover mb-2 bg-slate-800"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full border border-white/50 bg-slate-500 flex items-center justify-center text-[10px] font-black text-white mb-2">
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
                <div className="flex flex-col items-center justify-center pt-8 pb-3 w-full bg-amber-400 border-2 border-white rounded-t-xl shadow-lg relative">
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
                    <div className="w-10 h-10 rounded-full border border-white bg-slate-600 flex items-center justify-center text-[10px] font-black text-white mb-2">
                      {top3[0].member.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                  <span className="text-[9px] sm:text-[10px] font-black text-red-700 text-center px-1 mb-1 break-all">
                    u/{top3[0].member}
                  </span>
                  <span className="text-[9px] sm:text-[10px] font-black text-red-600 uppercase">{top3[0].score} KARMA</span>
                </div>
              </div>
            )}

            {/* 3rd Place */}
            {top3[2] && (
              <div className="flex-1 max-w-[90px] sm:max-w-[110px] flex flex-col items-center">
                <div className="flex flex-col items-center justify-center pt-8 pb-2 w-full bg-blue-700 border-2 border-white rounded-t-xl shadow-lg relative">
                  <div className="absolute -top-3 w-6 h-6 rounded-full bg-amber-700 border-2 border-white flex items-center justify-center text-[10px] font-black text-amber-100 shadow-md">
                    3
                  </div>
                  {top3[2].avatarUrl ? (
                    <img
                      src={top3[2].avatarUrl}
                      alt=""
                      className="w-8 h-8 rounded-full border border-white/50 object-cover mb-2 bg-slate-800"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full border border-white/50 bg-slate-500 flex items-center justify-center text-[10px] font-black text-white mb-2">
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
        )}

        <button
          className="w-full flex h-12 items-center justify-center rounded-2xl bg-amber-400 border-b-4 border-amber-600 hover:border-b-2 hover:translate-y-[2px] transition-all px-6 font-black text-slate-900 shadow-lg cursor-pointer uppercase tracking-wider text-sm active:translate-y-[4px] active:border-b-0"
          onClick={(e) => requestExpandedMode(e.nativeEvent, 'game')}
        >
          View Full Leaderboard
        </button>
      </div>

      <footer className="absolute bottom-4 flex gap-4 text-[10px] font-bold text-blue-200">
        <button
          className="cursor-pointer hover:text-white transition-colors"
          onClick={() => navigateTo('https://developers.reddit.com/docs')}
        >
          Docs
        </button>
        <span>|</span>
        <button
          className="cursor-pointer hover:text-white transition-colors"
          onClick={() => navigateTo('https://www.reddit.com/r/Devvit')}
        >
          r/Devvit Subreddit
        </button>
      </footer>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Splash />
  </StrictMode>
);
