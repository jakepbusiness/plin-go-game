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
}>();

// Track active players (online in last 5 minutes)
const ACTIVE_TIMEOUT = 5 * 60 * 1000; // 5 minutes

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
    lastActivity: Date.now()
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
    lastActivity: Date.now()
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
    lastActivity: Date.now() - 10 * 60 * 1000 // 10 minutes ago
  }
];

// Initialize with sample data
sampleUsers.forEach(user => {
  leaderboardData.set(user.userId, user);
});

export async function GET(request: NextRequest) {
  try {
    const now = Date.now();
    
    // Get only active players (online in last 5 minutes) sorted by points
    const activePlayers = Array.from(leaderboardData.values())
      .filter(player => {
        const isActive = (now - player.lastActivity) < ACTIVE_TIMEOUT;
        // Update online status
        if (player.isOnline !== isActive) {
          player.isOnline = isActive;
        }
        return isActive;
      })
      .sort((a, b) => b.points - a.points)
      .slice(0, 10);
    
    console.log('Active leaderboard data:', activePlayers.length, 'players online');
    activePlayers.forEach((player, index) => {
      console.log(`${index + 1}. ${player.whopUsername || player.name} - ${player.points} points (${player.isOnline ? '🟢' : '🔴'})`);
    });
    
    return NextResponse.json({ leaderboard: activePlayers });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return NextResponse.json({ leaderboard: [] }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const headersList = await headers();
    let userId = 'anonymous';
    let username = 'Anonymous';
    let name = 'Anonymous Player';
    
    let whopAvatarUrl: string | undefined;
    
    try {
      const { userId: whopUserId } = await whopSdk.verifyUserToken(headersList);
      userId = whopUserId;
      
      // Get user info from Whop
      const user = await whopSdk.users.getUser({ userId });
      username = user.username;
      name = user.name || user.username;
      
      // Get user's Whop profile picture URL through our proxy
      whopAvatarUrl = `/api/plin-go/avatar/${userId}`;
    } catch (authError) {
      // If no valid token, use anonymous user
      console.log('No valid Whop token, using anonymous user');
    }
    
    const body = await request.json();
    const { points, balance, wins, totalWagered, biggestWin, level, avatar } = body;
    
    // Update or create user data
    const existingData = leaderboardData.get(userId);
    const now = Date.now();
    const updatedData = {
      userId,
      username,
      whopUsername: userId === 'anonymous' ? undefined : username,
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
      lastActivity: now
    };
    
    leaderboardData.set(userId, updatedData);
    
    // Get updated leaderboard
    const topPlayers = Array.from(leaderboardData.values())
      .sort((a, b) => b.points - a.points)
      .slice(0, 10);
    
    return NextResponse.json({ 
      success: true, 
      leaderboard: topPlayers,
      userData: updatedData
    });
  } catch (error) {
    console.error('Error updating leaderboard:', error);
    return NextResponse.json({ error: 'Failed to update leaderboard' }, { status: 200 });
  }
}
