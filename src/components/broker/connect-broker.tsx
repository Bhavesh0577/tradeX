"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Smartphone, Laptop, Copy, Check } from "lucide-react";

// Supported brokers with their details
const SUPPORTED_BROKERS = [
    { id: "ZERODHA", name: "Zerodha", logo: "/brokers/zerodha.png" },
    { id: "UPSTOX", name: "Upstox", logo: "/brokers/upstox.png" },
    { id: "ANGELONE", name: "Angel One", logo: "/brokers/angelone.png" }
];

export function ConnectBroker() {
    const { user, isLoaded } = useUser();
    const [selectedBroker, setSelectedBroker] = useState<string>("");
    const [isConnecting, setIsConnecting] = useState(false);
    const [connectionUrl, setConnectionUrl] = useState<string>("");
    const [phoneNumber, setPhoneNumber] = useState<string>("");
    const [copied, setCopied] = useState(false);
    const [isPhoneNumberLinked, setIsPhoneNumberLinked] = useState(false);

    // Detect if we're on a mobile device
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));

        // Get phone number from user profile if available
        if (user?.phoneNumbers && user.phoneNumbers.length > 0) {
            setPhoneNumber(user.phoneNumbers[0].phoneNumber);
            setIsPhoneNumberLinked(true);
        }
    }, [user]);

    // Function to initiate broker connection
    const connectBroker = async () => {
        try {
            setIsConnecting(true);

            const response = await fetch('/api/broker-connect', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ brokerId: selectedBroker })
            });

            if (!response.ok) {
                throw new Error('Failed to initiate broker connection');
            }

            const data = await response.json();
            setConnectionUrl(data.authUrl);

            // If on mobile, directly navigate to the connection URL
            if (isMobile) {
                window.location.href = data.authUrl;
            }

            // Otherwise, show QR code and link options

        } catch (error) {
            console.error('Error connecting broker:', error);
            toast.error('Failed to connect broker. Please try again.');
        } finally {
            setIsConnecting(false);
        }
    };

    // Function to send connection link to phone
    const sendConnectionToPhone = async () => {
        if (!phoneNumber || !connectionUrl) return;

        try {
            const response = await fetch('/api/send-connection-sms', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    phoneNumber,
                    message: `Connect your trading account: ${connectionUrl}`
                })
            });

            if (!response.ok) {
                throw new Error('Failed to send SMS');
            }

            toast.success('Connection link sent to your phone');
        } catch (error) {
            console.error('Error sending SMS:', error);
            toast.error('Failed to send SMS. Please try again.');
        }
    };

    // Function to copy connection link to clipboard
    const copyLinkToClipboard = () => {
        navigator.clipboard.writeText(connectionUrl);
        setCopied(true);
        toast.success('Link copied to clipboard');
        setTimeout(() => setCopied(false), 3000);
    };

    // Function to link phone number to account
    const linkPhoneNumber = async () => {
        if (!phoneNumber) {
            toast.error('Please enter a valid phone number');
            return;
        }

        try {
            // In a real app, we'd use Clerk's API to update the user's phone number
            // For now, just simulate success
            toast.success('Phone number linked successfully');
            setIsPhoneNumberLinked(true);
        } catch (error) {
            console.error('Error linking phone number:', error);
            toast.error('Failed to link phone number. Please try again.');
        }
    };

    return (
        <div className="space-y-6">
            {/* Broker selection */}
            <div className="space-y-2">
                <Label htmlFor="broker-select">Select Your Broker</Label>
                <Select value={selectedBroker} onValueChange={setSelectedBroker}>
                    <SelectTrigger id="broker-select" className="w-full">
                        <SelectValue placeholder="Select a broker" />
                    </SelectTrigger>
                    <SelectContent>
                        {SUPPORTED_BROKERS.map(broker => (
                            <SelectItem key={broker.id} value={broker.id} className="flex items-center gap-2">
                                {broker.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Phone number linking section */}
            {!isPhoneNumberLinked && (
                <div className="space-y-2 bg-muted p-3 rounded-md">
                    <Label htmlFor="phone-number">Link Your Phone Number</Label>
                    <div className="text-sm mb-2 text-muted-foreground">
                        Link your phone to access your broker connection from your mobile device
                    </div>
                    <div className="flex space-x-2">
                        <Input
                            id="phone-number"
                            placeholder="+91 9999999999"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                        />
                        <Button onClick={linkPhoneNumber}>Link</Button>
                    </div>
                </div>
            )}

            {/* Connect button */}
            {!connectionUrl ? (
                <Button
                    onClick={connectBroker}
                    disabled={!selectedBroker || isConnecting}
                    className="w-full"
                >
                    {isConnecting ? (
                        <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Connecting...
                        </>
                    ) : (
                        'Connect Broker'
                    )}
                </Button>
            ) : (
                <Tabs defaultValue={isMobile ? "direct" : "qrcode"} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="qrcode" className="flex items-center gap-2">
                            <Smartphone className="h-4 w-4" />
                            QR Code
                        </TabsTrigger>
                        <TabsTrigger value="direct" className="flex items-center gap-2">
                            <Laptop className="h-4 w-4" />
                            Direct Link
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="qrcode" className="space-y-4 mt-4">
                        <div className="flex flex-col items-center justify-center p-4 bg-white rounded-md">
                            <QRCodeSVG value={connectionUrl} size={200} />
                            <p className="text-sm text-center mt-2 text-muted-foreground">
                                Scan this QR code with your phone to connect your broker
                            </p>
                        </div>

                        {isPhoneNumberLinked && (
                            <Button onClick={sendConnectionToPhone} className="w-full">
                                Send to my phone ({phoneNumber})
                            </Button>
                        )}
                    </TabsContent>

                    <TabsContent value="direct" className="space-y-4 mt-4">
                        <div className="flex items-center gap-2">
                            <Input value={connectionUrl} readOnly className="flex-1" />
                            <Button variant="outline" size="icon" onClick={copyLinkToClipboard}>
                                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                            </Button>
                        </div>
                        <Button onClick={() => window.open(connectionUrl, '_blank')} className="w-full">
                            Open Connection Link
                        </Button>
                    </TabsContent>
                </Tabs>
            )}

            <div className="text-sm text-muted-foreground">
                <p>By connecting your broker, you authorize our platform to execute trades on your behalf.</p>
                <p className="mt-1">Your broker connection is synchronized across all your devices.</p>
            </div>
        </div>
    );
} 