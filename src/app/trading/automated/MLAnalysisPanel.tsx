"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sparkles, Brain, TrendingUp, TrendingDown, Loader2, RefreshCw, Target, AlertTriangle, Zap } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ModelPrediction } from '@/lib/ml/tradingModel';

interface MLAnalysisPanelProps {
    symbols: string[];
    onSignalReceived?: (signal: ModelPrediction) => void;
}

export default function MLAnalysisPanel({ symbols, onSignalReceived }: MLAnalysisPanelProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [signals, setSignals] = useState<ModelPrediction[]>([]);
    const [activeSignal, setActiveSignal] = useState<ModelPrediction | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const chartRef = useRef<HTMLDivElement>(null);

    // Tab state
    const [activeTab, setActiveTab] = useState('overview');

    // Load signals on mount and when symbols change
    const fetchSignals = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`/api/ml/signals?symbols=${symbols.join(',')}`);
            const data = await response.json();
            setSignals(data);
            setLastUpdated(new Date());
        } catch (error) {
            console.error('Error fetching signals:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (symbols.length > 0) {
            fetchSignals();
        }
    }, [symbols]);

    // Cleanup function to handle chart disposal
    useEffect(() => {
        return () => {
            if (chartRef.current) {
                const chartElement = chartRef.current;
                while (chartElement.firstChild) {
                    chartElement.removeChild(chartElement.firstChild);
                }
            }
        };
    }, []);

    // Rest of the component remains the same...
    // [Previous code continues unchanged]

    return (
        <Card className="shadow-lg border-none">
            {/* Previous JSX remains unchanged */}
            <CardContent>
                {signals.length === 0 && !isLoading ? (
                    <div className="text-center py-8">
                        <div className="rounded-full p-3 bg-blue-100 inline-flex mb-4">
                            <Brain className="h-7 w-7 text-blue-600" />
                        </div>
                        <h3 className="text-lg font-medium mb-2">No ML signals available</h3>
                        <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
                            Click the "Refresh Analysis" button to generate AI trading signals for your selected symbols
                        </p>
                    </div>
                ) : (
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        {/* Previous TabsList and TabsContent remain unchanged */}
                        <TabsContent value="overview" className="space-y-4">
                            {/* Previous overview content remains unchanged */}
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <h3 className="text-sm font-medium mb-2">Signal Distribution</h3>
                                    <div ref={chartRef} className="h-64 rounded-lg border p-4">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart
                                                data={[
                                                    { name: 'Buy', value: signals.filter(s => s.prediction === 'BUY').length, fill: '#10B981' },
                                                    { name: 'Sell', value: signals.filter(s => s.prediction === 'SELL').length, fill: '#EF4444' },
                                                    { name: 'Hold', value: signals.filter(s => s.prediction === 'HOLD').length, fill: '#6B7280' },
                                                ]}
                                                margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                                            >
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis dataKey="name" />
                                                <YAxis allowDecimals={false} />
                                                <Tooltip />
                                                <Bar dataKey="value" fill="#8884d8">
                                                    {[
                                                        { name: 'Buy', fill: '#10B981' },
                                                        { name: 'Sell', fill: '#EF4444' },
                                                        { name: 'Hold', fill: '#6B7280' },
                                                    ].map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-sm font-medium mb-2">Confidence Levels</h3>
                                    <div ref={chartRef} className="h-64 rounded-lg border p-4">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={[
                                                        { name: 'High', value: signals.filter(s => s.confidence >= 0.8).length },
                                                        { name: 'Medium', value: signals.filter(s => s.confidence >= 0.5 && s.confidence < 0.8).length },
                                                        { name: 'Low', value: signals.filter(s => s.confidence < 0.5).length }
                                                    ]}
                                                    cx="50%"
                                                    cy="50%"
                                                    labelLine={false}
                                                    outerRadius={80}
                                                    fill="#8884d8"
                                                    dataKey="value"
                                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                                >
                                                    {[
                                                        { name: 'High', fill: '#10B981' },
                                                        { name: 'Medium', fill: '#F59E0B' },
                                                        { name: 'Low', fill: '#EF4444' }
                                                    ].map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                                    ))}
                                                </Pie>
                                                <Tooltip />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>
                            {/* Rest of the component remains unchanged */}
                        </TabsContent>
                    </Tabs>
                )}
            </CardContent>
        </Card>
    );
}