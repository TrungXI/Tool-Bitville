/**
 * Vercel Serverless Function Entry Point
 * 
 * This file exports the Elysia app handler for Vercel deployment
 */

import app from "../src/index";

// Vercel timeout limits:
// - Hobby: 10 seconds
// - Pro: 60 seconds
// Set a safety timeout slightly below the limit
const FUNCTION_TIMEOUT = 8000; // 8 seconds for Hobby plan

// Export handler for Vercel
// Wrap in try-catch to handle any initialization errors gracefully
export default async (req: Request): Promise<Response> => {
    // Create a timeout promise
    const timeoutPromise = new Promise<Response>((resolve) => {
        setTimeout(() => {
            resolve(new Response(
                JSON.stringify({
                    ok: false,
                    error: "Gateway Timeout",
                    message: "Function execution exceeded time limit"
                }),
                {
                    status: 504,
                    headers: {
                        "Content-Type": "application/json"
                    }
                }
            ));
        }, FUNCTION_TIMEOUT);
    });

    // Race between actual handler and timeout
    try {
        const handlerPromise = app.handle(req);
        const response = await Promise.race([handlerPromise, timeoutPromise]);
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

