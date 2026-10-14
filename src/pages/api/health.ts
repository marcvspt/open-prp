import type { APIRoute } from "astro";
import { jsonResponse, errorResponse } from "@/lib/server/api-helpers.ts";
import { getDb } from "@/lib/server/db/client.ts";

export const GET: APIRoute = async () => {
    try {
        await getDb().execute("SELECT 1");
        return jsonResponse({ status: "ok" });
    } catch {
        return errorResponse("database-unavailable", 503);
    }
};
