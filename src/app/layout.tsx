import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from '@clerk/nextjs';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Get the publishable key from the environment variable
// This needs to be a constant at build time for proper deployment
const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || "";

// Log for debugging
if (typeof window !== 'undefined') {
  console.log("Clerk publishable key:", publishableKey);
}

export const metadata: Metadata = {
  title: "Fintola - Financial Analytics",
  description: "Advanced financial analytics and trading platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      publishableKey={publishableKey}
      appearance={{
        elements: {
          formButtonPrimary: 'bg-purple-600 hover:bg-purple-700',
          footerAction: 'text-purple-600 hover:text-purple-800',
          card: 'shadow-sm',
        },
      }}
    >
      <html lang="en">
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
