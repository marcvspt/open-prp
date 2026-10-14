import type { APIRoute } from "astro";
import { errorResponse } from "@/lib/server/api-helpers.ts";

export const DELETE: APIRoute = async () => {
  return errorResponse("predefined-category-readonly", 400);
};

export const PUT: APIRoute = async () => {
  return errorResponse("predefined-category-readonly", 400);
};
