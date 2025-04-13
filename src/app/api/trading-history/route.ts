import { NextRequest, NextResponse } from 'next/server';
import { generateMockTradeHistory } from '@/lib/trading/mockTradingData';

export async function GET(request: NextRequest) {
    try {
        // Generate 30 mock trades with realistic data
        const mockTrades = generateMockTradeHistory(30);

        // Convert the trades to match the format expected by the UI
        const formattedTrades = mockTrades.map(trade => ({
            timestamp: trade.timestamp,
            symbol: trade.symbol,
            action: trade.tradeType,
            quantity: trade.quantity,
            price: trade.price,
            total: trade.price * trade.quantity,
            status: trade.success ? 'COMPLETED' : 'FAILED',
            orderId: trade.orderId || `ORD${Math.floor(Math.random() * 1000000)}`,
            profitLoss: trade.profitLoss || 0
        }));

        // Add a small delay to simulate network latency
        await new Promise(resolve => setTimeout(resolve, 300));

        return NextResponse.json({
            success: true,
            trades: formattedTrades
        });
    } catch (error) {
        console.error('Error fetching trade history:', error);
        return NextResponse.json(
            { error: 'Failed to fetch trade history' },
            { status: 500 }
        );
    }
} 