import { NextRequest, NextResponse } from 'next/server';
import { mockTradingBotResponse, generatePerformanceChartData } from '@/lib/trading/mockTradingData';

// Maintain state between requests for consistent demo
interface BotState {
    isRunning: boolean;
    lastConfigUpdate: Date | null;
    startTime: Date | null;
    stopTime: Date | null;
}

let botState: BotState = {
    isRunning: false,
    lastConfigUpdate: null,
    startTime: null,
    stopTime: null
};

export async function GET(request: NextRequest) {
    try {
        // Get mock data with realistic values
        const mockData = await mockTradingBotResponse();

        // Override running state with our maintained state
        mockData.isRunning = botState.isRunning;
        // Add performance chart data
        const performanceChart = generatePerformanceChartData(30);
        const responseData = {
            ...mockData,
            performanceChart
        };

        return NextResponse.json(responseData);
    } catch (error) {
        console.error('Error in trading bot API:', error);
        return NextResponse.json(
            { error: 'Failed to get trading bot status' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Update bot config
        if (body.config) {
            botState.lastConfigUpdate = new Date();
        }

        return NextResponse.json({
            success: true,
            message: 'Trading bot configuration updated successfully'
        });
    } catch (error) {
        console.error('Error updating trading bot config:', error);
        return NextResponse.json(
            { error: 'Failed to update trading bot configuration' },
            { status: 500 }
        );
    }
}

export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();

        // Start or stop the bot
        if (body.action === 'start') {
            botState.isRunning = true;
            botState.startTime = new Date();
            botState.stopTime = null;
        } else if (body.action === 'stop') {
            botState.isRunning = false;
            botState.stopTime = new Date();
        }

        return NextResponse.json({
            success: true,
            isRunning: botState.isRunning,
            message: `Trading bot ${botState.isRunning ? 'started' : 'stopped'} successfully`
        });
    } catch (error) {
        console.error('Error controlling trading bot:', error);
        return NextResponse.json(
            { error: 'Failed to control trading bot' },
            { status: 500 }
        );
    }
} 