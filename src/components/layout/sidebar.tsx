import {
  AlertCircle,
  BarChart3,
  BookOpen,
  Home,
  Menu,
  Tags,
  Wallet,
  X,
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useState } from "react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Dashboard", href: "/", icon: Home },
  { name: "Lancamentos", href: "/transacoes", icon: BookOpen },
  { name: "Contas Fixas", href: "/contas", icon: AlertCircle },
  { name: "Relatorios", href: "/relatorios", icon: BarChart3 },
  { name: "Categorias", href: "/categorias", icon: Tags },
  { name: "Contas Bancarias", href: "/contas-bancarias", icon: Wallet },
];

export function Sidebar() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile top bar */}
      <header className="lg:hidden fixed inset-x-0 top-0 z-50 flex h-14 items-center gap-3 border-b border-zinc-800 bg-zinc-950 px-4">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="rounded-md p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
          aria-label="Abrir menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">
            R
          </div>
          <span className="text-base font-bold text-white">ReConta</span>
        </div>
      </header>

      {/* Overlay */}
      {mobileOpen && (
        <button
          type="button"
          aria-label="Fechar menu"
          className="lg:hidden fixed inset-0 z-40 bg-black/60 cursor-default"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-zinc-800 bg-[#1a1a1a] transition-transform duration-200",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between gap-2 px-6 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">
              R
            </div>
            <span className="text-lg font-bold text-white">ReConta</span>
          </div>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="lg:hidden rounded-md p-1 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
            aria-label="Fechar menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4">
          <ul className="space-y-1">
            {navigation.map((item) => {
              const isActive =
                item.href === "/"
                  ? location.pathname === "/"
                  : location.pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <NavLink
                    to={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-indigo-600/20 text-indigo-400"
                        : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100",
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {item.name}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800">
          <p className="text-xs text-zinc-600 text-center">ReConta Desktop v0.1.0</p>
        </div>
      </aside>
    </>
  );
}
