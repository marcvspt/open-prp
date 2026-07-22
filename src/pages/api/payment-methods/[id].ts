import type { APIRoute } from "astro";
import { jsonResponse, errorResponse, requireUserId } from "@/lib/api-helpers.ts";
import { PaymentMethodRepository } from "@/lib/modules/payment-methods/repository.ts";

const repo = new PaymentMethodRepository();

export const PATCH: APIRoute = async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const body = await context.request.json();
  const method = await repo.update(context.params.id!, body, uid);
  if (!method) return errorResponse("Not found", 404);

  return jsonResponse(method);
};

export const PUT: APIRoute = async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const body = await context.request.json();
  const method = await repo.update(context.params.id!, body, uid);
  if (!method) return errorResponse("Not found", 404);

  return jsonResponse(method);
};

export const DELETE: APIRoute = async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const deleted = await repo.delete(context.params.id!, uid);
  if (!deleted) return errorResponse("Not found", 404);

  return jsonResponse({ deleted: true });
};
