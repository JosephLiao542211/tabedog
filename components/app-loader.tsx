"use client";

import dynamic from "next/dynamic";
import type { Plan } from "@/lib/plan";
import { Logo } from "./icons";

// MapLibre needs the DOM, so the app is loaded on the client only.
const TabeDogApp = dynamic(() => import("./tabedog-app"), {
  ssr: false,
  loading: () => (
    <div className="boot">
      <Logo size={40} />
      <p className="sub">Loading the map…</p>
    </div>
  ),
});

export function AppLoader(props: { email: string; userId: string; plan: Plan; billing: boolean; guest?: boolean }) {
  return <TabeDogApp {...props} />;
}
