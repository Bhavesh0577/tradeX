"use client";

import { UserProfile } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";

export default function ProfilePage() {
    const { user, isLoaded } = useUser();
    const router = useRouter();
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
        if (isLoaded && !user) {
            router.push('/sign-in');
        }
    }, [isLoaded, user, router]);

    if (!isClient || !isLoaded) {
        return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
    }

    if (!user) {
        return null;
    }

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
            <div className="w-full max-w-4xl">
                <h1 className="mb-8 text-center text-3xl font-bold">Your Profile</h1>
                <div className="rounded-lg bg-white p-8 shadow-md">
                    <UserProfile
                        appearance={{
                            elements: {
                                rootBox: "mx-auto",
                                card: "shadow-none",
                                navbar: "hidden",
                                navbarMobileMenuButton: "hidden",
                                headerTitle: "text-2xl font-bold",
                                headerSubtitle: "text-gray-600",
                                formButtonPrimary: "bg-purple-600 hover:bg-purple-700",
                            }
                        }}
                    />
                </div>
                <div className="mt-6 text-center">
                    <button
                        onClick={() => router.push('/dash')}
                        className="text-purple-600 hover:text-purple-800 underline"
                    >
                        Back to Dashboard
                    </button>
                </div>
            </div>
        </div>
    );
} 