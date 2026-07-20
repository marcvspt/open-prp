import type { APIRoute } from "astro";
import { jsonResponse, errorResponse, requireUserId } from "@/lib/api-helpers";
import { CashbackRepository } from "@/lib/modules/cashback/repository";

const repo = new CashbackRepository();

export const GET: APIRoute = async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const cashback = await repo.findById(context.params.id!, uid);
  if (!cashback) return errorResponse("Not found", 404);

  return jsonResponse(cashback);
};

export const PUT: APIRoute = async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const body = await context.request.json();
  const cashback = await repo.update(context.params.id!, body, uid);
  if (!cashback) return errorResponse("Not found", 404);

  return jsonResponse(cashback);
};

export const PATCH: APIRoute = async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const body = await context.request.json();
  const cashback = await repo.update(context.params.id!, body, uid);
  if (!cashback) return errorResponse("Not found", 404);

  return jsonResponse(cashback);
};

export const DELETE: APIRoute = async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const deleted = await repo.delete(context.params.id!, uid);
  if (!deleted) return errorResponse("Not found", 404);

  return jsonResponse({ deleted: true });
};
