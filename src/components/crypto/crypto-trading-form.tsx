"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    ArrowDown,
    ArrowUp,
    BadgeDollarSign,
    BarChart2,
    Loader2,
    TrendingUp,
    TrendingDown,
} from "lucide-react";
import { CryptoSymbolSelector } from "./crypto-symbol-selector";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

interface CryptoTradingFormProps {
    connectedBroker: string;
}

export function CryptoTradingForm({ connectedBroker }: CryptoTradingFormProps) {
    // Trading form state
    const [symbol, setSymbol] = useState<string>("BTC-USDT");
    const [quantity, setQuantity] = useState<string>("0.01");
    const [price, setPrice] = useState<string>("");
    const [stopPrice, setStopPrice] = useState<string>("");
    const [orderType, setOrderType] = useState<string>("MARKET");
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    // Current price simulation (in a real app, this would come from a WebSocket)
    const [currentPrice, setCurrentPrice] = useState<number>(42000);

    // Total calculation
    const total = parseFloat(quantity) * (price ? parseFloat(price) : currentPrice);

    // Handle form submission
    const handleSubmit = async (transactionType: 'BUY' | 'SELL') => {
        try {
            setIsSubmitting(true);

            // Validate inputs
            if (!symbol) {
                toast.error("Please select a trading pair");
                return;
            }

            if (!quantity || parseFloat(quantity) <= 0) {
                toast.error("Please enter a valid quantity");
                return;
            }

            if (orderType !== "MARKET" && (!price || parseFloat(price) <= 0)) {
                toast.error("Please enter a valid price for limit orders");
                return;
            }

            if (["STOP_LOSS", "STOP_LOSS_LIMIT"].includes(orderType) && (!stopPrice || parseFloat(stopPrice) <= 0)) {
                toast.error("Please enter a valid stop price");
                return;
            }

            // Prepare trade request
            const tradeRequest = {
                symbol,
                quantity: parseFloat(quantity),
                orderType,
                transactionType,
                brokerId: connectedBroker,
            };

            // Add price for limit orders
            if (orderType !== "MARKET") {
                tradeRequest["price"] = parseFloat(price);
            }

            // Add stop price for stop orders
            if (["STOP_LOSS", "STOP_LOSS_LIMIT"].includes(orderType)) {
                tradeRequest["stopPrice"] = parseFloat(stopPrice);
            }

            // Execute trade
            const response = await fetch('/api/trades', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(tradeRequest)
            });

            const data = await response.json();

            if (response.ok) {
                toast.success(`${transactionType} order placed successfully. Order ID: ${data.orderId}`);
            } else {
                toast.error(`Failed to place order: ${data.error}`);
            }
        } catch (error) {
            console.error('Error placing order:', error);
            toast.error(`Failed to place order: ${error.message || 'Unknown error'}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Card className="w-full max-w-md mx-auto">
            <CardHeader>
                <CardTitle>Cryptocurrency Trading</CardTitle>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="buy" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-4">
                        <TabsTrigger value="buy" className="data-[state=active]:bg-green-500 data-[state=active]:text-white">
                            <ArrowDown className="h-4 w-4 mr-2" />
                            Buy
                        </TabsTrigger>
                        <TabsTrigger value="sell" className="data-[state=active]:bg-red-500 data-[state=active]:text-white">
                            <ArrowUp className="h-4 w-4 mr-2" />
                            Sell
                        </TabsTrigger>
                    </TabsList>

                    <div className="space-y-4 mb-4">
                        {/* Trading pair selector */}
                        <CryptoSymbolSelector value={symbol} onChange={setSymbol} />

                        {/* Current price indicator */}
                        <div className="flex items-center justify-between bg-muted p-2 rounded-md">
                            <div className="flex items-center">
                                <BarChart2 className="h-4 w-4 mr-2 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">Current Price</span>
                            </div>
                            <div className="font-medium">${currentPrice.toLocaleString()}</div>
                        </div>

                        {/* Order type */}
                        <div className="space-y-2">
                            <Label htmlFor="order-type">Order Type</Label>
                            <Select value={orderType} onValueChange={setOrderType}>
                                <SelectTrigger id="order-type">
                                    <SelectValue placeholder="Select order type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="MARKET">Market Order</SelectItem>
                                    <SelectItem value="LIMIT">Limit Order</SelectItem>
                                    <SelectItem value="STOP_LOSS">Stop Loss</SelectItem>
                                    <SelectItem value="STOP_LOSS_LIMIT">Stop Loss Limit</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Quantity */}
                        <div className="space-y-2">
                            <Label htmlFor="quantity">Quantity</Label>
                            <Input
                                id="quantity"
                                type="number"
                                placeholder="0.01"
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
                                step="0.0001"
                                min="0.0001"
                            />
                        </div>

                        {/* Price (for limit orders) */}
                        {orderType !== "MARKET" && (
                            <div className="space-y-2">
                                <Label htmlFor="price">Price</Label>
                                <Input
                                    id="price"
                                    type="number"
                                    placeholder={currentPrice.toString()}
                                    value={price}
                                    onChange={(e) => setPrice(e.target.value)}
                                    step="0.01"
                                    min="0.01"
                                />
                            </div>
                        )}

                        {/* Stop Price (for stop orders) */}
                        {["STOP_LOSS", "STOP_LOSS_LIMIT"].includes(orderType) && (
                            <div className="space-y-2">
                                <Label htmlFor="stop-price">Stop Price</Label>
                                <Input
                                    id="stop-price"
                                    type="number"
                                    placeholder={currentPrice.toString()}
                                    value={stopPrice}
                                    onChange={(e) => setStopPrice(e.target.value)}
                                    step="0.01"
                                    min="0.01"
                                />
                            </div>
                        )}

                        {/* Total */}
                        <div className="flex justify-between items-center p-2 bg-muted rounded-md">
                            <div className="flex items-center">
                                <BadgeDollarSign className="h-4 w-4 mr-2" />
                                <span>Total</span>
                            </div>
                            <div className="font-medium">
                                ${isNaN(total) ? "0.00" : total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                        </div>
                    </div>

                    <TabsContent value="buy" className="mt-0">
                        <Button
                            className="w-full bg-green-500 hover:bg-green-600"
                            onClick={() => handleSubmit('BUY')}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Placing Order...
                                </>
                            ) : (
                                <>
                                    <TrendingUp className="h-4 w-4 mr-2" />
                                    Buy {symbol.split('-')[0]}
                                </>
                            )}
                        </Button>
                    </TabsContent>

                    <TabsContent value="sell" className="mt-0">
                        <Button
                            className="w-full bg-red-500 hover:bg-red-600"
                            onClick={() => handleSubmit('SELL')}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Placing Order...
                                </>
                            ) : (
                                <>
                                    <TrendingDown className="h-4 w-4 mr-2" />
                                    Sell {symbol.split('-')[0]}
                                </>
                            )}
                        </Button>
                    </TabsContent>
                </Tabs>
            </CardContent>
            <CardFooter className="text-xs text-muted-foreground">
                <p>Trading {symbol} on {connectedBroker}. All trades are executed in real-time.</p>
            </CardFooter>
        </Card>
    );
} 