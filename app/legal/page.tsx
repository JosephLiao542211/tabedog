import type { Metadata } from "next";
import { OPERATOR, SITE } from "@/lib/seo";
import { SiteFooter, SiteHeader } from "@/components/site";

// Seller disclosure required by Japan's Act on Specified Commercial Transactions for the Premium subscription.
export const metadata: Metadata = {
  title: "特定商取引法に基づく表記 (Specified Commercial Transactions Act)",
  description: `Seller information for ${SITE.name} Premium as required by Japan's Act on Specified Commercial Transactions: operator, contact, price, payment, cancellation.`,
  alternates: { canonical: "/legal" },
};

const ROWS: [ja: string, en: string, value: string][] = [
  ["販売事業者", "Seller", OPERATOR.name],
  ["運営責任者", "Person responsible", OPERATOR.name],
  ["所在地", "Address", OPERATOR.addressNote],
  ["電話番号", "Phone", OPERATOR.phoneNote],
  ["メールアドレス", "Email", OPERATOR.email],
  ["販売価格", "Price", `${SITE.name} Premium: ¥${SITE.premiumYen} per month (tax included)`],
  ["商品代金以外の必要料金", "Other fees", "None. Internet connection costs are the customer’s."],
  ["支払方法", "Payment method", "Credit card, via Stripe"],
  ["支払時期", "When you pay", "At sign-up, then automatically on the same day each month"],
  ["提供時期", "Delivery", "Premium features are available immediately after payment"],
  ["解約・返品", "Cancellation and refunds", "Cancel any time from the account menu; Premium stays active until the end of the paid month. Due to the nature of digital services, payments already made are not refunded except where required by law."],
  ["動作環境", "Requirements", "A current version of Chrome, Safari, Edge or Firefox"],
];

export default function LegalPage() {
  return (
    <div className="site">
      <SiteHeader />
      <main>
        <section className="site-hero site-hero-page">
          <p className="site-kicker">Specified Commercial Transactions Act</p>
          <h1>特定商取引法に基づく表記</h1>
        </section>
        <article className="terms">
          <dl>
            {ROWS.map(([ja, en, value]) => (
              <div key={ja} style={{ display: "contents" }}>
                <dt>{ja}<br /><span className="sub">{en}</span></dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}
