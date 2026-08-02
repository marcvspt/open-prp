import type { APIContext, APIRoute } from "astro";
import { errorResponse, getSearchParams, jsonResponse, readJsonBody, requireUserId, withErrorHandling } from "@/lib/api-helpers.ts";

interface IdCrudRepo<T, U> {
  findById: (id: string, userId: string) => Promise<T | null>;
  update: (id: string, data: U, userId: string) => Promise<T | null>;
  delete: (id: string, userId: string) => Promise<boolean>;
}

interface IdRouteOptions {
  get?: boolean;
  patch?: boolean;
  put?: boolean;
  delete?: boolean;
  notFoundMessage?: string;
}

/** Handlers GET/PATCH/PUT/DELETE for a "/api/[id]" CRUD route. */
export function createIdRoutes<T, U>(repo: IdCrudRepo<T, U>, options: IdRouteOptions = {}) {
  const { get = true, patch = true, put = true, delete: del = true, notFoundMessage = "Not found" } = options;
  const notFound = () => errorResponse(notFoundMessage, 404);

  const routes: Record<string, APIRoute> = {};

  if (get) {
    routes.GET = withErrorHandling(async (context) => {
      const uid = requireUserId(context);
      if (uid instanceof Response) return uid;

      const row = await repo.findById(context.params.id!, uid);
      if (!row) return notFound();

      return jsonResponse(row);
    });
  }

  const writeHandler: APIRoute = withErrorHandling(async (context) => {
    const uid = requireUserId(context);
    if (uid instanceof Response) return uid;

    const body = await readJsonBody(context);
    if (!body) return errorResponse("Body inválido", 400);

    const row = await repo.update(context.params.id!, body as unknown as U, uid);
    if (!row) return notFound();

    return jsonResponse(row);
  });

  if (patch) routes.PATCH = writeHandler;
  if (put) routes.PUT = writeHandler;

  if (del) {
    routes.DELETE = withErrorHandling(async (context) => {
      const uid = requireUserId(context);
      if (uid instanceof Response) return uid;

      const ok = await repo.delete(context.params.id!, uid);
      if (!ok) return notFound();

      return jsonResponse({ deleted: true });
    });
  }

  return routes;
}

interface IndexCrudRepo<F, C> {
  findAll: (userId: string, filter?: F) => Promise<unknown>;
  create: (data: C, userId: string) => Promise<unknown>;
}

interface IndexRouteOptions<F> {
  buildFilter?: (params: Record<string, string | undefined>, context: APIContext) => F;
  validateCreate?: (body: Record<string, unknown>) => string | null;
}

/** Handlers GET/POST for a "/api/" CRUD list route. */
export function createIndexRoutes<F, C>(repo: IndexCrudRepo<F, C>, options: IndexRouteOptions<F> = {}) {
  const GET: APIRoute = withErrorHandling(async (context) => {
    const uid = requireUserId(context);
    if (uid instanceof Response) return uid;

    const result = options.buildFilter
      ? await repo.findAll(uid, options.buildFilter(getSearchParams(context), context))
      : await repo.findAll(uid);

    return jsonResponse(result);
  });

  const POST: APIRoute = withErrorHandling(async (context) => {
    const uid = requireUserId(context);
    if (uid instanceof Response) return uid;

    const body = await readJsonBody(context);
    if (!body) return errorResponse("Body inválido", 400);

    const error = options.validateCreate?.(body);
    if (error) return errorResponse(error);

    const row = await repo.create(body as unknown as C, uid);
    return jsonResponse(row, 201);
  });

  return { GET, POST };
}
