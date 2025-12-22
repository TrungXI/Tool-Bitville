/**
 * Vercel Serverless Function Entry Point
 * 
 * This file exports the Elysia app handler for Vercel deployment
 */

import app from "../src/index";

// Export handler for Vercel
// Elysia's handle method works with Vercel's request/response format
export default async (req: Request) => {
    return app.handle(req);
};

