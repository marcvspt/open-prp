import type { APIRoute } from "astro";
import { jsonResponse, errorResponse, requireUserId } from "@/lib/api-helpers";
import { ServiceMonthlyRepository } from "@/lib/modules/service-monthly/repository";

const repo = new ServiceMonthlyRepository();

export const GET: APIRoute = async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const month = context.url.searchParams.get("month");
  if (!month) return errorResponse("month query param is required (YYYY-MM)");

  const items = await repo.findByMonth(month, uid);
  return jsonResponse(items);
};

export const PATCH: APIRoute = async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const body = await context.request.json();
  if (!body.id) return errorResponse("id is required");

  const item = await repo.togglePaid(body.id, uid, body.is_paid);
  if (!item) return errorResponse("Not found", 404);
  return jsonResponse(item);
};
