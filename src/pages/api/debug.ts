import type { APIRoute } from "astro";
import { UserRepository } from "@/lib/modules/users/repository.ts";

export const GET: APIRoute = async (context) => {
  const { userId: clerkId } = context.locals.auth();
  const dbUserId = context.locals.userId;

  let dbUser = null;
  try {
    if (clerkId) {
      dbUser = await new UserRepository().findByClerkId(clerkId);
    }
  } catch {}

  return new Response(JSON.stringify({
    clerkId,
    dbUserId,
    dbUserFound: !!dbUser,
    dbUser: dbUser ? { id: dbUser.id, clerk_id: dbUser.clerk_id, email: dbUser.email } : null,
    hasAuth: !!context.locals.auth,
    authToken: context.locals.authToken,
    authStatus: context.locals.authStatus,
  }, null, 2), {
    headers: { "Content-Type": "application/json" },
  });
};
