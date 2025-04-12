import { NextApiRequest, NextApiResponse } from 'next';
import { clerkClient, getAuth } from "@clerk/nextjs/server";

// Supported order types and transaction types
type OrderType = 'MARKET' | 'LIMIT' | 'SL' | 'SL-M';
type TransactionType = 'BUY' | 'SELL';

interface TradeRequest {
    symbol: string;
    quantity: number;
    price?: number;
    orderType: OrderType;
    transactionType: TransactionType;
    stopLoss?: number;
    target?: number;
    brokerId: string;
}

// Execute trade with Zerodha
async function executeZerodhaOrder(userId: string, tradeParams: TradeRequest) {
    try {
        const user = await clerkClient().then(client => client.users.getUser(userId));
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
            order_type: tradeParams.orderType,
            product: 'MIS' // Day trading
        };

        // Add price for limit orders
        if (tradeParams.orderType === 'LIMIT' && tradeParams.price) {
            orderParams.price = tradeParams.price;
        }

        // Add stop loss price if provided
        if ((tradeParams.orderType === 'SL' || tradeParams.orderType === 'SL-M') && tradeParams.stopLoss) {
            orderParams.trigger_price = tradeParams.stopLoss;
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

// Execute trade with Upstox
async function executeUpstoxOrder(userId: string, tradeParams: TradeRequest) {
    try {
        const user = await clerkClient().then(client => client.users.getUser(userId));
        const brokerTokens = user.privateMetadata.brokerTokens || {};
        const upstoxToken = brokerTokens['UPSTOX']?.accessToken;

        if (!upstoxToken) {
            throw new Error('Upstox access token not found');
        }

        // Prepare order parameters based on Upstox API
        const orderParams = {
            symbol: tradeParams.symbol,
            quantity: tradeParams.quantity,
            side: tradeParams.transactionType,
            orderType: tradeParams.orderType,
            validity: 'DAY',
            isAmo: false
        };

        // Add price for limit orders
        if (tradeParams.orderType === 'LIMIT' && tradeParams.price) {
            orderParams['price'] = tradeParams.price;
        }

        // Add stop loss price if provided
        if ((tradeParams.orderType === 'SL' || tradeParams.orderType === 'SL-M') && tradeParams.stopLoss) {
            orderParams['triggerPrice'] = tradeParams.stopLoss;
        }

        // Make API call to Upstox
        const response = await fetch('https://api.upstox.com/v2/order/place', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${upstoxToken}`
            },
            body: JSON.stringify(orderParams)
        });

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error executing Upstox order:', error);
        throw error;
    }
}

// Execute trade with Angel One
async function executeAngelOrder(userId: string, tradeParams: TradeRequest) {
    try {
        const user = await clerkClient().then(client => client.users.getUser(userId));
        const brokerTokens = user.privateMetadata.brokerTokens || {};
        const angelToken = brokerTokens['ANGELONE']?.accessToken;

        if (!angelToken) {
            throw new Error('Angel One access token not found');
        }

        // Prepare order parameters based on Angel One API
        const orderParams = {
            symbol: tradeParams.symbol,
            qty: tradeParams.quantity,
            side: tradeParams.transactionType,
            type: tradeParams.orderType,
            validity: 'DAY',
            productType: 'INTRADAY'
        };

        // Add price for limit orders
        if (tradeParams.orderType === 'LIMIT' && tradeParams.price) {
            orderParams['price'] = tradeParams.price;
        }

        // Add stop loss price if provided
        if ((tradeParams.orderType === 'SL' || tradeParams.orderType === 'SL-M') && tradeParams.stopLoss) {
            orderParams['triggerPrice'] = tradeParams.stopLoss;
        }

        // Make API call to Angel One
        const response = await fetch('https://apiconnect.angelbroking.com/rest/secure/angelbroking/order/v1/placeOrder', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${angelToken}`,
                'X-ClientLocalIP': '127.0.0.1',
                'X-ClientPublicIP': '127.0.0.1',
                'X-MACAddress': '00:00:00:00:00:00',
                'Accept': 'application/json',
                'X-SourceID': 'WEB',
                'X-UserType': 'USER',
                'X-PrivateKey': process.env.ANGELONE_API_KEY || ''
            },
            body: JSON.stringify(orderParams)
        });

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error executing Angel One order:', error);
        throw error;
    }
}

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

        const tradeParams = req.body as TradeRequest;

        // Validate request
        if (!tradeParams.symbol || !tradeParams.quantity || !tradeParams.orderType || !tradeParams.transactionType || !tradeParams.brokerId) {
            return res.status(400).json({ error: 'Missing required parameters' });
        }

        // Execute the order with the appropriate broker
        let orderResponse;

        switch (tradeParams.brokerId) {
            case 'ZERODHA':
                orderResponse = await executeZerodhaOrder(userId, tradeParams);
                break;

            case 'UPSTOX':
                orderResponse = await executeUpstoxOrder(userId, tradeParams);
                break;

            case 'ANGELONE':
                orderResponse = await executeAngelOrder(userId, tradeParams);
                break;

            default:
                return res.status(400).json({ error: 'Unsupported broker' });
        }

        // Log the trade in our database (simplified for now)
        // In a real app, you'd store this in a database
        console.log('Trade executed:', {
            userId,
            ...tradeParams,
            timestamp: new Date().toISOString(),
            response: orderResponse
        });

        return res.status(200).json({
            success: true,
            message: 'Order placed successfully',
            orderId: orderResponse.order_id || orderResponse.data?.orderid || null
        });

    } catch (error) {
        console.error('Error executing trade:', error);
        return res.status(500).json({ error: 'Failed to execute trade', message: error.message });
    }
} 