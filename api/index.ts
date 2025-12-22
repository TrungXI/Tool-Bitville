/**
 * Vercel Serverless Function Entry Point
 * 
 * This file exports the Elysia app handler for Vercel deployment
 */

import app from "../src/index";

// Export handler for Vercel
export default app.handle;

