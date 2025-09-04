import { getSignedUrlForObject } from "@/integrations/aws/client";

export async function testS3Connection(key: string) {
    try {
        console.log("Testing S3 connection for key:", key);

        // Generate a signed URL with 1 hour expiration
        const signedUrl = await getSignedUrlForObject(key, 3600);

        console.log("Generated signed URL:", signedUrl);

        return {
            success: true,
            url: signedUrl,
            expires: new Date(Date.now() + 3600 * 1000).toISOString()
        };
    } catch (error) {
        console.error("S3 connection test failed:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}
