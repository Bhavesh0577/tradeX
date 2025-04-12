import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';

// This would use a service like Twilio, AWS SNS, or another SMS provider
// For demo purposes, we're simulating the SMS sending
async function sendSMS(phoneNumber: string, message: string): Promise<boolean> {
    try {
        // In a real implementation, you would use an SMS provider API here
        // Example with Twilio:
        /*
        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        const client = require('twilio')(accountSid, authToken);
        
        await client.messages.create({
          body: message,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: phoneNumber
        });
        */

        // For this demo, we'll simulate success
        console.log(`[SMS Simulation] To: ${phoneNumber}, Message: ${message}`);

        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 500));

        return true;
    } catch (error) {
        console.error('Error sending SMS:', error);
        return false;
    }
}

export async function POST(request: NextRequest) {
    try {
        // Check authentication
        const { userId } = getAuth(request);

        if (!userId) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Parse request body
        const body = await request.json();
        const { phoneNumber, message } = body;

        // Validate inputs
        if (!phoneNumber || !message) {
            return NextResponse.json(
                { error: 'Phone number and message are required' },
                { status: 400 }
            );
        }

        // Send the SMS
        const success = await sendSMS(phoneNumber, message);

        if (!success) {
            return NextResponse.json(
                { error: 'Failed to send SMS' },
                { status: 500 }
            );
        }

        // Return success response
        return NextResponse.json({
            success: true,
            message: 'SMS sent successfully'
        });

    } catch (error) {
        console.error('Error in SMS endpoint:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
} 