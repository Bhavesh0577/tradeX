import { NextApiRequest, NextApiResponse } from 'next';
import { clerkClient } from "@clerk/nextjs/server";

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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    // This should be a GET request from the broker's OAuth callback
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { code, brokerId, userId } = req.query;

        if (!code || !brokerId || !userId || Array.isArray(code) || Array.isArray(brokerId) || Array.isArray(userId)) {
            return res.status(400).json({ error: 'Missing required parameters' });
        }

        // Exchange authorization code for access token
        const tokenResponse = await getAccessToken(brokerId, code);

        if (!tokenResponse.access_token) {
            throw new Error('Failed to get access token');
        }

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

        // Redirect back to the app
        res.redirect(302, '/trading/automated');

    } catch (error) {
        console.error('Error processing broker callback:', error);
        // Redirect to error page
        res.redirect(302, '/trading/error?message=Failed to connect broker');
    }
} 