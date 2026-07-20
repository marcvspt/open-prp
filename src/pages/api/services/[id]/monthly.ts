import type { APIRoute } from "astro";
import { jsonResponse, errorResponse, requireUserId } from "@/lib/api-helpers";
import { ServiceRepository } from "@/lib/modules/services/repository";

const repo = new ServiceRepository();

export const GET: APIRoute = async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const month = context.url.searchParams.get("month");
  if (!month) return errorResponse("month query param is required (YYYY-MM)");

  const service = await repo.findById(context.params.id!, uid);
  if (!service) return errorResponse("Not found", 404);

  const monthly = await repo.getMonthly(context.params.id!, month);
  return jsonResponse(monthly);
};

export const PUT: APIRoute = async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const month = context.url.searchParams.get("month");
  if (!month) return errorResponse("month query param is required (YYYY-MM)");

  const body = await context.request.json();
  const monthly = await repo.upsertMonthly(context.params.id!, month, body);
  return jsonResponse(monthly);
};

export const PATCH: APIRoute = async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const month = context.url.searchParams.get("month");
  if (!month) return errorResponse("month query param is required (YYYY-MM)");

  const body = await context.request.json();
  const monthly = await repo.upsertMonthly(context.params.id!, month, body);
  return jsonResponse(monthly);
};
