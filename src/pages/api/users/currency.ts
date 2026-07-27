import type { APIRoute } from "astro";
import { jsonResponse, errorResponse, requireUserId } from "@/lib/api-helpers.ts";
import { UserRepository } from "@/lib/modules/users/repository.ts";

const repo = new UserRepository();

export const GET: APIRoute = async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const currency = await repo.getPreferredCurrency(uid);
  return jsonResponse({ currency });
};

export const PUT: APIRoute = async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const body = await context.request.json();
  if (!body.currency || !["EUR", "MXN", "USD"].includes(body.currency)) {
    return errorResponse("Invalid currency");
  }

  await repo.setPreferredCurrency(uid, body.currency);
  return jsonResponse({ currency: body.currency });
};
