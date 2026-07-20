import type { APIRoute } from "astro";
import { jsonResponse, errorResponse, requireUserId } from "@/lib/api-helpers";
import { CardMonthlyRepository } from "@/lib/modules/card-monthly/repository";

const repo = new CardMonthlyRepository();

export const GET: APIRoute = async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const items = await repo.getHistory(uid);
  return jsonResponse(items);
};
