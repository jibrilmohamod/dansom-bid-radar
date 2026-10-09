import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in · Dansom Bid Radar" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <main className="login">
      <div className="login-card">
        <div className="eyebrow">Dansom Research &amp; Consultancy</div>
        <h1>Bid Radar</h1>
        <p className="sub">Enter the team password to see this week&apos;s tenders.</p>
        <LoginForm next={next ?? "/"} />
      </div>
    </main>
  );
}
