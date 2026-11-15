import { lazy, Suspense, useEffect, useRef, useState } from "react";
import ErrorBoundary from "@/components/ui/ErrorBoundary.tsx";
import LoadingSpinner from "@/components/app/ui/LoadingSpinner.tsx";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider.tsx";
import { getLocaleDict, type LocaleCode } from "@/lib/i18n/locale.ts";
import type { CategoryExpenseGroup, DailyActivityGroup, MovementBreakdownGroup } from "@/lib/types/dashboard.ts";

const DailyActivityChart = lazy(() => import("@/components/app/dashboard/DailyActivityChart.tsx"));
const CategoryExpensesChart = lazy(() => import("@/components/app/dashboard/CategoryExpensesChart.tsx"));
const MonthlyMovementCharts = lazy(() => import("@/components/app/dashboard/MonthlyMovementCharts.tsx"));

interface Props {
  dailyActivity: DailyActivityGroup[];
  categoryExpenses: CategoryExpenseGroup[];
  movementBreakdown: MovementBreakdownGroup[];
  preferredCurrency?: string;
  locale: LocaleCode;
}

export default function DashboardAnalytics({ dailyActivity, categoryExpenses, movementBreakdown, preferredCurrency, locale }: Props) {
  const t = getLocaleDict(locale);
  const ref = useRef<HTMLDivElement>(null);
  const [opened, setOpened] = useState(false);

  useEffect(() => {
    const panel = ref.current?.closest("[data-tab-content]");
    if (!panel) return;
    const activate = () => {
      if (!panel.classList.contains("hidden")) {
        setOpened(true);
        observer.disconnect();
      }
    };
    const observer = new MutationObserver(activate);
    observer.observe(panel, { attributes: true, attributeFilter: ["class"] });
    activate();
    return () => observer.disconnect();
  }, []);

  const loadingChart = <div className="grid min-h-48 place-items-center"><LoadingSpinner label={t.common.loading} /></div>;

  return (
    <div ref={ref} className="space-y-4">
      <LocaleProvider locale={locale}>
        <section aria-labelledby="dashboard-daily-activity" className="space-y-4 rounded-xl border border-border bg-panel p-4 shadow-sm">
          <h2 id="dashboard-daily-activity" className="text-base font-semibold text-string">{t.dashboard.dailyActivityTitle}</h2>
          {dailyActivity.length > 0 ? (
            <ErrorBoundary>
              <Suspense fallback={loadingChart}>
                {opened ? <DailyActivityChart groups={dailyActivity} preferredCurrency={preferredCurrency} locale={locale} /> : loadingChart}
              </Suspense>
            </ErrorBoundary>
          ) : <p className="text-sm text-string-muted">{t.dashboard.noDailyActivity}</p>}
        </section>
        <section aria-labelledby="dashboard-category-expenses" className="space-y-4 rounded-xl border border-border bg-panel p-4 shadow-sm">
          <h2 id="dashboard-category-expenses" className="text-base font-semibold text-string">{t.dashboard.categoryExpensesTitle}</h2>
          {categoryExpenses.length > 0 ? (
            <ErrorBoundary>
              <Suspense fallback={loadingChart}>
                {opened ? <CategoryExpensesChart groups={categoryExpenses} preferredCurrency={preferredCurrency} locale={locale} /> : loadingChart}
              </Suspense>
            </ErrorBoundary>
          ) : <p className="text-sm text-string-muted">{t.dashboard.noCategoryExpenses}</p>}
        </section>
        {movementBreakdown.length > 0 && (
          <ErrorBoundary>
            <Suspense fallback={loadingChart}>
              {opened ? <MonthlyMovementCharts groups={movementBreakdown} preferredCurrency={preferredCurrency} locale={locale} /> : loadingChart}
            </Suspense>
          </ErrorBoundary>
        )}
      </LocaleProvider>
    </div>
  );
}
