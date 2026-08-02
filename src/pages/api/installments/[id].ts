import { createIdRoutes } from "@/lib/api-routes.ts";
import { InstallmentRepository } from "@/lib/modules/installments/repository.ts";

export const { GET, PATCH, PUT, DELETE } = createIdRoutes(new InstallmentRepository());
