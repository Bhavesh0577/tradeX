import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
            <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-md">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-gray-900">Create an Account</h1>
                    <p className="mt-2 text-sm text-gray-600">
                        Join Fintola for advanced financial analytics
                    </p>
                </div>
                <SignUp appearance={{
                    elements: {
                        formButtonPrimary: 'bg-purple-600 hover:bg-purple-700 text-sm normal-case',
                        card: 'bg-white shadow-none',
                    }
                }} />
            </div>
        </div>
    );
} 