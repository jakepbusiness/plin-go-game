'use client';

interface GameResult {
  bet: number;
  multiplier: number;
  win: number;
  timestamp: number;
}

interface PlinGoStatsProps {
  gameHistory: GameResult[];
}

export function PlinGoStats({ gameHistory }: PlinGoStatsProps) {
  const totalWins = gameHistory.filter(result => result.win > 0).length;
  const totalLosses = gameHistory.filter(result => result.win === 0).length;
  const totalWagered = gameHistory.reduce((sum, result) => sum + result.bet, 0);
  const totalWon = gameHistory.reduce((sum, result) => sum + result.win, 0);
  const profitLoss = totalWon - totalWagered;
  const winRate = gameHistory.length > 0 ? (totalWins / gameHistory.length) * 100 : 0;
  
  // Calculate additional dynamic stats
  const averageMultiplier = gameHistory.length > 0 
    ? gameHistory.reduce((sum, result) => sum + result.multiplier, 0) / gameHistory.length 
    : 0;
  const biggestWin = gameHistory.length > 0 
    ? Math.max(...gameHistory.map(result => result.win)) 
    : 0;
  const currentStreak = gameHistory.length > 0 
    ? gameHistory.slice(0, 5).filter(result => result.win > 0).length 
    : 0;

  return (
    <div className="h-full">
      <h3 className="text-sm font-bold text-cyan-300 mb-2 uppercase tracking-wider">Game Statistics</h3>
      
      <div className="grid grid-cols-4 gap-2">
        {/* Win Rate - Enhanced */}
        <div className={`rounded-md p-2 border transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-orange-500/25 cursor-pointer ${
          winRate >= 50 
            ? 'bg-gradient-to-r from-green-900/30 to-emerald-900/30 border-green-500/20 shadow-lg shadow-green-500/20 hover:from-orange-900/30 hover:to-red-900/30 hover:border-orange-500/30' 
            : winRate >= 30
            ? 'bg-gradient-to-r from-yellow-900/30 to-orange-900/30 border-yellow-500/20 shadow-lg shadow-yellow-500/20 hover:from-orange-900/30 hover:to-red-900/30 hover:border-orange-500/30'
            : 'bg-gradient-to-r from-red-900/30 to-pink-900/30 border-red-500/20 shadow-lg shadow-red-500/20 hover:from-orange-900/30 hover:to-red-900/30 hover:border-orange-500/30'
        }`}>
          <div className="text-sm font-semibold text-gray-300 group-hover:text-orange-300 transition-colors duration-200">Win Rate</div>
          <div className={`text-lg font-bold transition-colors duration-200 ${
            winRate >= 50 ? 'text-green-400 group-hover:text-orange-400' : winRate >= 30 ? 'text-yellow-400 group-hover:text-orange-400' : 'text-red-400 group-hover:text-orange-400'
          }`}>
            {winRate.toFixed(1)}%
          </div>
          <div className="text-xs text-gray-400 group-hover:text-orange-200 transition-colors duration-200">{totalWins}/{gameHistory.length}</div>
        </div>

        {/* Average Multiplier */}
        <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 rounded-md p-2 border border-purple-500/20 hover:from-orange-900/30 hover:to-red-900/30 hover:border-orange-500/30 hover:scale-105 hover:shadow-lg hover:shadow-orange-500/25 transition-all duration-300 cursor-pointer group">
          <div className="text-sm text-purple-300 font-semibold group-hover:text-orange-300 transition-colors duration-200">Avg Multiplier</div>
          <div className="text-lg font-bold text-purple-400 group-hover:text-orange-400 transition-colors duration-200">{averageMultiplier.toFixed(1)}x</div>
          <div className="text-xs text-gray-400 group-hover:text-orange-200 transition-colors duration-200">Last {gameHistory.length}</div>
        </div>

        {/* Current Streak */}
        <div className={`rounded-md p-2 border hover:from-orange-900/30 hover:to-red-900/30 hover:border-orange-500/30 hover:scale-105 hover:shadow-lg hover:shadow-orange-500/25 transition-all duration-300 cursor-pointer group ${
          currentStreak >= 3 
            ? 'bg-gradient-to-r from-green-900/30 to-emerald-900/30 border-green-500/20' 
            : currentStreak >= 1
            ? 'bg-gradient-to-r from-blue-900/30 to-cyan-900/30 border-blue-500/20'
            : 'bg-gradient-to-r from-gray-900/30 to-gray-800/30 border-gray-500/20'
        }`}>
          <div className="text-sm font-semibold text-gray-300 group-hover:text-orange-300 transition-colors duration-200">Streak</div>
          <div className={`text-lg font-bold transition-colors duration-200 ${
            currentStreak >= 3 ? 'text-green-400 group-hover:text-orange-400' : currentStreak >= 1 ? 'text-blue-400 group-hover:text-orange-400' : 'text-gray-400 group-hover:text-orange-400'
          }`}>
            {currentStreak}W
          </div>
          <div className="text-xs text-gray-400 group-hover:text-orange-200 transition-colors duration-200">Last 5 games</div>
        </div>

        {/* Profit/Loss */}
        <div className={`rounded-md p-2 border hover:from-orange-900/30 hover:to-red-900/30 hover:border-orange-500/30 hover:scale-105 hover:shadow-lg hover:shadow-orange-500/25 transition-all duration-300 cursor-pointer group ${
          profitLoss >= 0 
            ? 'bg-gradient-to-r from-green-900/30 to-emerald-900/30 border-green-500/20' 
            : 'bg-gradient-to-r from-red-900/30 to-pink-900/30 border-red-500/20'
        }`}>
          <div className="text-sm font-semibold text-gray-300 group-hover:text-orange-300 transition-colors duration-200">P/L</div>
          <div className={`text-lg font-bold transition-colors duration-200 ${profitLoss >= 0 ? 'text-green-400 group-hover:text-orange-400' : 'text-red-400 group-hover:text-orange-400'}`}>
            {profitLoss >= 0 ? '+' : ''}CA${profitLoss.toLocaleString()}
          </div>
          <div className="text-xs text-gray-400 group-hover:text-orange-200 transition-colors duration-200">Total</div>
        </div>
      </div>
    </div>
  );
}
