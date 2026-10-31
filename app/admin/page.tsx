import { getUserStats, CHART_DAYS, type UserStats } from "@/lib/admin-stats";
import { requireBlogAdmin } from "@/lib/blog-server";

export const dynamic = "force-dynamic";

const num = (n: number) => n.toLocaleString("en-US");
const plural = (n: number, word: string) => `${num(n)} ${word}${n === 1 ? "" : "s"}`;
const dayFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const day = (date: string) => dayFmt.format(new Date(date));

function Tile({ label, value, sub }: { label: string; value: number; sub: string }) {
  return (
    <div className="cms-tile">
      <span className="cms-tile-label">{label}</span>
      <span className="cms-tile-value">{num(value)}</span>
      <span className="cms-tile-sub">{sub}</span>
    </div>
  );
}

function SignupChart({ daily }: { daily: UserStats["daily"] }) {
  const max = Math.max(...daily.map((d) => d.count), 1);
  const total = daily.reduce((sum, d) => sum + d.count, 0);
  return (
    <section className="cms-panel cms-chart-panel">
      <div>
        <h2>Sign-ups per day</h2>
        <p className="cms-hint">{plural(total, "sign-up")} in the last {CHART_DAYS} days (UTC)</p>
      </div>
      <div className="cms-chart">
        <span className="cms-chart-max">{num(max)}</span>
        <ol className="cms-bars">
          {daily.map((d) => (
            <li key={d.date} tabIndex={0} style={{ "--h": `${(d.count / max) * 100}%` } as React.CSSProperties} aria-label={`${day(d.date)}: ${plural(d.count, "sign-up")}`}>
              {d.count > 0 && <span className="cms-bar-fill" />}
              <span className="cms-bar-tip">{day(d.date)} · {plural(d.count, "sign-up")}</span>
            </li>
          ))}
        </ol>
        <div className="cms-chart-x">
          <span>{day(daily[0].date)}</span>
          <span>{day(daily[daily.length - 1].date)}</span>
        </div>
      </div>
      <details className="cms-advanced">
        <summary>View as table</summary>
        <table className="cms-table">
          <thead><tr><th scope="col">Day</th><th scope="col">Sign-ups</th></tr></thead>
          <tbody>
            {[...daily].reverse().map((d) => <tr key={d.date}><td>{day(d.date)}</td><td>{num(d.count)}</td></tr>)}
          </tbody>
        </table>
      </details>
    </section>
  );
}

export default async function AdminDashboard() {
  const { admin } = await requireBlogAdmin("/admin");
  const stats = await getUserStats(admin);

  return (
    <main className="cms-main">
      <div className="cms-head"><h1>Dashboard</h1></div>
      <div className="cms-tiles">
        <Tile label="Total users" value={stats.total} sub={`${num(stats.confirmed)} confirmed their email`} />
        <Tile label="New, last 7 days" value={stats.newLast7} sub={`${num(stats.newPrev7)} in the 7 days before`} />
        <Tile label="Signed in, last 30 days" value={stats.signedInLast30} sub="Fresh logins only, so returning sessions aren't counted" />
        <Tile label="Premium" value={stats.premium} sub={`${num(stats.paying)} paying, ${num(stats.premium - stats.paying)} granted by hand`} />
      </div>
      <SignupChart daily={stats.daily} />
      <p className="cms-hint cms-note">Accounts only. Guests browse without an account, so they don&rsquo;t appear here.</p>
    </main>
  );
}
