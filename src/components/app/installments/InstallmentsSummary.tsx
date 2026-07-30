import { useMemo } from "react";
import type { Installment } from "@/lib/types/installment.ts";
import type { Card } from "@/lib/types/card.ts";
import type { PaymentMethod } from "@/lib/types/payment-method.ts";
import { formatCurrency } from "@/lib/format.ts";

interface InstallmentsSummaryProps {
  initialData: string;
  initialCards: string;
  initialPaymentMethods: string;
}

export default function InstallmentsSummary({ initialData, initialCards, initialPaymentMethods }: InstallmentsSummaryProps) {
  const installments: Installment[] = useMemo(() => JSON.parse(initialData), [initialData]);
  const cards: Card[] = useMemo(() => JSON.parse(initialCards), [initialCards]);
  const paymentMethods: PaymentMethod[] = useMemo(() => JSON.parse(initialPaymentMethods), [initialPaymentMethods]);

  if (installments.length === 0) {
    return <p className="text-string-muted text-sm">No hay plazos activos</p>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-panel border border-border shadow-sm text-center">
          <p className="text-xs text-string-muted mb-1">Plazos activos</p>
          <p className="text-2xl font-bold text-primary">{installments.length}</p>
        </div>
        <div className="p-4 rounded-xl bg-panel border border-border shadow-sm text-center">
          <p className="text-xs text-string-muted mb-1">Restante por pagar</p>
          <p className="text-2xl font-bold text-danger">{formatCurrency(installments.reduce((s, i) => s + Number(i.remaining_months) * Number(i.monthly_amount), 0))}</p>
        </div>
        <div className="p-4 rounded-xl bg-panel border border-border shadow-sm text-center">
          <p className="text-xs text-string-muted mb-1">Total de cuotas</p>
          <p className="text-2xl font-bold text-warning">{installments.reduce((s, i) => s + Number(i.total_months), 0)}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {installments.map(i => {
          const pm = paymentMethods.find(p => p.id === i.payment_method_id);
          const card = pm?.card_id ? cards.find(c => c.id === pm.card_id) : undefined;
          const remainingAmount = Number(i.remaining_months) * Number(i.monthly_amount);
          const totalAmount = Number(i.total_amount);
          return (
            <div key={i.id} className="bg-panel rounded-xl border border-border p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className={`text-xs font-medium px-2 py-0.5 rounded ${i.remaining_months <= 0 ? "bg-success-bg text-success-text" : i.remaining_months <= 3 ? "bg-warning-bg text-warning-text" : "bg-info-bg text-info-text"}`}>
                  {i.remaining_months}/{i.total_months}
                </span>
              </div>
              <p className="font-semibold text-sm text-string mb-1">{i.description}</p>
              <p className="text-xs text-string-muted mb-3">{card?.name ?? pm?.name ?? "Sin tarjeta"}</p>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-string-muted">Total</span>
                  <span className="font-mono font-medium text-string">{formatCurrency(totalAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-string-muted">Cuota</span>
                  <span className="font-mono font-medium text-danger">{formatCurrency(Number(i.monthly_amount))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-string-muted">Restante</span>
                  <span className="font-mono font-medium text-warning">{formatCurrency(remainingAmount)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
