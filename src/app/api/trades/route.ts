import { NextRequest, NextResponse } from 'next/server';
import { clerkClient, getAuth } from '@clerk/nextjs/server';

// Supported order types and transaction types
type OrderType = 'MARKET' | 'LIMIT' | 'STOP_LOSS' | 'STOP_LOSS_LIMIT';
type TransactionType = 'BUY' | 'SELL';

interface TradeRequest {
    symbol: string;
    quantity: number;
    price?: number;
    orderType: OrderType;
    transactionType: TransactionType;
    stopPrice?: number;
    brokerId: string;
}

// Execute trade with Binance
async function executeBinanceTrade(userId: string, tradeParams: TradeRequest) {
    try {
        // Get user's Binance token from Clerk metadata
        const clerk = await clerkClient();
        const user = await clerk.users.getUser(userId);
        const brokerTokens = user.privateMetadata.brokerTokens || {};
        const binanceToken = brokerTokens['BINANCE']?.accessToken;

        if (!binanceToken) {
            throw new Error('Binance access token not found');
        }

        // Prepare order parameters based on Binance API
        const orderParams: any = {
            symbol: tradeParams.symbol.replace('-', ''), // Convert BTC-USDT to BTCUSDT format
            side: tradeParams.transactionType,
            type: tradeParams.orderType,
            quantity: tradeParams.quantity
        };

        // Add price for limit orders
        if (tradeParams.orderType === 'LIMIT' && tradeParams.price) {
            orderParams.price = tradeParams.price;
        }

        // Add stop price if provided
        if ((tradeParams.orderType === 'STOP_LOSS' || tradeParams.orderType === 'STOP_LOSS_LIMIT') && tradeParams.stopPrice) {
            orderParams.stopPrice = tradeParams.stopPrice;
        }

        // Timestamp required by Binance
        orderParams.timestamp = Date.now();

        // Make API call to Binance
        const response = await fetch('https://api.binance.com/api/v3/order', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-MBX-APIKEY': process.env.BINANCE_API_KEY || ''
            },
            body: new URLSearchParams(orderParams)
        });

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error executing Binance order:', error);
        throw error;
    }
}

// Execute trade with Zerodha
async function executeZerodhaOrder(userId: string, tradeParams: TradeRequest) {
    try {
        const clerk = await clerkClient();
        const user = await clerk.users.getUser(userId);
        const brokerTokens = user.privateMetadata.brokerTokens || {};
        const zerodhaToken = brokerTokens['ZERODHA']?.accessToken;

        if (!zerodhaToken) {
            throw new Error('Zerodha access token not found');
        }

        // Prepare order parameters based on Zerodha API
        const orderParams: any = {
            exchange: tradeParams.symbol.includes('.NS') ? 'NSE' : 'BSE',
            tradingsymbol: tradeParams.symbol.replace('.NS', '').replace('.BS', ''),
            quantity: tradeParams.quantity,
            transaction_type: tradeParams.transactionType,
            order_type: tradeParams.orderType === 'MARKET' ? 'MARKET' : 'LIMIT',
            product: 'MIS' // Day trading
        };

        // Add price for limit orders
        if (tradeParams.orderType !== 'MARKET' && tradeParams.price) {
            orderParams.price = tradeParams.price;
        }

        // Add stop loss price if provided
        if (tradeParams.orderType.includes('STOP_LOSS') && tradeParams.stopPrice) {
            orderParams.trigger_price = tradeParams.stopPrice;
        }

        // Make API call to Zerodha
        const response = await fetch('https://api.kite.trade/orders/regular', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-Kite-Version': '3',
                'Authorization': `Token ${process.env.ZERODHA_API_KEY}:${zerodhaToken}`
            },
            body: new URLSearchParams(orderParams)
        });

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error executing Zerodha order:', error);
        throw error;
    }
}

export async function POST(request: NextRequest) {
    try {
        // Get authenticated user
        const auth = getAuth(request);
        const userId = auth.userId;

        if (!userId) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Parse request body
        const tradeParams = await request.json() as TradeRequest;

        // Validate request
        if (!tradeParams.symbol || !tradeParams.quantity || !tradeParams.orderType || !tradeParams.transactionType || !tradeParams.brokerId) {
            return NextResponse.json(
                { error: 'Missing required parameters' },
                { status: 400 }
            );
        }

        // Execute the order with the appropriate broker
        let orderResponse;

        switch (tradeParams.brokerId) {
            case 'BINANCE':
                orderResponse = await executeBinanceTrade(userId, tradeParams);
                break;

            case 'ZERODHA':
                orderResponse = await executeZerodhaOrder(userId, tradeParams);
                break;

            case 'UPSTOX':
            case 'ANGELONE':
                return NextResponse.json(
                    { error: `${tradeParams.brokerId} trading is not implemented yet` },
                    { status: 501 }
                );

            default:
                return NextResponse.json(
                    { error: 'Unsupported broker' },
                    { status: 400 }
                );
        }

        // Log the trade in our database (simplified for now)
        console.log('Trade executed:', {
            userId,
            ...tradeParams,
            timestamp: new Date().toISOString(),
            response: orderResponse
        });

        // Format response based on broker
        let formattedResponse;
        if (tradeParams.brokerId === 'BINANCE') {
            formattedResponse = {
                success: true,
                message: 'Order placed successfully',
                orderId: orderResponse.orderId,
                status: orderResponse.status,
                executedQty: orderResponse.executedQty,
                details: orderResponse
            };
        } else {
            formattedResponse = {
                success: true,
                message: 'Order placed successfully',
                orderId: orderResponse.order_id || orderResponse.data?.orderid || null,
                details: orderResponse
            };
        }

        return NextResponse.json(formattedResponse);

    } catch (error) {
        console.error('Error executing trade:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to execute trade' },
            { status: 500 }
        );
    }
} 