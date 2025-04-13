import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import autoTrader from '@/lib/trading/autoTrader';
import { getUserMetadata, updateUserMetadata } from '@/lib/auth/user-metadata';

// API route for AutoTrader control
export async function GET(req: NextRequest) {
    try {
        const { userId } = getAuth(req);

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get user metadata to check if they have premium access
        const metadata = await getUserMetadata(userId);

        if (!metadata.isPremiumUser) {
            return NextResponse.json(
                { error: 'Premium subscription required for automated trading' },
                { status: 403 }
            );
        }

        // Return the current status of the AutoTrader
        return NextResponse.json(autoTrader.getStatus());
    } catch (error: any) {
        console.error('Error in GET /api/auto-trader:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}

// API route to control the AutoTrader
export async function POST(req: NextRequest) {
    try {
        const { userId } = getAuth(req);

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get user metadata to check if they have premium access
        const metadata = await getUserMetadata(userId);

        if (!metadata.isPremiumUser) {
            return NextResponse.json(
                { error: 'Premium subscription required for automated trading' },
                { status: 403 }
            );
        }

        // Parse the request body
        const body = await req.json();
        const { action, config } = body;

        if (!action) {
            return NextResponse.json(
                { error: 'Action is required' },
                { status: 400 }
            );
        }

        // Handle different actions
        switch (action) {
            case 'start':
                if (!autoTrader.getStatus().isRunning) {
                    // Initialize with user's configuration if not already initialized
                    if (config) {
                        autoTrader.updateConfig(config);
                    }

                    // Start the AutoTrader
                    const started = await autoTrader.initialize();
                    if (!started) {
                        return NextResponse.json(
                            { error: 'Failed to start AutoTrader' },
                            { status: 500 }
                        );
                    }

                    // Update user metadata with AutoTrader status
                    await updateUserMetadata(userId, {
                        autoTraderEnabled: true,
                        autoTraderConfig: autoTrader.getStatus().config
                    });
                }
                break;

            case 'stop':
                if (autoTrader.getStatus().isRunning) {
                    autoTrader.stop();

                    // Update user metadata with AutoTrader status
                    await updateUserMetadata(userId, {
                        autoTraderEnabled: false
                    });
                }
                break;

            case 'update':
                if (config) {
                    autoTrader.updateConfig(config);

                    // Update user metadata with AutoTrader config
                    await updateUserMetadata(userId, {
                        autoTraderConfig: autoTrader.getStatus().config
                    });
                } else {
                    return NextResponse.json(
                        { error: 'Config is required for update action' },
                        { status: 400 }
                    );
                }
                break;

            case 'addSymbols':
                if (body.symbols && Array.isArray(body.symbols)) {
                    autoTrader.addSymbols(body.symbols);

                    // Update user metadata with AutoTrader config
                    await updateUserMetadata(userId, {
                        autoTraderConfig: autoTrader.getStatus().config
                    });
                } else {
                    return NextResponse.json(
                        { error: 'Symbols array is required for addSymbols action' },
                        { status: 400 }
                    );
                }
                break;

            case 'removeSymbol':
                if (body.symbol) {
                    autoTrader.removeSymbol(body.symbol);

                    // Update user metadata with AutoTrader config
                    await updateUserMetadata(userId, {
                        autoTraderConfig: autoTrader.getStatus().config
                    });
                } else {
                    return NextResponse.json(
                        { error: 'Symbol is required for removeSymbol action' },
                        { status: 400 }
                    );
                }
                break;

            default:
                return NextResponse.json(
                    { error: `Unknown action: ${action}` },
                    { status: 400 }
                );
        }

        // Return the updated status
        return NextResponse.json(autoTrader.getStatus());
    } catch (error: any) {
        console.error('Error in POST /api/auto-trader:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
} 