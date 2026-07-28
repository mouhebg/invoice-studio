import { requireChatGPTUser } from "../chatgpt-auth";
import { AppShell } from "../components/AppShell";
import { BusinessSettingsForm } from "../components/BusinessSettingsForm";
import { ensureAccount } from "../../db/queries";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireChatGPTUser("/settings");
  const account = await ensureAccount({
    email: user.email,
    name: user.fullName,
  });

  return (
    <AppShell
      active="settings"
      user={user}
      businessName={account.businessName}
    >
      <main className="app-content">
        <header className="page-header">
          <div>
            <p className="eyebrow">Workspace configuration</p>
            <h1>Business settings</h1>
            <p>Control the information and defaults used on your invoices.</p>
          </div>
        </header>
        <BusinessSettingsForm account={account} />
      </main>
    </AppShell>
  );
}
