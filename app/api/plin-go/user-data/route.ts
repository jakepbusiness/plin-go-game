import { NextRequest, NextResponse } from 'next/server';
import { whopSdk } from '@/lib/whop-sdk';
import { headers } from 'next/headers';

// In-memory storage for demo purposes (in production, use a database)
const userGameData = new Map<string, {
  userId: string;
  whopUsername?: string;
  balance: number;
  gameHistory: Array<{
    bet: number;
    multiplier: number;
    win: number;
    timestamp: number;
  }>;
  playerName: string;
  selectedSkin: string;
  playerAvatar: string;
  playerLevel: number;
  streak: number;
  winRate: number;
  avgMultiplier: number;
  profitLoss: number;
}>();

export async function GET(request: NextRequest) {
  try {
    const headersList = await headers();
    let userId = 'anonymous';
    let username = 'Anonymous';
    let name = 'Anonymous Player';
    
    try {
      const { userId: whopUserId } = await whopSdk.verifyUserToken(headersList);
      userId = whopUserId;
      
      // Get user info from Whop
      const user = await whopSdk.users.getUser({ userId });
      username = user.username;
      name = user.name || user.username;
      console.log(`Authenticated Whop user: ${username} (${userId})`);
    } catch (authError) {
      // If no valid token, use anonymous user
      console.log('No valid Whop token, using anonymous user');
    }
    
    const userData = userGameData.get(userId) || {
      userId,
      whopUsername: userId === 'anonymous' ? undefined : username,
      balance: 1000000, // Starting balance
      gameHistory: [],
      playerName: userId === 'anonymous' ? 'Anonymous Player' : name,
      selectedSkin: 'cyberpunk',
      playerAvatar: 'default',
      playerLevel: 1,
      streak: 0,
      winRate: 0,
      avgMultiplier: 0,
      profitLoss: 0
    };
    
    return NextResponse.json(userData);
  } catch (error) {
    console.error('Error fetching user data:', error);
    return NextResponse.json({ error: 'Failed to fetch user data' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const headersList = await headers();
    let userId = 'anonymous';
    let username = 'Anonymous';
    let name = 'Anonymous Player';
    
    try {
      const { userId: whopUserId } = await whopSdk.verifyUserToken(headersList);
      userId = whopUserId;
      
      // Get user info from Whop
      const user = await whopSdk.users.getUser({ userId });
      username = user.username;
      name = user.name || user.username;
      console.log(`Updating data for Whop user: ${username} (${userId})`);
    } catch (authError) {
      // If no valid token, use anonymous user
      console.log('No valid Whop token, using anonymous user');
    }
    
    const body = await request.json();
    const {
      balance,
      gameHistory,
      playerName,
      selectedSkin,
      playerAvatar,
      playerLevel,
      streak,
      winRate,
      avgMultiplier,
      profitLoss
    } = body;
    
    const updatedData = {
      userId,
      whopUsername: userId === 'anonymous' ? undefined : username,
      balance: balance || 1000000,
      gameHistory: gameHistory || [],
      playerName: playerName || (userId === 'anonymous' ? 'Anonymous Player' : name),
      selectedSkin: selectedSkin || 'cyberpunk',
      playerAvatar: playerAvatar || 'default',
      playerLevel: playerLevel || 1,
      streak: streak || 0,
      winRate: winRate || 0,
      avgMultiplier: avgMultiplier || 0,
      profitLoss: profitLoss || 0
    };
    
    userGameData.set(userId, updatedData);
    
    return NextResponse.json({ success: true, userData: updatedData });
  } catch (error) {
    console.error('Error updating user data:', error);
    return NextResponse.json({ error: 'Failed to update user data' }, { status: 200 });
  }
}
