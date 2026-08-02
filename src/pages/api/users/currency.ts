import type { APIRoute } from "astro";
import { jsonResponse, errorResponse, requireUserId, readJsonBody, withErrorHandling } from "@/lib/api-helpers.ts";
import { UserRepository } from "@/lib/modules/users/repository.ts";

const repo = new UserRepository();

export const GET: APIRoute = withErrorHandling(async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const currency = await repo.getPreferredCurrency(uid);
  return jsonResponse({ currency });
});

export const PUT: APIRoute = withErrorHandling(async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const body = await readJsonBody(context);
  if (!body) return errorResponse("Body inválido", 400);
  if (!body.currency || !["EUR", "MXN", "USD"].includes(body.currency as string)) {
    return errorResponse("Invalid currency");
  }

  await repo.setPreferredCurrency(uid, body.currency as string);
  return jsonResponse({ currency: body.currency });
});
