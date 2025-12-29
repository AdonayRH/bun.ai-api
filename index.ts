const server = Bun.serve({
    port: process.env.PORT || 8080,
    async fetch(req) {
        return new Response("Hello World!");
    },
});

console.log(`Server running at ${server.url}:${server.port}`);
