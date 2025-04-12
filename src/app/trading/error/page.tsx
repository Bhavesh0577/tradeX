"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, ArrowLeft, RefreshCw } from "lucide-react";

export default function TradeErrorPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [errorMessage, setErrorMessage] = useState<string>("");

    useEffect(() => {
        // Get error message from URL query parameter
        const message = searchParams?.get("message");
        setErrorMessage(message || "An unknown error occurred");
    }, [searchParams]);

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <div className="mx-auto bg-red-100 p-3 rounded-full w-16 h-16 flex items-center justify-center mb-4">
                        <AlertTriangle className="h-8 w-8 text-red-600" />
                    </div>
                    <CardTitle className="text-2xl">Trading Error</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-center text-muted-foreground">
                        {errorMessage}
                    </p>
                </CardContent>
                <CardFooter className="flex flex-col space-y-2">
                    <Button
                        variant="default"
                        className="w-full"
                        onClick={() => router.push('/trading')}
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Return to Trading
                    </Button>
                    <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => window.location.reload()}
                    >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Try Again
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
} 