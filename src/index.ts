import * as cards from "./cards";
import * as contact from "./contact";
import * as admin from "./admin";

export default {
  async fetch(request: Request): Promise<Response> {
    const path = new URL(request.url).pathname;
    if (path === "/admin" || path === "/admin/") return request.method === "GET" ? admin.page(request) : new Response("Method not allowed", { status: 405 });
    if (path === "/admin/login") {
      if (request.method === "GET") return Response.redirect(new URL("/admin/", request.url), 302);
      return request.method === "POST" ? admin.login(request) : new Response("Method not allowed", { status: 405 });
    }
    if (path === "/admin/logout") return request.method === "POST" ? admin.logout(request) : new Response("Method not allowed", { status: 405 });
    const handler = path === "/api/cards" ? cards : path === "/api/contact" ? contact : null;
    if (!handler) return new Response("Not found", { status: 404 });
    if (request.method === "OPTIONS") return handler.OPTIONS(request);
    if (request.method === "POST") return handler.POST(request);
    return new Response("Method not allowed", { status: 405, headers: { allow: "POST, OPTIONS" } });
  },
};
