import type { APIRoute } from "astro";
import { jsonResponse, requireUserId } from "@/lib/api-helpers";
import { ServiceMonthlyRepository } from "@/lib/modules/service-monthly/repository";

const repo = new ServiceMonthlyRepository();

export const GET: APIRoute = async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const items = await repo.getHistory(uid);
  return jsonResponse(items);
};
