import { NextRequest, NextResponse } from 'next/server';
import { whopSdk } from '@/lib/whop-sdk';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  try {
    
    // Handle sample users for testing
    if (userId.startsWith('whop_user_')) {
      const sampleUsernames: { [key: string]: string } = {
        'whop_user_1': 'jake_plingo',
        'whop_user_2': 'sarah_casino',
        'whop_user_3': 'mike_winner'
      };
      const username = sampleUsernames[userId] || userId;
      console.log('Sample user avatar requested:', username);
      return NextResponse.redirect(`https://api.dicebear.com/7.x/avataaars/svg?seed=${username}&backgroundColor=ff6b35,ff8e53&radius=50`);
    }
    
    // Try to get user info from Whop SDK first
    try {
      const user = await whopSdk.users.getUser({ userId });
      console.log('User found:', user.username);
      // Use the username for avatar generation to make it more consistent
      return NextResponse.redirect(`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}&backgroundColor=ff6b35,ff8e53&radius=50`);
    } catch (userError) {
      console.log('User not found, using generated avatar with userId');
      return NextResponse.redirect(`https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}&backgroundColor=ff6b35,ff8e53&radius=50`);
    }
    
  } catch (error) {
    console.error('Error in avatar endpoint:', error);
    // Return a default avatar on error
    return NextResponse.redirect('https://api.dicebear.com/7.x/avataaars/svg?seed=default&backgroundColor=ff6b35,ff8e53&radius=50');
  }
}
