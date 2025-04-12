import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
            <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-md">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-gray-900">Sign In to Fintola</h1>
                    <p className="mt-2 text-sm text-gray-600">
                        Access your financial analytics dashboard
                    </p>
                </div>
                <SignIn appearance={{
                    elements: {
                        formButtonPrimary: 'bg-purple-600 hover:bg-purple-700 text-sm normal-case',
                        card: 'bg-white shadow-none',
                    }
                }} />
            </div>
        </div>
    );
} 