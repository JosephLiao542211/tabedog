import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/icons";
import { requireBlogAdmin } from "@/lib/blog-server";

export const metadata: Metadata = { title: "Dashboard", robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireBlogAdmin("/admin"); // pages check again with their own return path
  return (
    <div className="cms">
      <header className="cms-top">
        <Link href="/admin" className="site-brand"><Logo size={22} /><span className="site-brand-name">TabeDog</span><span className="cms-top-tag">CMS</span></Link>
        <nav>
          <Link href="/admin">Dashboard</Link>
          <Link href="/admin/blog">Posts</Link>
          <Link href="/admin/blog/agent">Draft with AI</Link>
          <Link href="/admin/blog/queue">Queue</Link>
          <Link href="/blog" target="_blank">View blog ↗</Link>
        </nav>
      </header>
      {children}
    </div>
  );
}
