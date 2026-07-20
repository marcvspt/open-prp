import type { APIRoute } from "astro";
import { jsonResponse, errorResponse, requireUserId } from "@/lib/api-helpers";
import { TransactionRepository } from "@/lib/modules/transactions/repository";

const repo = new TransactionRepository();

export const GET: APIRoute = async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const transaction = await repo.findById(context.params.id!, uid);
  if (!transaction) return errorResponse("Not found", 404);

  return jsonResponse(transaction);
};

export const PATCH: APIRoute = async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const body = await context.request.json();
  const transaction = await repo.update(context.params.id!, body, uid);
  if (!transaction) return errorResponse("Not found", 404);

  return jsonResponse(transaction);
};

export const PUT: APIRoute = async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const body = await context.request.json();
  const transaction = await repo.update(context.params.id!, body, uid);
  if (!transaction) return errorResponse("Not found", 404);

  return jsonResponse(transaction);
};

export const DELETE: APIRoute = async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const deleted = await repo.delete(context.params.id!, uid);
  if (!deleted) return errorResponse("Not found", 404);

  return jsonResponse({ deleted: true });
};
