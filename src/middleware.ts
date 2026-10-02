import { clerkMiddleware, createClerkClient } from "@clerk/astro/server";
import { getRelativeLocaleUrl } from "astro:i18n";
import { UserRepository } from "@/lib/modules/users/repository.ts";
import { isAvailableMonth } from "@/lib/date.ts";
import { errorResponse } from "@/lib/api-helpers.ts";
import { getLocaleDict, resolveLocale } from "@/lib/i18n/locale.ts";

const clerkApi = createClerkClient({ secretKey: import.meta.env.CLERK_SECRET_KEY });

export const onRequest = clerkMiddleware(async (auth, context, next) => {
  try {
    const { userId: clerkId } = auth();
    if (clerkId) {
      const repo = new UserRepository();
      const user = await repo.findOrCreate(clerkId, "", undefined);

      if (!user.email || !user.display_name) {
        try {
          const clerkUser = await clerkApi.users.getUser(clerkId);
          const email = clerkUser.emailAddresses?.[0]?.emailAddress ?? "";
          const name = clerkUser.fullName ?? clerkUser.firstName ?? undefined;
          await repo.syncProfile(user.id, email, name);
        } catch {
          console.error("Failed to fetch Clerk user data");
        }
      }

      context.locals.userId = user.id;
      context.locals.createdAt = user.created_at;
      context.locals.user = user;
    } else {
      const locale = context.currentLocale ?? "es";
      const appPath = getRelativeLocaleUrl(locale, "/app");
      const loginPath = getRelativeLocaleUrl(locale, "/app/login");
      const path = context.url.pathname;

      if (path === "/app" || path.startsWith("/app/")) {
        return context.redirect(`/es${path}`);
      }

      const isAppRoute = path === appPath || path.startsWith(`${appPath}/`);
      const isLogin = path === loginPath;
      if (isAppRoute && !isLogin) {
        return context.redirect(loginPath);
      }
    }
  } catch {
    console.error("Middleware user resolution failed");
  }
  if (context.locals.userId && context.request.method === "GET") {
    const url = new URL(context.url);
    const invalidKeys = ["month", "summary_month"].filter(key =>
      url.searchParams.getAll(key).some(month => month !== "" && !isAvailableMonth(month, context.locals.createdAt))
    );
    if (invalidKeys.length > 0) {
      if (url.pathname.startsWith("/api/")) {
        const t = getLocaleDict(resolveLocale(context.currentLocale));
        return errorResponse(t.error.monthUnavailable, 400);
      }
      if (/^\/(es|en)\/app(?:\/|$)/.test(url.pathname)) {
        for (const key of invalidKeys) url.searchParams.delete(key);
        return context.redirect(`${url.pathname}${url.search}`, 302);
      }
    }
  }
  return next();
});
