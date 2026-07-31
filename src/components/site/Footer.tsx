import { Link } from "@tanstack/react-router";

export function Footer() {
  return (
    <footer className="border-t border-border/60 bg-secondary/40">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <p className="font-display text-lg font-semibold tracking-tight text-primary">
              Vision Club
            </p>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
              Clube de assinatura que democratiza o acesso a lentes de grau por meio de
              condições exclusivas negociadas com laboratórios parceiros.
            </p>
          </div>

          <div>
            <p className="text-sm font-medium text-foreground">Plataforma</p>
            <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
              <li><Link to="/sobre" className="hover:text-primary">Sobre</Link></li>
              <li><Link to="/como-funciona" className="hover:text-primary">Como funciona</Link></li>
              <li><Link to="/planos" className="hover:text-primary">Planos</Link></li>
              <li><Link to="/faq" className="hover:text-primary">FAQ</Link></li>
            </ul>
          </div>

          <div>
            <p className="text-sm font-medium text-foreground">Contato</p>
            <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
              <li><Link to="/contato" className="hover:text-primary">Fale conosco</Link></li>
              <li>WhatsApp</li>
              <li>Instagram</li>
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-3 border-t border-border/60 pt-6 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} Vision Club. Todos os direitos reservados.</p>
          <p>O Vision Club não comercializa lentes. Oferece acesso a benefícios exclusivos.</p>
        </div>
      </div>
    </footer>
  );
}
