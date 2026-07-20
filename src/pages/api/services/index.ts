import type { APIRoute } from "astro";
import { jsonResponse, errorResponse, requireUserId, getSearchParams } from "@/lib/api-helpers";
import { ServiceRepository } from "@/lib/modules/services/repository";

const repo = new ServiceRepository();

export const GET: APIRoute = async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const params = getSearchParams(context);
  const services = await repo.findAll(uid, params.family_id);
  return jsonResponse(services);
};

export const POST: APIRoute = async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const body = await context.request.json();
  if (!body.name || !body.default_amount) {
    return errorResponse("name and default_amount are required");
  }

  const service = await repo.create(body, uid);
  return jsonResponse(service, 201);
};
