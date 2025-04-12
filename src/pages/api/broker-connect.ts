import { NextApiRequest, NextApiResponse } from 'next';
import { clerkClient } from "@clerk/nextjs/server";
import { getAuth } from '@clerk/nextjs/server';

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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Get authenticated user
        const { userId } = getAuth(req);

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { brokerId } = req.body;

        if (!brokerId || !SUPPORTED_BROKERS[brokerId]) {
            return res.status(400).json({ error: 'Invalid broker specified' });
        }

        const broker = SUPPORTED_BROKERS[brokerId];

        // Get the API key from environment variables based on broker
        const apiKey = process.env[`${brokerId}_API_KEY`];

        if (!apiKey) {
            return res.status(500).json({ error: 'Broker API key not configured' });
        }

        // Create authorization URL
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const callbackUrl = `${baseUrl}${broker.callbackUrl}?brokerId=${brokerId}&userId=${userId}`;

        const authUrl = new URL(broker.authUrl);
        authUrl.searchParams.append(broker.apiKeyParam, apiKey);
        authUrl.searchParams.append('redirect_uri', callbackUrl);
        authUrl.searchParams.append('response_type', 'code');

        // Add user metadata to track connection attempt
        await clerkClient().then(client => client.users.updateUserMetadata(userId, {
            publicMetadata: {
                brokerConnectAttempt: {
                    broker: brokerId,
                    timestamp: new Date().toISOString()
                }
            }
        }));

        // Return the authorization URL for the frontend to redirect to
        return res.status(200).json({ authUrl: authUrl.toString() });

    } catch (error) {
        console.error('Error initiating broker connection:', error);
        return res.status(500).json({ error: 'Failed to connect to broker' });
    }
} 