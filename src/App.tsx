import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { MonthProvider } from "@/components/layout/month-context";
import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { TransacoesClient } from "@/components/transactions/transacoes-client";
import { ContasClient } from "@/components/bills/contas-client";
import { RelatoriosClient } from "@/components/reports/relatorios-client";
import { CategoriasClient } from "@/components/categories/categorias-client";
import { ContasBancariasClient } from "@/components/accounts/contas-bancarias-client";
import { getCurrentMonth } from "@/lib/utils";

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <MonthProvider>
      <div className="min-h-screen">
        <Sidebar />
        <main className="lg:ml-64 pt-14 lg:pt-0 h-screen lg:h-screen overflow-y-auto">
          <div className="p-4 lg:p-8">{children}</div>
        </main>
      </div>
    </MonthProvider>
  );
}

function DashboardPage() {
  return (
    <>
      <Header title="Dashboard" description="Visao geral das suas financas" />
      <DashboardClient />
    </>
  );
}

function TransacoesPage() {
  return (
    <>
      <Header title="Lancamentos" description="Gerencie suas receitas e despesas" />
      <TransacoesClient />
    </>
  );
}

function ContasPage() {
  const { month, year } = getCurrentMonth();
  return (
    <>
      <Header title="Contas Fixas" description="Controle suas contas mensais" />
      <ContasClient initialMonth={month} initialYear={year} />
    </>
  );
}

function RelatoriosPage() {
  return (
    <>
      <Header title="Relatorios" description="Analise detalhada das suas financas" />
      <RelatoriosClient />
    </>
  );
}

function CategoriasPage() {
  return (
    <>
      <Header title="Categorias" description="Organize seus lancamentos" />
      <CategoriasClient />
    </>
  );
}

function ContasBancariasPage() {
  return (
    <>
      <Header title="Contas Bancarias" description="Gerencie suas contas" />
      <ContasBancariasClient />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppLayout>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/transacoes" element={<TransacoesPage />} />
          <Route path="/contas" element={<ContasPage />} />
          <Route path="/relatorios" element={<RelatoriosPage />} />
          <Route path="/categorias" element={<CategoriasPage />} />
          <Route path="/contas-bancarias" element={<ContasBancariasPage />} />
        </Routes>
      </AppLayout>
    </BrowserRouter>
  );
}
