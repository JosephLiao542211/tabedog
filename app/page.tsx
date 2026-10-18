import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppLoader } from "@/components/app-loader";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return <AppLoader email={user.email ?? ""} userId={user.id} />;
}
