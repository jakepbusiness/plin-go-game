import { NextRequest, NextResponse } from 'next/server';
import { whopSdk } from '@/lib/whop-sdk';
import { headers } from 'next/headers';

// In-memory storage for demo purposes (in production, use a database)
const leaderboardData = new Map<string, {
  userId: string;
  username: string;
  whopUsername?: string;
  name: string;
  points: number;
  balance: number;
  wins: number;
  totalWagered: number;
  biggestWin: number;
  level: number;
  avatar: string;
  whopAvatarUrl?: string;
  lastUpdated: number;
  isOnline: boolean;
  lastActivity: number;
  isPlaying: boolean; // Track if player is actively playing
}>();

// Track active players (online in last 2 minutes for more live feel)
const ACTIVE_TIMEOUT = 2 * 60 * 1000; // 2 minutes

// Add some sample data for testing
const sampleUsers = [
  {
    userId: 'whop_user_1',
    username: 'whop_user_1',
    whopUsername: 'jake_plingo',
    name: 'Jake PlinGo',
    points: 25000,
    balance: 500000,
    wins: 15,
    totalWagered: 1000000,
    biggestWin: 50000,
    level: 5,
    avatar: 'cyberpunk',
    whopAvatarUrl: '/api/plin-go/avatar/whop_user_1',
    lastUpdated: Date.now(),
    isOnline: true,
    lastActivity: Date.now(),
    isPlaying: true
  },
  {
    userId: 'whop_user_2',
    username: 'whop_user_2',
    whopUsername: 'sarah_casino',
    name: 'Sarah Casino',
    points: 18000,
    balance: 300000,
    wins: 12,
    totalWagered: 800000,
    biggestWin: 35000,
    level: 4,
    avatar: 'golden',
    whopAvatarUrl: '/api/plin-go/avatar/whop_user_2',
    lastUpdated: Date.now(),
    isOnline: true,
    lastActivity: Date.now(),
    isPlaying: true
  },
  {
    userId: 'whop_user_3',
    username: 'whop_user_3',
    whopUsername: 'mike_winner',
    name: 'Mike Winner',
    points: 12000,
    balance: 200000,
    wins: 8,
    totalWagered: 600000,
    biggestWin: 25000,
    level: 3,
    avatar: 'neon',
    whopAvatarUrl: '/api/plin-go/avatar/whop_user_3',
    lastUpdated: Date.now(),
    isOnline: false,
    lastActivity: Date.now() - 10 * 60 * 1000, // 10 minutes ago
    isPlaying: false
  }
];

// Initialize with sample data
sampleUsers.forEach(user => {
  leaderboardData.set(user.userId, user);
});

export async function GET(request: NextRequest) {
  try {
    const now = Date.now();
    
    // Get only active players (online in last 2 minutes) sorted by points
    const allPlayers = Array.from(leaderboardData.values());
    const activePlayers = allPlayers
      .filter(player => {
        const isActive = (now - player.lastActivity) < ACTIVE_TIMEOUT;
        // Update online status
        if (player.isOnline !== isActive) {
          player.isOnline = isActive;
        }
        return isActive;
      })
      .sort((a, b) => b.points - a.points);
    
    // Safe slice operation with type check
    const topPlayers = Array.isArray(activePlayers) ? activePlayers.slice(0, 10) : [];
    
    return NextResponse.json({ leaderboard: topPlayers });
  } catch (error) {
    return NextResponse.json({ leaderboard: [] }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const headersList = await headers();
    let userId = 'anonymous';
    let username = 'Anonymous';
    let name = 'Anonymous Player';
    let whopUsername: string | undefined;
    
    let whopAvatarUrl: string | undefined;
    
    try {
      const { userId: whopUserId } = await whopSdk.verifyUserToken(headersList);
      userId = whopUserId;
      
      // Get user info from Whop
      const user = await whopSdk.users.getUser({ userId });
      username = user.username;
      name = user.name || user.username;
      whopUsername = user.username; // Only show Whop username when actively playing
      
      // Get user's Whop profile picture URL through our proxy
      whopAvatarUrl = `/api/plin-go/avatar/${userId}`;
    } catch (authError) {
      // If no valid token, use anonymous user
      // Silent error handling for production
    }
    
    const body = await request.json();
    const { points, balance, wins, totalWagered, biggestWin, level, avatar, isPlaying = true } = body;
    
    // Update or create user data
    const existingData = leaderboardData.get(userId);
    const now = Date.now();
    const updatedData = {
      userId,
      username,
      whopUsername: isPlaying ? whopUsername : undefined, // Only show Whop username when playing
      name,
      points: Math.max(points, existingData?.points || 0), // Keep highest score
      balance: Math.max(balance, existingData?.balance || 0), // Keep highest balance
      wins: Math.max(wins, existingData?.wins || 0),
      totalWagered: Math.max(totalWagered, existingData?.totalWagered || 0),
      biggestWin: Math.max(biggestWin, existingData?.biggestWin || 0),
      level: Math.max(level, existingData?.level || 1),
      avatar: avatar || existingData?.avatar || 'default',
      whopAvatarUrl: whopAvatarUrl || existingData?.whopAvatarUrl,
      lastUpdated: now,
      isOnline: true,
      lastActivity: now,
      isPlaying: isPlaying // Track if player is actively playing
    };
    
    leaderboardData.set(userId, updatedData);
    
    // Get updated leaderboard with safe slice operation
    const allPlayers = Array.from(leaderboardData.values());
    const sortedPlayers = allPlayers.sort((a, b) => b.points - a.points);
    const topPlayers = Array.isArray(sortedPlayers) ? sortedPlayers.slice(0, 10) : [];
    
    return NextResponse.json({ 
      success: true, 
      leaderboard: topPlayers,
      userData: updatedData
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update leaderboard' }, { status: 200 });
  }
}
