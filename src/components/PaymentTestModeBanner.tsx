const clientToken = import.meta.env["VITE_PAYMENTS_CLIENT_TOKEN"] as string | undefined;

export function PaymentTestModeBanner() {
  if (!clientToken) {
    return (
      <div className="w-full border-b border-destructive/30 bg-destructive/10 px-4 py-2 text-center text-sm text-destructive">
        Os pagamentos reais ainda não estão configurados neste site.
      </div>
    );
  }
  if (clientToken.startsWith("pk_test_")) {
    return (
      <div className="w-full border-b border-border bg-secondary px-4 py-2 text-center text-sm text-muted-foreground">
        Ambiente de testes: nenhum pagamento real é processado na pré-visualização.
      </div>
    );
  }
  return null;
}
