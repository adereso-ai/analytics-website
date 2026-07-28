import { Dashboard } from "@/components/Dashboard";
import { LoginScreen } from "@/components/LoginScreen";
import { getSessionUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getSessionUser();
  if (!user) return <LoginScreen />;

  return <Dashboard user={user} />;
}
