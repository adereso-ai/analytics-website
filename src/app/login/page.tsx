import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** Compat: el login vive en `/`. */
export default function LoginPage() {
  redirect("/");
}
