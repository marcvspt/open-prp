import type { APIRoute } from "astro";
import { errorResponse } from "@/lib/api-helpers.ts";

export const DELETE: APIRoute = async () => {
  return errorResponse("Las categorías son predefinidas y no pueden eliminarse", 400);
};

export const PUT: APIRoute = async () => {
  return errorResponse("Las categorías son predefinidas y no pueden modificarse", 400);
};
