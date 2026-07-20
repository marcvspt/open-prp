import { clerkMiddleware } from "@clerk/astro/server";
import { UserRepository } from "@/lib/modules/users/repository";

export const onRequest = clerkMiddleware(async (auth, context, next) => {
  try {
    const { userId: clerkId } = auth();
    if (clerkId) {
      const repo = new UserRepository();
      const user = await repo.findOrCreate(clerkId, "");
      context.locals.userId = user.id;
    }
  } catch (e) {
    console.error("Middleware user resolution failed:", e);
  }
  return next();
});
