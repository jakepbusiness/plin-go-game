'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { PlinGoGame } from '@/components/PlinGoGame';
import { PlinGoStats } from '@/components/PlinGoStats';

export default function PlinGoPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [playerName, setPlayerName] = useState('Player');
  const [balance, setBalance] = useState(1000000);
  const [betAmount, setBetAmount] = useState(0);
  const [riskLevel, setRiskLevel] = useState<'low' | 'medium' | 'high'>('high');
  const [rows, setRows] = useState(16);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [turboMode, setTurboMode] = useState(false);
  const [selectedSkin, setSelectedSkin] = useState('cyberpunk');
  const [playerLevel, setPlayerLevel] = useState(1);
  const [playerAvatar, setPlayerAvatar] = useState('default');
  const [streak, setStreak] = useState(0);
  const [winRate, setWinRate] = useState(0);
  const [avgMultiplier, setAvgMultiplier] = useState(0);
  const [profitLoss, setProfitLoss] = useState(0);
  const [autoPlaySettings, setAutoPlaySettings] = useState({
    balls: 10,
    stopOnLoss: false,
    stopAmount: 50000,
    speed: 1
  });
  const [gameHistory, setGameHistory] = useState<Array<{
    bet: number;
    multiplier: number;
    win: number;
    timestamp: number;
  }>>([]);
  const [leaderboard, setLeaderboard] = useState<Array<{
    userId: string;
    username: string;
    whopUsername?: string;
    name: string;
    balance: number;
    wins: number;
    totalWagered: number;
    biggestWin: number;
    level: number;
    avatar: string;
    whopAvatarUrl?: string;
    lastUpdated: number;
  }>>([]);
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);

  // Available skins - simplified without points system
  const [skins, setSkins] = useState([
    { id: 'cyberpunk', name: 'Cyberpunk', unlocked: true },
    { id: 'golden', name: 'Golden', unlocked: true },
    { id: 'neon', name: 'Neon', unlocked: true },
    { id: 'crystal', name: 'Crystal', unlocked: true },
    { id: 'whop-elite', name: 'Whop Elite', unlocked: true },
    { id: 'diamond', name: 'Diamond', unlocked: true }
  ]);

  // Load game state from API on mount
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        const [userResponse, leaderboardResponse] = await Promise.all([
          fetch('/api/plin-go/user-data', { signal: controller.signal }),
          fetch('/api/plin-go/leaderboard', { signal: controller.signal })
        ]);
        
        clearTimeout(timeoutId);
        
        if (userResponse.ok) {
          const userData = await userResponse.json();
          // Use Whop username if available, otherwise use stored player name
          setPlayerName(userData.whopUsername || userData.playerName || 'Player');
          setBalance(userData.balance);
          setGameHistory(userData.gameHistory);
          setPlayerLevel(userData.playerLevel);
          setPlayerAvatar(userData.playerAvatar);
          setSelectedSkin(userData.selectedSkin);
          setStreak(userData.streak);
          setWinRate(userData.winRate);
          setAvgMultiplier(userData.avgMultiplier);
          setProfitLoss(userData.profitLoss);
        } else {
          console.warn('User data response not ok:', userResponse.status);
        }
        
        if (leaderboardResponse.ok) {
          const leaderboardData = await leaderboardResponse.json();
          setLeaderboard(leaderboardData.leaderboard);
        } else {
          console.warn('Leaderboard response not ok:', leaderboardResponse.status);
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          console.log('Initial data loading timed out');
        } else {
          console.error('Error loading user data:', error);
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    loadUserData();
  }, []);

  // Save game state to API and update leaderboard
  useEffect(() => {
    if (!isLoading) {
      // Save user data
      fetch('/api/plin-go/user-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          balance,
          gameHistory,
          playerName,
          selectedSkin,
          playerAvatar,
          playerLevel,
          streak,
          winRate,
          avgMultiplier,
          profitLoss,
          isPlaying: isPlaying
        })
      }).catch(error => {
        // Silent error handling for production
      });

      // Update leaderboard with current stats
      const totalWagered = gameHistory.reduce((sum, r) => sum + r.bet, 0);
      const totalWins = gameHistory.filter(r => r.win > 0).length;
      const biggestWin = gameHistory.length > 0 ? Math.max(...gameHistory.map(r => r.win)) : 0;
      
      fetch('/api/plin-go/leaderboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          balance,
          wins: totalWins,
          totalWagered,
          biggestWin,
          level: playerLevel,
          avatar: playerAvatar,
          isPlaying: isPlaying
        })
      })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          setLeaderboard(data.leaderboard);
        }
      })
      .catch(error => {
        // Silent error handling for production
      });
    }
  }, [balance, gameHistory, playerName, selectedSkin, playerAvatar, playerLevel, streak, winRate, avgMultiplier, profitLoss, isLoading, isPlaying]);

  // Live leaderboard updates - poll every 5 seconds with better error handling
  useEffect(() => {
    if (isLoading) return;

    let isUpdating = false;

    const updateLeaderboard = async () => {
      if (isUpdating) return; // Prevent concurrent requests
      isUpdating = true;
      
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
        
        const response = await fetch('/api/plin-go/leaderboard', {
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const data = await response.json();
          setLeaderboard(data.leaderboard);
          setLeaderboardError(null); // Clear error on success
        } else {
          console.warn('Leaderboard response not ok:', response.status);
          setLeaderboardError('Server error - retrying...');
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          console.log('Leaderboard request timed out');
          setLeaderboardError('Connection timeout - retrying...');
        } else {
          console.error('Error updating live leaderboard:', error);
          setLeaderboardError('Failed to load leaderboard');
        }
      } finally {
        isUpdating = false;
      }
    };

    const sendHeartbeat = async () => {
      try {
        // Send heartbeat to keep user active
        const totalWagered = gameHistory.reduce((sum, r) => sum + r.bet, 0);
        const totalWins = gameHistory.filter(r => r.win > 0).length;
        const biggestWin = gameHistory.length > 0 ? Math.max(...gameHistory.map(r => r.win)) : 0;
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
        
        await fetch('/api/plin-go/leaderboard', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            balance,
            wins: totalWins,
            totalWagered,
            biggestWin,
            level: playerLevel,
            avatar: playerAvatar,
            isPlaying: isPlaying
          }),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          // Silent timeout handling
        } else {
          // Silent error handling for production
        }
      }
    };

    // Update immediately
    updateLeaderboard();
    sendHeartbeat();

    // Set up polling every 5 seconds (reduced frequency)
    const leaderboardInterval = setInterval(updateLeaderboard, 5000);
    const heartbeatInterval = setInterval(sendHeartbeat, 60000); // Heartbeat every 60 seconds

    return () => {
      clearInterval(leaderboardInterval);
      clearInterval(heartbeatInterval);
    };
  }, [isLoading, balance, gameHistory, playerLevel, playerAvatar, isPlaying]);

  const handlePlay = useCallback((bet: number) => {
    if (bet > balance || bet <= 0) return;
    
    setIsPlaying(true);
    setBalance(prev => prev - bet);
  }, [balance]);

  const handleGameResult = useCallback((multiplier: number, bet: number) => {
    const win = bet * multiplier;
    
    setBalance(prev => prev + win);
    
    const result = {
      bet,
      multiplier,
      win,
      timestamp: Date.now()
    };
    
    // Update game history and calculate stats with the new result included
    setGameHistory(prev => {
      const updatedHistory = [result, ...prev.slice(0, 49)];
      
      // Calculate stats with updated history
      const totalWagered = updatedHistory.reduce((sum, r) => sum + r.bet, 0);
      const totalWins = updatedHistory.filter(r => r.win > 0).length;
      const biggestWin = updatedHistory.length > 0 ? Math.max(...updatedHistory.map(r => r.win)) : 0;
      
      // Calculate updated values for leaderboard
      const updatedBalance = balance + win;
      
      // Immediately update leaderboard with game result
      fetch('/api/plin-go/leaderboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          balance: updatedBalance,
          wins: totalWins,
          totalWagered,
          biggestWin,
          level: playerLevel,
          avatar: playerAvatar,
          isPlaying: true
        })
      })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          setLeaderboard(data.leaderboard);
        }
      })
      .catch(error => {
        // Silent error handling for production
      });
      
      return updatedHistory;
    });
    
    setIsPlaying(false);
  }, [balance, playerLevel, playerAvatar]);

  const handleAutoPlay = useCallback(() => {
    if (isAutoPlaying) {
      setIsAutoPlaying(false);
      return;
    }

    setIsAutoPlaying(true);
    let ballsPlayed = 0;
    
    const playNextBall = () => {
      if (!isAutoPlaying) return;
      
      if (ballsPlayed >= autoPlaySettings.balls) {
        setIsAutoPlaying(false);
        return;
      }
      
      if (autoPlaySettings.stopOnLoss && balance < autoPlaySettings.stopAmount) {
        setIsAutoPlaying(false);
        return;
      }
      
      if (betAmount > balance) {
        setIsAutoPlaying(false);
        return;
      }
      
      handlePlay(betAmount);
      ballsPlayed++;
      
      const speed = turboMode ? 1000 : 2000;
      setTimeout(playNextBall, speed / autoPlaySettings.speed);
    };
    
    playNextBall();
  }, [isAutoPlaying, autoPlaySettings, balance, betAmount, handlePlay, turboMode]);

  // Auto-play effect
  useEffect(() => {
    if (isAutoPlaying && !isPlaying && betAmount > 0 && betAmount <= balance) {
      const timer = setTimeout(() => {
        if (isAutoPlaying) {
          handlePlay(betAmount);
        }
      }, turboMode ? 1000 / autoPlaySettings.speed : 2000 / autoPlaySettings.speed);
      
      return () => clearTimeout(timer);
    }
  }, [isAutoPlaying, isPlaying, betAmount, balance, turboMode, autoPlaySettings.speed, handlePlay]);

  // Update game statistics
  useEffect(() => {
    if (gameHistory.length > 0) {
      const wins = gameHistory.filter(r => r.win > 0).length;
      const totalGames = gameHistory.length;
      const avgMultiplier = gameHistory.reduce((sum, r) => sum + r.multiplier, 0) / totalGames;
      const totalProfit = gameHistory.reduce((sum, r) => sum + r.win - r.bet, 0);
      
      setWinRate((wins / totalGames) * 100);
      setAvgMultiplier(avgMultiplier);
      setProfitLoss(totalProfit);
      
      // Update streak
      const recentGames = gameHistory.slice(0, 5);
      let currentStreak = 0;
      for (let i = 0; i < recentGames.length; i++) {
        if (recentGames[i].win > 0) {
          currentStreak++;
        } else {
          break;
        }
      }
      setStreak(currentStreak);
    }
  }, [gameHistory]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold text-orange-400">Loading Whop Plin-Go...</h2>
          <p className="text-gray-400 mt-2">Connecting to your Whop account</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] text-white overflow-hidden relative">
      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-20 w-2 h-2 bg-blue-400 rounded-full animate-pulse opacity-30"></div>
        <div className="absolute top-40 right-32 w-1 h-1 bg-purple-400 rounded-full animate-ping opacity-40"></div>
        <div className="absolute bottom-32 left-40 w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce opacity-30"></div>
        <div className="absolute top-60 left-1/2 w-1 h-1 bg-green-400 rounded-full animate-pulse opacity-50"></div>
        <div className="absolute top-80 right-20 w-1.5 h-1.5 bg-orange-400 rounded-full animate-ping opacity-60"></div>
        <div className="absolute bottom-60 right-40 w-1 h-1 bg-pink-400 rounded-full animate-bounce opacity-40"></div>
      </div>

      <div className="flex h-screen relative z-10">
        {/* Left Control Panel */}
        <div className="w-64 bg-black/40 backdrop-blur-xl border-r border-white/20 p-2 flex flex-col overflow-y-auto shadow-2xl shadow-black/50">
          <div className="flex-1 space-y-3">
            {/* Header with Whop branding */}
            <div className="text-center mb-3 p-2 bg-gradient-to-r from-orange-500/20 to-red-500/20 rounded-lg border border-orange-500/30">
              <div className="flex items-center justify-center mb-1">
                <div className="w-6 h-6 bg-gradient-to-r from-orange-400 to-red-500 rounded-full mr-2 animate-pulse"></div>
                <h1 className="text-lg font-bold bg-gradient-to-r from-orange-400 via-red-400 to-pink-400 bg-clip-text text-transparent animate-pulse">
                  WHOP PLIN-GO
                </h1>
              </div>
              <p className="text-orange-300 text-xs font-semibold uppercase tracking-wider animate-pulse shadow-[0_0_15px_rgba(249,115,22,0.6)] text-center w-full">Ultimate Casino Experience</p>
            </div>

            {/* Balance with holographic effect */}
            <div className="bg-gradient-to-r from-purple-900/60 to-blue-900/60 rounded-lg p-2 border border-purple-500/40 shadow-lg shadow-purple-500/20">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-bold text-purple-300 uppercase tracking-wider">Balance</span>
                <span className="text-sm font-bold text-green-400 animate-pulse">CA${balance.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-purple-300 uppercase tracking-wider">Points</span>
                <span className="text-sm font-bold text-orange-400 animate-pulse">5,000</span>
              </div>
            </div>

            {/* Jackpot Multiplier */}
            <div className="bg-gradient-to-r from-red-900/60 to-orange-900/60 rounded-lg p-2 border border-red-500/40 shadow-lg shadow-red-500/20">
              <div className="text-center">
                <div className="text-lg font-bold text-red-400 animate-pulse">1000x</div>
                <div className="text-xs text-orange-300 uppercase tracking-wider">Next Big Win</div>
              </div>
            </div>

            {/* Game Mode Toggle */}
            <div>
              <h3 className="text-xs font-bold text-orange-300 mb-1 uppercase tracking-wider">Game Mode</h3>
              <div className="relative flex bg-black/60 rounded-lg p-1 border border-orange-500/40 shadow-[0_0_30px_rgba(249,115,22,0.4)] hover:shadow-[0_0_40px_rgba(249,115,22,0.6)] transition-all duration-300">
                {/* Whop Glow Background */}
                <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-red-500/10 rounded-lg animate-pulse"></div>
                
                <button
                  onClick={() => setIsAutoPlaying(false)}
                  className={`relative z-10 flex-1 py-2 px-3 rounded-md text-xs font-bold transition-all duration-300 ${
                    !isAutoPlaying
                      ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-[0_0_25px_rgba(249,115,22,0.8)] border border-orange-400 animate-pulse'
                      : 'text-gray-300 hover:text-white hover:bg-orange-500/20 hover:scale-105 hover:shadow-[0_0_20px_rgba(249,115,22,0.5)] hover:border hover:border-orange-500/50'
                  }`}
                >
                  Manual
                </button>
                <button
                  onClick={() => {
                    if (isAutoPlaying) {
                      setIsAutoPlaying(false);
                    } else {
                      setIsAutoPlaying(true);
                    }
                  }}
                  className={`relative z-10 flex-1 py-2 px-3 rounded-md text-xs font-bold transition-all duration-300 ${
                    isAutoPlaying
                      ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-[0_0_25px_rgba(249,115,22,0.8)] border border-orange-400 animate-pulse'
                      : 'text-gray-300 hover:text-white hover:bg-orange-500/20 hover:scale-105 hover:shadow-[0_0_20px_rgba(249,115,22,0.5)] hover:border hover:border-orange-500/50'
                  }`}
                >
                  {isAutoPlaying ? 'Auto ON' : 'Auto'}
                </button>
              </div>
            </div>

            {/* Turbo Mode */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-orange-300 uppercase tracking-wider">Turbo Mode</h3>
                <div className="text-xs text-orange-400 font-bold">2x Speed</div>
              </div>
              <div className={`relative rounded-lg transition-all duration-300 ${
                turboMode 
                  ? 'shadow-[0_0_25px_rgba(249,115,22,0.6)] hover:shadow-[0_0_35px_rgba(249,115,22,0.8)]' 
                  : 'shadow-[0_0_10px_rgba(249,115,22,0.2)] hover:shadow-[0_0_20px_rgba(249,115,22,0.4)]'
              }`}>
                {/* Whop Glow Background */}
                <div className={`absolute inset-0 bg-gradient-to-r rounded-lg transition-all duration-300 ${
                  turboMode 
                    ? 'from-orange-500/20 to-red-500/20 animate-pulse' 
                    : 'from-orange-500/5 to-red-500/5'
                }`}></div>
                
                <label className={`relative z-10 flex items-center cursor-pointer group hover:scale-105 transition-all duration-300 rounded-lg p-2 border-2 ${
                  turboMode 
                    ? 'border-orange-400 bg-orange-500/10' 
                    : 'border-orange-500/40 hover:border-orange-400 hover:bg-orange-500/10'
                }`} onClick={() => setTurboMode(!turboMode)}>
                  <div className={`relative w-10 h-5 rounded-full transition-all duration-300 ${
                    turboMode 
                      ? 'bg-gradient-to-r from-orange-400 to-red-500 shadow-[0_0_15px_rgba(249,115,22,0.7)]' 
                      : 'bg-gray-600 group-hover:bg-gray-500'
                  }`}>
                    <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-all duration-300 transform shadow-lg ${
                      turboMode ? 'translate-x-5' : 'translate-x-0'
                    }`}></div>
                  </div>
                  <span className={`ml-3 text-xs transition-colors duration-200 font-bold ${
                    turboMode ? 'text-orange-300' : 'text-white group-hover:text-orange-300'
                  }`}>
                    {turboMode ? 'ON' : 'OFF'}
                  </span>
                </label>
              </div>
            </div>

            {/* Bet Amount */}
            <div>
              <h3 className="text-sm font-bold text-orange-300 mb-2">Bet Amount</h3>
              <div className="relative mb-2 shadow-[0_0_15px_rgba(249,115,22,0.3)] hover:shadow-[0_0_20px_rgba(249,115,22,0.5)] transition-all duration-300 rounded-lg">
                {/* Whop Glow Background */}
                <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 to-red-500/5 rounded-lg"></div>
                
                <input
                  type="number"
                  value={betAmount === 0 ? '' : betAmount}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '') {
                      setBetAmount(0);
                    } else {
                      const numValue = parseFloat(value);
                      if (!isNaN(numValue) && numValue >= 0) {
                        setBetAmount(numValue);
                      }
                    }
                  }}
                  onFocus={(e) => {
                    if (betAmount === 0) {
                      e.target.select();
                    }
                  }}
                  className="relative z-10 w-full bg-black/40 border border-orange-500/30 rounded-lg px-8 py-2 text-white focus:outline-none focus:border-orange-500 focus:shadow-[0_0_20px_rgba(249,115,22,0.6)] text-sm transition-all duration-300"
                  min="0"
                  max={balance}
                  step="0.01"
                  placeholder="0.00"
                />
                <div className="absolute left-3 top-2 text-orange-400 text-sm font-bold z-20">$</div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setBetAmount(Math.floor(betAmount / 2))}
                  className="flex-1 px-3 py-2 bg-orange-500 text-white text-sm rounded-lg hover:bg-orange-400 transition-all duration-200 font-bold shadow-[0_0_10px_rgba(249,115,22,0.4)] hover:shadow-[0_0_15px_rgba(249,115,22,0.6)]"
                >
                  -1/2
                </button>
                <button
                  onClick={() => setBetAmount(Math.min(betAmount * 2, balance))}
                  className="flex-1 px-3 py-2 bg-orange-500 text-white text-sm rounded-lg hover:bg-orange-400 transition-all duration-200 font-bold shadow-[0_0_10px_rgba(249,115,22,0.4)] hover:shadow-[0_0_15px_rgba(249,115,22,0.6)]"
                >
                  2×
                </button>
              </div>
            </div>

            {/* Risk Level */}
            <div>
              <h3 className="text-sm font-bold text-orange-300 mb-2">Risk Level</h3>
              <div className="relative shadow-[0_0_15px_rgba(249,115,22,0.3)] hover:shadow-[0_0_20px_rgba(249,115,22,0.5)] transition-all duration-300 rounded-lg">
                {/* Whop Glow Background */}
                <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 to-red-500/5 rounded-lg"></div>
                
                <select
                  value={riskLevel}
                  onChange={(e) => setRiskLevel(e.target.value as 'low' | 'medium' | 'high')}
                  className="relative z-10 w-full bg-black/40 border border-orange-500/30 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-orange-500 focus:shadow-[0_0_20px_rgba(249,115,22,0.6)] text-sm transition-all duration-300"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>

            {/* Rows */}
            <div>
              <h3 className="text-sm font-bold text-orange-300 mb-2">Rows</h3>
              <div className="relative shadow-[0_0_15px_rgba(249,115,22,0.3)] hover:shadow-[0_0_20px_rgba(249,115,22,0.5)] transition-all duration-300 rounded-lg">
                {/* Whop Glow Background */}
                <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 to-red-500/5 rounded-lg"></div>
                
                <select
                  value={rows}
                  onChange={(e) => setRows(parseInt(e.target.value))}
                  className="relative z-10 w-full bg-black/40 border border-orange-500/30 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-orange-500 focus:shadow-[0_0_20px_rgba(249,115,22,0.6)] text-sm transition-all duration-300"
                >
                  <option value={8}>8</option>
                  <option value={12}>12</option>
                  <option value={16}>16</option>
                </select>
              </div>
            </div>

            {/* Auto Play Settings */}
            {isAutoPlaying && (
              <div className="space-y-1 pt-1 border-t border-white/10">
                <div>
                  <h3 className="text-xs font-bold text-blue-300 mb-1 uppercase tracking-wider">Number of Balls</h3>
                  <input
                    type="number"
                    value={autoPlaySettings.balls}
                    onChange={(e) => setAutoPlaySettings({
                      ...autoPlaySettings,
                      balls: Math.max(1, parseInt(e.target.value) || 1)
                    })}
                    className="w-full bg-black/50 border border-blue-500/30 rounded-md px-2 py-1 text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 hover:border-orange-400 transition-all duration-300 backdrop-blur-sm"
                    min="1"
                    max="100"
                  />
                </div>

                <div>
                  <h3 className="text-xs font-bold text-blue-300 mb-1 uppercase tracking-wider">Speed</h3>
                  <input
                    type="range"
                    min="0.5"
                    max="3"
                    step="0.5"
                    value={autoPlaySettings.speed}
                    onChange={(e) => setAutoPlaySettings({
                      ...autoPlaySettings,
                      speed: parseFloat(e.target.value)
                    })}
                    className="w-full accent-orange-500 hover:accent-orange-400 transition-all duration-300"
                  />
                  <div className="text-center text-xs text-gray-400 font-bold">
                    {autoPlaySettings.speed}x
                  </div>
                </div>

                <div>
                  <label className="flex items-center cursor-pointer group hover:scale-105 transition-all duration-300">
                    <input
                      type="checkbox"
                      checked={autoPlaySettings.stopOnLoss}
                      onChange={(e) => setAutoPlaySettings({
                        ...autoPlaySettings,
                        stopOnLoss: e.target.checked
                      })}
                      className="mr-2 accent-orange-500 hover:accent-orange-400 transition-all duration-300 transform group-hover:scale-110"
                    />
                    <span className="text-xs text-white group-hover:text-orange-300 transition-colors duration-200 font-bold">Stop on Loss</span>
                  </label>
                </div>

                {autoPlaySettings.stopOnLoss && (
                  <div>
                    <h3 className="text-xs font-bold text-red-300 mb-1 uppercase tracking-wider">Stop at Balance</h3>
                    <input
                      type="number"
                      value={autoPlaySettings.stopAmount}
                      onChange={(e) => setAutoPlaySettings({
                        ...autoPlaySettings,
                        stopAmount: Math.max(0, parseInt(e.target.value) || 0)
                      })}
                      className="w-full bg-black/50 border border-red-500/30 rounded-md px-2 py-1 text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-300 backdrop-blur-sm"
                      min="0"
                      max={balance}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bet Button */}
          <div className="mt-3 mb-3">
            <div className={`relative rounded-lg transition-all duration-300 ${
              isPlaying || betAmount > balance || betAmount <= 0
                ? 'shadow-[0_0_10px_rgba(75,85,99,0.3)]'
                : 'shadow-[0_0_25px_rgba(249,115,22,0.6)] hover:shadow-[0_0_35px_rgba(249,115,22,0.8)]'
            }`}>
              {/* Whop Glow Background */}
              <div className={`absolute inset-0 bg-gradient-to-r rounded-lg transition-all duration-300 ${
                isPlaying || betAmount > balance || betAmount <= 0
                  ? 'from-gray-500/5 to-gray-600/5'
                  : 'from-orange-500/20 to-red-500/20 animate-pulse'
              }`}></div>
              
              <button
                onClick={() => handlePlay(betAmount)}
                disabled={isPlaying || betAmount > balance || betAmount <= 0}
                className={`relative z-10 w-full py-3 rounded-lg font-bold text-sm transition-all duration-300 transform hover:scale-105 border-2 ${
                  isPlaying || betAmount > balance || betAmount <= 0
                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed border-gray-500'
                    : 'bg-orange-500 text-white hover:bg-orange-400 hover:shadow-[0_0_30px_rgba(249,115,22,0.8)] active:scale-95 border-orange-400 hover:border-orange-300'
                }`}
              >
                {isPlaying ? 'Playing...' : 'BET NOW'}
              </button>
            </div>
          </div>
        </div>

        {/* Center Game Area */}
        <div className="flex-1 flex flex-col">
          {/* Game Area */}
          <div className="flex-1 p-2">
            <PlinGoGame
              rows={rows}
              riskLevel={riskLevel}
              isPlaying={isPlaying}
              onGameResult={handleGameResult}
              betAmount={betAmount}
              selectedSkin={selectedSkin}
            />
          </div>

          {/* Enhanced Stats Panel */}
          <div className="h-32 bg-black/40 backdrop-blur-xl border-t border-white/20 p-4 shadow-lg shadow-black/50">
            <div className="grid grid-cols-4 gap-4 h-full">
              <div className="text-center">
                <div className="text-xs text-orange-300 uppercase tracking-wider font-bold">Win Rate</div>
                <div className="text-lg font-bold text-green-400">{winRate.toFixed(1)}%</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-orange-300 uppercase tracking-wider font-bold">Avg Multiplier</div>
                <div className="text-lg font-bold text-yellow-400">{avgMultiplier.toFixed(1)}x</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-orange-300 uppercase tracking-wider font-bold">Streak</div>
                <div className="text-lg font-bold text-blue-400">{streak}W</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-orange-300 uppercase tracking-wider font-bold">P/L</div>
                <div className={`text-lg font-bold ${profitLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  CA${profitLoss.toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Leaderboard & Skins */}
        <div className="w-56 bg-black/40 backdrop-blur-xl border-l border-white/20 p-2 flex flex-col overflow-y-auto shadow-2xl shadow-black/50">
          {/* Enhanced Leaderboard */}
          <div className="mb-3">
            <h3 className="text-sm font-bold text-orange-300 mb-2 uppercase tracking-wider">Live Players</h3>
            {leaderboardError && (
              <div className="text-red-400 text-xs mb-2 p-2 bg-red-900/20 rounded border border-red-500/30">
                ⚠️ {leaderboardError}
              </div>
            )}
            <div className="space-y-2">
              {leaderboard.map((player, index) => (
                <div 
                  key={index} 
                  className="bg-gradient-to-r from-purple-900/40 to-blue-900/40 rounded-lg p-2 border border-purple-500/30 hover:from-orange-900/40 hover:to-red-900/40 hover:border-orange-500/40 hover:scale-105 transition-all duration-300 cursor-pointer group shadow-lg"
                  onClick={() => {
                    if (player.whopUsername) {
                      // Navigate to actual Whop profile
                      window.open(`https://whop.com/${player.whopUsername}`, '_blank');
                    } else {
                      // For anonymous users, show their stats
                      alert(`${player.name}\nBalance: CA$${player.balance.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\nWins: ${player.wins}\nBiggest Win: CA$${(player.biggestWin || 0).toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
                    }
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                        index === 0 ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/50' :
                        index === 1 ? 'bg-gray-400 text-black shadow-lg shadow-gray-400/50' :
                        index === 2 ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/50' :
                        'bg-gray-600 text-white'
                      }`}>
                        {index + 1}
                      </div>
                      {/* Whop Profile Picture */}
                      <div className="w-6 h-6 rounded-full overflow-hidden border-2 border-orange-500/50 shadow-lg">
                        {player.whopAvatarUrl ? (
                          <img 
                            src={player.whopAvatarUrl}
                            alt={`${player.whopUsername || player.name}'s avatar`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              // Fallback to generated avatar if Whop avatar fails to load
                              e.currentTarget.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${player.whopUsername || player.name}&backgroundColor=ff6b35,ff8e53&radius=50`;
                            }}
                          />
                        ) : (
                          <img 
                            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${player.whopUsername || player.name}&backgroundColor=ff6b35,ff8e53&radius=50`}
                            alt={`${player.whopUsername || player.name}'s avatar`}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white group-hover:text-orange-300 transition-colors duration-200 flex items-center">
                          {player.whopUsername ? `@${player.whopUsername}` : player.name}
                          <span className="ml-1 text-green-400">●</span>
                        </div>
                        <div className="text-xs text-gray-400 group-hover:text-orange-200 transition-colors duration-200">Level {player.level}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-orange-400 group-hover:text-orange-300 transition-colors duration-200">CA${player.balance.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                      <div className="text-xs text-gray-400 group-hover:text-orange-200 transition-colors duration-200">balance</div>
                    </div>
                  </div>
                  {/* Additional stats on hover */}
                  <div className="mt-2 pt-2 border-t border-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400 group-hover:text-orange-200">Wins: {player.wins}</span>
                      <span className="text-gray-400 group-hover:text-orange-200">Best: CA${(player.biggestWin || 0).toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Enhanced Skins */}
          <div className="flex-1">
            <h3 className="text-sm font-bold text-orange-300 mb-2 uppercase tracking-wider">Board Skins</h3>
            <div className="grid grid-cols-2 gap-2">
              {skins.map((skin) => (
                <button
                  key={skin.id}
                  onClick={() => setSelectedSkin(skin.id)}
                  className={`p-2 rounded-lg text-xs font-bold transition-all duration-300 ${
                    selectedSkin === skin.id
                      ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-2xl shadow-orange-500/60 animate-pulse'
                      : 'bg-gradient-to-r from-gray-600 to-gray-700 text-white hover:from-orange-500 hover:to-red-500 hover:scale-105 hover:shadow-2xl hover:shadow-orange-500/40 border border-gray-500/50'
                  }`}
                >
                  <div className="text-sm mb-1">🎨</div>
                  <div className="text-xs font-semibold">{skin.name}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
