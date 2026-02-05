
export const ALLOWED_EMAILS = [
    'samuelsilvamanso@gmail.com',
    'sarahsilvamanso@gmail.com',
    'nailamanso@gmail.com',
    'mayra.manso@hotmail.com'
];

export async function checkAllowlist(userId, clerkClient) {
    try {
        const user = await clerkClient.users.getUser(userId);
        // Get primary email or just check any verified email
        // Ideally primary, but checking if ANY of their emails is allowed is also safe enough and more flexible
        // But strict security usually demands primary. Let's stick to the list logic.
        
        // Find the email string
        const primaryEmailObj = user.emailAddresses.find(e => e.id === user.primaryEmailAddressId);
        const userEmail = primaryEmailObj ? primaryEmailObj.emailAddress : null;
        
        if (!userEmail || !ALLOWED_EMAILS.includes(userEmail)) {
            return { allowed: false, email: userEmail };
        }
        return { allowed: true, email: userEmail };
    } catch (error) {
        console.error('Allowlist check error:', error);
        // Fail closed (deny access on error)
        return { allowed: false, error: error.message };
    }
}
