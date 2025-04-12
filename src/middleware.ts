import { clerkMiddleware } from "@clerk/nextjs/server";

// Export the middleware function
export default clerkMiddleware();

// Configure the middleware matcher
export const config = {
    matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
}; 