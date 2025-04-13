import { NextRequest, NextResponse } from 'next/server';
import { generateMockSignals } from '@/lib/trading/mockTradingData';

export async function GET(request: NextRequest) {
    try {
        // Get symbols from query params
        const searchParams = request.nextUrl.searchParams;
        const symbolsParam = searchParams.get('symbols');

        if (!symbolsParam) {
            return NextResponse.json(
                { error: 'No symbols provided' },
                { status: 400 }
            );
        }

        // Parse symbols
        const symbols = symbolsParam.split(',').map(s => s.trim());

        // Generate mock signals for the requested symbols
        const mockSignalData = generateMockSignals(symbols);

        // Add a small delay to simulate ML model inference time
        await new Promise(resolve => setTimeout(resolve, 1200));

        return NextResponse.json(mockSignalData);
    } catch (error) {
        console.error('Error generating ML trading signals:', error);
        return NextResponse.json(
            { error: 'Failed to generate ML trading signals' },
            { status: 500 }
        );
    }
} 