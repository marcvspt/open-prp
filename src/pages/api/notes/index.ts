import { createIndexRoutes } from "@/lib/server/api-routes.ts";
import { parseBoolParam } from "@/lib/server/api-helpers.ts";
import { NoteRepository } from "@/lib/modules/notes/repository.ts";

export const { GET, POST } = createIndexRoutes(new NoteRepository(), {
  buildFilter: (params) => ({
    is_pinned: parseBoolParam(params.is_pinned),
    tag_id: params.tag_id,
  }),
});
