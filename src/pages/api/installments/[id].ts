import { createIdRoutes } from "@/lib/server/api-routes.ts";
import { InstallmentRepository } from "@/lib/modules/installments/repository.ts";

export const { GET, PATCH, PUT, DELETE } = createIdRoutes(new InstallmentRepository());
