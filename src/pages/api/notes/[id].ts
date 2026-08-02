import { createIdRoutes } from "@/lib/api-routes.ts";
import { NoteRepository } from "@/lib/modules/notes/repository.ts";

export const { GET, PATCH, PUT, DELETE } = createIdRoutes(new NoteRepository());
