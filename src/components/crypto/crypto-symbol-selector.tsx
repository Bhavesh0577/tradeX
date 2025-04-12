"use client";

import { useState, useEffect } from "react";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search } from "lucide-react";

// Popular cryptocurrencies with their trading pairs
const POPULAR_CRYPTO_PAIRS = [
    { symbol: "BTC-USDT", name: "Bitcoin", category: "Top Cryptocurrencies" },
    { symbol: "ETH-USDT", name: "Ethereum", category: "Top Cryptocurrencies" },
    { symbol: "BNB-USDT", name: "Binance Coin", category: "Top Cryptocurrencies" },
    { symbol: "SOL-USDT", name: "Solana", category: "Top Cryptocurrencies" },
    { symbol: "XRP-USDT", name: "Ripple", category: "Top Cryptocurrencies" },
    { symbol: "ADA-USDT", name: "Cardano", category: "Top Cryptocurrencies" },
    { symbol: "DOGE-USDT", name: "Dogecoin", category: "Top Cryptocurrencies" },
    { symbol: "SHIB-USDT", name: "Shiba Inu", category: "Top Cryptocurrencies" },
    { symbol: "DOT-USDT", name: "Polkadot", category: "Top Cryptocurrencies" },
    { symbol: "AVAX-USDT", name: "Avalanche", category: "Top Cryptocurrencies" },
    { symbol: "MATIC-USDT", name: "Polygon", category: "Layer 2 Solutions" },
    { symbol: "LTC-USDT", name: "Litecoin", category: "Layer 1 Blockchains" },
    { symbol: "LINK-USDT", name: "Chainlink", category: "Oracles" },
    { symbol: "UNI-USDT", name: "Uniswap", category: "DeFi" },
    { symbol: "AAVE-USDT", name: "Aave", category: "DeFi" },
    { symbol: "ATOM-USDT", name: "Cosmos", category: "Layer 1 Blockchains" },
    { symbol: "ALGO-USDT", name: "Algorand", category: "Layer 1 Blockchains" },
    { symbol: "FTM-USDT", name: "Fantom", category: "Layer 1 Blockchains" },
    { symbol: "MANA-USDT", name: "Decentraland", category: "Metaverse" },
    { symbol: "SAND-USDT", name: "The Sandbox", category: "Metaverse" },
];

interface CryptoSymbolSelectorProps {
    value: string;
    onChange: (value: string) => void;
}

export function CryptoSymbolSelector({ value, onChange }: CryptoSymbolSelectorProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [filteredPairs, setFilteredPairs] = useState(POPULAR_CRYPTO_PAIRS);

    // Filter crypto pairs based on search query
    useEffect(() => {
        if (!searchQuery) {
            setFilteredPairs(POPULAR_CRYPTO_PAIRS);
            return;
        }

        const query = searchQuery.toLowerCase();
        const filtered = POPULAR_CRYPTO_PAIRS.filter(pair =>
            pair.symbol.toLowerCase().includes(query) ||
            pair.name.toLowerCase().includes(query)
        );

        setFilteredPairs(filtered);
    }, [searchQuery]);

    // Group by category
    const groupedByCategory = filteredPairs.reduce((groups, pair) => {
        if (!groups[pair.category]) {
            groups[pair.category] = [];
        }
        groups[pair.category].push(pair);
        return groups;
    }, {} as Record<string, typeof POPULAR_CRYPTO_PAIRS>);

    return (
        <div className="space-y-2">
            <Label htmlFor="crypto-symbol">Select Cryptocurrency Pair</Label>
            <div className="relative">
                <Input
                    id="crypto-search"
                    placeholder="Search (e.g. BTC, Bitcoin)"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="mb-2"
                />
                <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
            </div>

            <Select value={value} onValueChange={onChange}>
                <SelectTrigger id="crypto-symbol">
                    <SelectValue placeholder="Select a trading pair" />
                </SelectTrigger>
                <SelectContent>
                    {Object.entries(groupedByCategory).map(([category, pairs]) => (
                        <SelectGroup key={category}>
                            <SelectLabel>{category}</SelectLabel>
                            {pairs.map(pair => (
                                <SelectItem key={pair.symbol} value={pair.symbol}>
                                    {pair.symbol} ({pair.name})
                                </SelectItem>
                            ))}
                        </SelectGroup>
                    ))}
                    {filteredPairs.length === 0 && (
                        <div className="p-2 text-center text-sm text-muted-foreground">
                            No cryptocurrency pairs found
                        </div>
                    )}
                </SelectContent>
            </Select>
        </div>
    );
} 