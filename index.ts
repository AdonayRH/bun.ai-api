import { groqService } from "./services/groq";
import { cerebrasService } from "./services/cerebras";
import type { AIService, ChatMessage } from "./types";
import { join } from "path";

const services: AIService[] = [
    groqService,
    cerebrasService,
];
let currentServiceIndex = 0;

function getNextService() {
    const service = services[currentServiceIndex];
    currentServiceIndex = (currentServiceIndex + 1) % services.length;
    return service;
}

// MIME types for static files
const mimeTypes: Record<string, string> = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
};

const server = Bun.serve({
    port: process.env.PORT,
    async fetch(req) {
        const { pathname } = new URL(req.url);

        // CORS headers
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        };

        // Handle preflight requests
        if (req.method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
        }

        // Chat API endpoint
        if (pathname === '/chat' && req.method === 'POST') {
            const { messages } = await req.json() as { messages: ChatMessage[] };
            const service = getNextService();

            console.log(`Using ${service?.name} service`);
            const stream = await service?.chat(messages);

            return new Response(stream, {
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'text/event-stream',
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive'
                }
            });
        }

        // Serve static files
        let filePath = pathname === '/' ? '/index.html' : pathname;
        const fullPath = join(import.meta.dir, 'public', filePath);

        try {
            const file = Bun.file(fullPath);
            const exists = await file.exists();

            if (exists) {
                const ext = filePath.substring(filePath.lastIndexOf('.'));
                const contentType = mimeTypes[ext] || 'application/octet-stream';

                return new Response(file, {
                    headers: {
                        ...corsHeaders,
                        'Content-Type': contentType,
                    }
                });
            }
        } catch (e) {
            // File not found, continue to 404
        }

        return new Response("Not found", { status: 404, headers: corsHeaders });
    },
});

console.log(`Server running at ${server.url}`);

