// Vercel serverless entry — re-exports the Express app as the function handler.
// All routes are defined in ../src/server.js.
import app from "../src/server.js";

export default app;
