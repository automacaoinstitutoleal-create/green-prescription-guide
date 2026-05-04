import { ReactNode, useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { BrandLockup, BrandMark } from "@/components/BrandMark";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  UserCog,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Shield,
} from "lucide-react";

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  end?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Pacientes", icon: Users, end: true },
  { to: "/biblioteca", label: "Biblioteca científica", icon: BookOpen },
  { to: "/perfil", label: "Meu perfil", icon: UserCog },
];

interface DoctorSummary {
  full_name: string;
  crm: string;
  specialty: string;
}

interface AppShellProps {
  children: ReactNode;
  /** Subtítulo opcional acima do conteúdo, no header da página. */
  pageTitle?: string;
  /** Eyebrow exibido acima do título. */
  pageEyebrow?: string;
  /** Texto/JSX de descrição abaixo do título. */
  pageDescription?: ReactNode;
  /** Slot para botões de ação no header da página. */
  pageActions?: ReactNode;
  /** Trilha de navegação acima do título — array de { label, href? }. */
  breadcrumbs?: { label: string; href?: string }[];
}

export function AppShell({
  children,
  pageTitle,
  pageEyebrow,
  pageDescription,
  pageActions,
  breadcrumbs,
}: AppShellProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [doctor, setDoctor] = useState<DoctorSummary | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("doctor_profiles")
      .select("full_name, crm, specialty")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data) setDoctor(data);
      });
  }, [user]);

  // Fecha drawer mobile ao mudar de rota
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const initials = doctor
    ? doctor.full_name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "—";

  return (
    <div className="min-h-screen bg-background">
      {/* ─────────────── SIDEBAR (desktop fixa, mobile drawer) ─────────────── */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[246px] flex-col border-r border-sidebar-border bg-sidebar transition-transform duration-200 lg:translate-x-0",
          mobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        )}
      >
        {/* Logo / topo */}
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-5">
          <BrandLockup size={26} />
          <button
            onClick={() => setMobileOpen(false)}
            className="rounded-md p-1.5 text-ink-soft hover:bg-sidebar-accent lg:hidden"
            aria-label="Fechar menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Bloco do médico */}
        {doctor && (
          <div className="mx-3 mt-3 rounded-lg border border-sidebar-border bg-surface px-3 py-2.5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-[12px] font-semibold tracking-wider text-primary-foreground">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-foreground">
                  Dr(a). {doctor.full_name.split(" ")[0]}
                </p>
                <p className="truncate font-mono text-[10.5px] text-ink-soft">
                  CRM {doctor.crm} · {doctor.specialty}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Navegação */}
        <nav className="mt-5 flex-1 space-y-0.5 px-3">
          <p className="eyebrow mb-2 px-2">Navegação</p>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    "group flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-ink-soft hover:bg-sidebar-accent/60 hover:text-foreground"
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={cn(
                        "h-4 w-4 shrink-0 transition-colors",
                        isActive ? "text-primary" : "text-ink-soft group-hover:text-foreground"
                      )}
                    />
                    <span className="flex-1">{item.label}</span>
                    {isActive && <ChevronRight className="h-3 w-3 text-primary" />}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Rodapé da sidebar */}
        <div className="border-t border-sidebar-border p-3">
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-[12.5px] font-medium text-ink-soft transition-colors hover:bg-sidebar-accent/60 hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
            Encerrar sessão
          </button>
          <div className="mt-3 flex items-center justify-between border-t border-sidebar-border pt-3">
            <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-ink-soft">
              <Shield className="h-3 w-3" /> CFM 2.113/14
            </span>
            <span className="font-mono text-[10px] text-ink-soft">v1.0</span>
          </div>
        </div>
      </aside>

      {/* Overlay mobile */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-foreground/30 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ─────────────── ÁREA DO CONTEÚDO ─────────────── */}
      <div className="lg:pl-[246px]">
        {/* Top bar mobile (só aparece < lg) */}
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur lg:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-md p-1.5 text-ink-soft hover:bg-surface-2"
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <BrandMark size={24} />
          <span className="font-display text-[15px] font-semibold tracking-tight">
            Greenlion <span className="font-normal italic text-primary">Precision</span>
          </span>
        </header>

        {/* Header de página */}
        {(pageTitle || breadcrumbs) && (
          <div className="border-b border-border bg-background">
            <div className="page-content !py-7">
              {breadcrumbs && breadcrumbs.length > 0 && (
                <nav className="mb-3 flex items-center gap-1.5 text-[12px] text-ink-soft">
                  {breadcrumbs.map((crumb, i) => (
                    <span key={i} className="flex items-center gap-1.5">
                      {i > 0 && <ChevronRight className="h-3 w-3" />}
                      {crumb.href ? (
                        <NavLink to={crumb.href} className="hover:text-foreground">
                          {crumb.label}
                        </NavLink>
                      ) : (
                        <span className="text-foreground">{crumb.label}</span>
                      )}
                    </span>
                  ))}
                </nav>
              )}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  {pageEyebrow && <p className="eyebrow mb-2">{pageEyebrow}</p>}
                  {pageTitle && (
                    <h1 className="font-display text-[34px] font-semibold leading-[1.05] tracking-tight text-foreground">
                      {pageTitle}
                    </h1>
                  )}
                  {pageDescription && (
                    <div className="mt-2 max-w-2xl text-[14px] text-ink-soft">
                      {pageDescription}
                    </div>
                  )}
                </div>
                {pageActions && <div className="flex flex-wrap items-center gap-2">{pageActions}</div>}
              </div>
            </div>
          </div>
        )}

        {/* Conteúdo */}
        <main className="page-content animate-fade-up">{children}</main>
      </div>
    </div>
  );
}
