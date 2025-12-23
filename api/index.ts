/**
 * Vercel Serverless Function Entry Point
 * 
 * This file exports the Elysia app handler for Vercel deployment
 */

import app from "../src/index";

// Export handler for Vercel
// Wrap in try-catch to handle any initialization errors gracefully
export default async (req: Request): Promise<Response> => {
    try {
        // Elysia's handle method returns a Response
        const response = await app.handle(req);
        return response;
    } catch (error: any) {
        // Log error for debugging
        console.error("Vercel function error:", error);
        
        // Return a proper error response
        return new Response(
            JSON.stringify({
                ok: false,
                error: "Internal Server Error",
                message: error?.message || "An unexpected error occurred"
            }),
            {
                status: 500,
                headers: {
                    "Content-Type": "application/json"
                }
            }
        );
    }
};

