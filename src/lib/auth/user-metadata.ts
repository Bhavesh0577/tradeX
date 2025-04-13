import { clerkClient } from "@clerk/nextjs";

/**
 * Get user metadata from Clerk
 */
export async function getUserMetadata(userId: string) {
    try {
        const user = await clerkClient.users.getUser(userId);
        return user.publicMetadata || {};
    } catch (error) {
        console.error("Error fetching user metadata:", error);
        return {};
    }
}

/**
 * Update user metadata in Clerk
 */
export async function updateUserMetadata(userId: string, metadata: any) {
    try {
        await clerkClient.users.updateUser(userId, {
            publicMetadata: {
                ...await getUserMetadata(userId),
                ...metadata
            }
        });
        return true;
    } catch (error) {
        console.error("Error updating user metadata:", error);
        return false;
    }
} 