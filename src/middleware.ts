import { clerkMiddleware, createClerkClient } from "@clerk/astro/server";
import { UserRepository } from "@/lib/modules/users/repository.ts";

const clerkApi = createClerkClient({ secretKey: import.meta.env.CLERK_SECRET_KEY });

export const onRequest = clerkMiddleware(async (auth, context, next) => {
  try {
    const { userId: clerkId } = auth();
    if (clerkId) {
      const repo = new UserRepository();
      const user = await repo.findOrCreate(clerkId, "", undefined);

      if (await repo.needsSync(clerkId)) {
        try {
          const clerkUser = await clerkApi.users.getUser(clerkId);
          const email = clerkUser.emailAddresses?.[0]?.emailAddress ?? "";
          const name = clerkUser.fullName ?? clerkUser.firstName ?? undefined;
          await repo.syncProfile(user.id, email, name);
        } catch (e) {
          console.error("Failed to fetch Clerk user data:", e);
        }
      }

      context.locals.userId = user.id;
      context.locals.createdAt = user.created_at;
    } else if (context.url.pathname.startsWith("/app") && context.url.pathname !== "/app/login") {
      return context.redirect("/app/login");
    }
  } catch (e) {
    console.error("Middleware user resolution failed:", e);
  }
  return next();
});
