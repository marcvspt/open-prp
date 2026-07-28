import type { APIRoute } from "astro";
import { jsonResponse, requireUserId } from "@/lib/api-helpers.ts";
import { UserRepository } from "@/lib/modules/users/repository.ts";

const repo = new UserRepository();

export const GET: APIRoute = async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const user = await repo.findById(uid);
  return jsonResponse({ createdAt: user?.created_at ?? null });
};
