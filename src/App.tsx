import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { MonthProvider } from "@/components/layout/month-context";
import { getCurrentMonth } from "@/lib/utils";

const DashboardClient = lazy(() =>
  import("@/components/dashboard/dashboard-client").then((m) => ({
    default: m.DashboardClient,
  }))
);
const TransacoesClient = lazy(() =>
  import("@/components/transactions/transacoes-client").then((m) => ({
    default: m.TransacoesClient,
  }))
);
const ContasClient = lazy(() =>
  import("@/components/bills/contas-client").then((m) => ({
    default: m.ContasClient,
  }))
);
const RelatoriosClient = lazy(() =>
  import("@/components/reports/relatorios-client").then((m) => ({
    default: m.RelatoriosClient,
  }))
);
const CategoriasClient = lazy(() =>
  import("@/components/categories/categorias-client").then((m) => ({
    default: m.CategoriasClient,
  }))
);
const ContasBancariasClient = lazy(() =>
  import("@/components/accounts/contas-bancarias-client").then((m) => ({
    default: m.ContasBancariasClient,
  }))
);
const ImportarPdfClient = lazy(() =>
  import("@/components/import/importar-pdf-client").then((m) => ({
    default: m.ImportarPdfClient,
  }))
);

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

function LoadingFallback() {
  return <div className="flex items-center justify-center h-screen">Carregando...</div>;
}

export default function App() {
  return (
    <BrowserRouter>
      <AppLayout>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route
              path="/"
              element={
                <>
                  <Header title="Dashboard" description="Visao geral das suas financas" />
                  <DashboardClient />
                </>
              }
            />
            <Route
              path="/transacoes"
              element={
                <>
                  <Header title="Lancamentos" description="Gerencie suas receitas e despesas" />
                  <TransacoesClient />
                </>
              }
            />
            <Route
              path="/contas"
              element={
                <>
                  <Header title="Contas Fixas" description="Controle suas contas mensais" />
                  <ContasClientWrapper />
                </>
              }
            />
            <Route
              path="/relatorios"
              element={
                <>
                  <Header title="Relatorios" description="Analise detalhada das suas financas" />
                  <RelatoriosClient />
                </>
              }
            />
            <Route
              path="/categorias"
              element={
                <>
                  <Header title="Categorias" description="Organize seus lancamentos" />
                  <CategoriasClient />
                </>
              }
            />
            <Route
              path="/contas-bancarias"
              element={
                <>
                  <Header title="Contas Bancarias" description="Gerencie suas contas" />
                  <ContasBancariasClient />
                </>
              }
            />
            <Route
              path="/importar"
              element={
                <>
                  <Header title="Importar PDF" description="Importe transacoes de extratos bancarios" />
                  <ImportarPdfClient />
                </>
              }
            />
          </Routes>
        </Suspense>
      </AppLayout>
    </BrowserRouter>
  );
}

function ContasClientWrapper() {
  const { month, year } = getCurrentMonth();
  return <ContasClient initialMonth={month} initialYear={year} />;
}
