import type { APIRoute } from "astro";
import { jsonResponse, errorResponse, requireUserId } from "@/lib/api-helpers.ts";
import { PaymentMethodRepository } from "@/lib/modules/payment-methods/repository.ts";

const repo = new PaymentMethodRepository();

export const GET: APIRoute = async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const methods = await repo.findAll(uid);
  return jsonResponse(methods);
};

export const POST: APIRoute = async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const body = await context.request.json();
  if (!body.name) {
    return errorResponse("name is required");
  }

  const method = await repo.create(body, uid);
  return jsonResponse(method, 201);
};
