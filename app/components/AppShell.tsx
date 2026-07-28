import Link from "next/link";
import type { ReactNode } from "react";
import type { InvoicyUser } from "../auth";
import { signOutPath } from "../auth";
import { BrandMark } from "./BrandMark";

type AppShellProps = {
  active: "dashboard" | "invoices" | "clients" | "settings";
  children: ReactNode;
  user: InvoicyUser;
  businessName: string;
};

const links = [
  { id: "dashboard", href: "/dashboard", label: "Overview" },
  { id: "invoices", href: "/invoices", label: "Invoices" },
  { id: "clients", href: "/clients", label: "Clients" },
  { id: "settings", href: "/settings", label: "Business settings" },
] as const;

export function AppShell({
  active,
  children,
  user,
  businessName,
}: AppShellProps) {
  const initials = user.displayName
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <Link href="/dashboard" className="brand-link sidebar-brand">
          <BrandMark />
          <span className="brand-copy">
            <strong>Invoicy</strong>
            <small>{businessName}</small>
          </span>
        </Link>

        <nav className="sidebar-nav" aria-label="Application navigation">
          <p>Workspace</p>
          {links.map((link) => (
            <Link
              href={link.href}
              key={link.id}
              className={active === link.id ? "active" : undefined}
            >
              <span>{link.label}</span>
            </Link>
          ))}
        </nav>

        <div className="account-menu">
          <span className="account-avatar">{initials || "IV"}</span>
          <div>
            <strong>{user.displayName}</strong>
            <small>{user.email}</small>
          </div>
          <Link href={signOutPath("/")}>Sign out</Link>
        </div>
      </aside>

      <div className="app-main">
        <header className="mobile-app-header">
          <BrandMark compact />
          <strong>Invoicy</strong>
          <Link href="/invoices/new" className="button button-primary">
            New invoice
          </Link>
        </header>
        {children}
      </div>
    </div>
  );
}
