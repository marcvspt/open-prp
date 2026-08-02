import { createIndexRoutes } from "@/lib/api-routes.ts";
import { parsePageParams } from "@/lib/api-helpers.ts";
import { EventRepository } from "@/lib/modules/events/repository.ts";

export const { GET, POST } = createIndexRoutes(new EventRepository(), {
  buildFilter: (params, context) => {
    const { page, pageSize } = parsePageParams(context.url);
    return {
      status: params.status,
      category_id: params.category_id,
      date_from: params.date_from,
      date_to: params.date_to,
      page,
      pageSize,
    };
  },
  validateCreate: (body) =>
    !body.description || !body.start_date
      ? "description and start_date are required"
      : null,
});
