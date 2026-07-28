import { notFound } from "next/navigation";
import { Dashboard } from "@/components/Dashboard";
import { getSessionUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getSessionUser();
  if (!user) notFound();

  return <Dashboard user={user} />;
}
