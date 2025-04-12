import { NextRequest, NextResponse } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';

// Function to exchange auth code for token with broker APIs
async function getAccessToken(brokerId: string, code: string): Promise<any> {
    // Different implementation based on broker
    switch (brokerId) {
        case 'ZERODHA':
            const zerodhaResponse = await fetch('https://api.kite.trade/session/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'X-Kite-Version': '3'
                },
                body: new URLSearchParams({
                    api_key: process.env.ZERODHA_API_KEY || '',
                    request_token: code,
                    api_secret: process.env.ZERODHA_API_SECRET || ''
                })
            });

            return zerodhaResponse.json();

        case 'UPSTOX':
            const upstoxResponse = await fetch('https://api.upstox.com/v2/login/authorization/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    code: code,
                    client_id: process.env.UPSTOX_API_KEY || '',
                    client_secret: process.env.UPSTOX_API_SECRET || '',
                    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/broker-callback`,
                    grant_type: 'authorization_code'
                })
            });

            return upstoxResponse.json();

        case 'ANGELONE':
            const angelResponse = await fetch('https://apiconnect.angelbroking.com/rest/auth/angelbroking/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    code: code,
                    client_id: process.env.ANGELONE_API_KEY || '',
                    client_secret: process.env.ANGELONE_API_SECRET || '',
                    grant_type: 'authorization_code'
                })
            });

            return angelResponse.json();

        default:
            throw new Error(`Unsupported broker: ${brokerId}`);
    }
}

// Function to send real-time notification to other devices
async function notifyOtherDevices(userId: string, message: string): Promise<void> {
    // In a real app, you would use a service like Pusher, Socket.io, etc.
    // For this demo, we'll simulate it
    console.log(`[NOTIFICATION] User ${userId}: ${message}`);
}

export async function GET(request: NextRequest) {
    try {
        // Extract query parameters
        const searchParams = request.nextUrl.searchParams;
        const code = searchParams.get('code');
        const brokerId = searchParams.get('brokerId');
        const userId = searchParams.get('userId');
        const sessionId = searchParams.get('sessionId');

        if (!code || !brokerId || !userId || !sessionId) {
            return NextResponse.redirect(new URL('/trading/error?message=Missing required parameters', request.url));
        }

        // Exchange authorization code for access token
        const tokenResponse = await getAccessToken(brokerId, code);

        if (!tokenResponse.access_token) {
            return NextResponse.redirect(new URL('/trading/error?message=Failed to get access token', request.url));
        }

        // Update the session status
        await clerkClient().then(client => client.users.updateUserMetadata(userId, {
            privateMetadata: {
                brokerSessions: {
                    [sessionId]: {
                        status: 'completed',
                        completedAt: new Date().toISOString()
                    }
                }
            }
        }));

        // Store the token in user metadata (encrypted in a real production system)
        await clerkClient().then(client => client.users.updateUserMetadata(userId, {
            privateMetadata: {
                brokerTokens: {
                    [brokerId]: {
                        accessToken: tokenResponse.access_token,
                        refreshToken: tokenResponse.refresh_token || null,
                        expiresAt: tokenResponse.expires_in
                            ? new Date(Date.now() + tokenResponse.expires_in * 1000).toISOString()
                            : null
                    }
                }
            },
            publicMetadata: {
                connectedBrokers: {
                    [brokerId]: {
                        connected: true,
                        connectedAt: new Date().toISOString()
                    }
                }
            }
        }));

        // Send notification to other devices about successful connection
        await notifyOtherDevices(userId, `${brokerId} broker connected successfully`);

        // Redirect based on device type
        const userAgent = request.headers.get('user-agent') || '';
        const isMobile = /iPhone|iPad|iPod|Android/i.test(userAgent);

        if (isMobile) {
            // For mobile, try to open the app via deep link if possible
            const appDeepLink = `tradex://broker-connected?status=success&broker=${brokerId}`;

            // Use JavaScript to attempt opening the app, and fall back to web if it fails
            return new NextResponse(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>Broker Connected</title>
            <script>
              // Try to open the app
              window.location.href = "${appDeepLink}";
              
              // If app doesn't open within 1 second, redirect to web
              setTimeout(function() {
                window.location.href = "${process.env.NEXT_PUBLIC_APP_URL}/trading/automated";
              }, 1000);
            </script>
          </head>
          <body>
            <p>Redirecting back to the app...</p>
          </body>
        </html>
      `, {
                headers: {
                    'Content-Type': 'text/html',
                },
            });
        } else {
            // For desktop browsers, redirect to the automated trading page
            return NextResponse.redirect(new URL('/trading/automated', request.url));
        }

    } catch (error) {
        console.error('Error processing broker callback:', error);
        // Redirect to error page
        return NextResponse.redirect(new URL('/trading/error?message=Failed to connect broker', request.url));
    }
} 