import { NextRequest, NextResponse } from 'next/server';
import { getAuth, clerkClient } from '@clerk/nextjs/server';

// Define the supported brokers and their configurations
const SUPPORTED_BROKERS = {
    ZERODHA: {
        name: 'Zerodha',
        authUrl: 'https://kite.zerodha.com/connect/login',
        apiKeyParam: 'api_key',
        callbackUrl: '/api/broker-callback',
    },
    UPSTOX: {
        name: 'Upstox',
        authUrl: 'https://api.upstox.com/v2/login/authorization',
        apiKeyParam: 'apiKey',
        callbackUrl: '/api/broker-callback',
    },
    ANGELONE: {
        name: 'Angel One',
        authUrl: 'https://smartapi.angelbroking.com/oauth',
        apiKeyParam: 'api_key',
        callbackUrl: '/api/broker-callback',
    },
};

export async function POST(request: NextRequest) {
    try {
        // Get authenticated user
        const { userId } = getAuth(request);

        if (!userId) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Parse request body
        const body = await request.json();
        const { brokerId } = body;

        if (!brokerId || !SUPPORTED_BROKERS[brokerId]) {
            return NextResponse.json(
                { error: 'Invalid broker specified' },
                { status: 400 }
            );
        }

        const broker = SUPPORTED_BROKERS[brokerId];

        // Get the API key from environment variables based on broker
        const apiKey = process.env[`${brokerId}_API_KEY`];

        if (!apiKey) {
            return NextResponse.json(
                { error: 'Broker API key not configured' },
                { status: 500 }
            );
        }

        // Create a unique session ID for this connection attempt
        const sessionId = `${userId}-${Date.now()}`;

        // Create authorization URL
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const callbackUrl = `${baseUrl}${broker.callbackUrl}?brokerId=${brokerId}&userId=${userId}&sessionId=${sessionId}`;

        const authUrl = new URL(broker.authUrl);
        authUrl.searchParams.append(broker.apiKeyParam, apiKey);
        authUrl.searchParams.append('redirect_uri', callbackUrl);
        authUrl.searchParams.append('response_type', 'code');

        // Generate a deep link for mobile apps if applicable
        let mobileDeepLink: string | undefined = undefined;

        if (brokerId === 'ZERODHA') {
            mobileDeepLink = `kite://login?api_key=${apiKey}&redirect_uri=${encodeURIComponent(callbackUrl)}`;
        } else if (brokerId === 'UPSTOX') {
            mobileDeepLink = `upstox://login?apiKey=${apiKey}&redirect_uri=${encodeURIComponent(callbackUrl)}`;
        }

        // Add user metadata to track connection attempt
        const clerk = await clerkClient();
        await clerk.users.updateUserMetadata(userId, {
            publicMetadata: {
                brokerConnectAttempt: {
                    broker: brokerId,
                    timestamp: new Date().toISOString(),
                    sessionId
                }
            }
        });

        // Store session data for cross-device synchronization
        // In a real app, you'd use a database like Redis for this
        // For this demo, we'll use Clerk's metadata
        await clerkClient().then(client => client.users.updateUserMetadata(userId, {
            privateMetadata: {
                brokerSessions: {
                    [sessionId]: {
                        broker: brokerId,
                        status: 'pending',
                        timestamp: new Date().toISOString()
                    }
                }
            }
        }));

        // Return the authorization URLs for web and mobile
        return NextResponse.json({
            authUrl: authUrl.toString(),
            mobileDeepLink,
            sessionId
        });

    } catch (error) {
        console.error('Error initiating broker connection:', error);
        return NextResponse.json(
            { error: 'Failed to connect to broker' },
            { status: 500 }
        );
    }
} 