import * as cards from "./cards";
import * as contact from "./contact";

export default {
  async fetch(request: Request): Promise<Response> {
    const path = new URL(request.url).pathname;
    const handler = path === "/api/cards" ? cards : path === "/api/contact" ? contact : null;
    if (!handler) return new Response("Not found", { status: 404 });
    if (request.method === "OPTIONS") return handler.OPTIONS(request);
    if (request.method === "POST") return handler.POST(request);
    if (request.method === "GET" && path === "/api/contact") return contact.GET(request);
    return new Response("Method not allowed", { status: 405, headers: { allow: path === "/api/contact" ? "GET, POST, OPTIONS" : "POST, OPTIONS" } });
  },
};
