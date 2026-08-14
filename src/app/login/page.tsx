import { signIn } from "@/auth";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

export default function LoginPage() {
  return (
    <div>
      <SiteHeader />
      <main className="mx-auto max-w-md px-4 py-10">
        <div className="rounded-3xl bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-semibold text-teal-950">Mitarbeiter-Login</h1>
          <p className="mt-1 text-sm text-slate-600">Zugangsdaten siehe README (Demo-Seed).</p>
          <LoginForm />
        </div>
      </main>
    </div>
  );
}

function LoginForm() {
  async function login(formData: FormData) {
    "use server";
    const callbackUrl = String(formData.get("callbackUrl") || "/admin");
    await signIn("credentials", {
      email: String(formData.get("email") || ""),
      password: String(formData.get("password") || ""),
      redirectTo: callbackUrl,
    });
  }
  return (
    <form action={login} className="mt-6 space-y-4">
      <input type="hidden" name="callbackUrl" defaultValue="/admin" />
      <div>
        <Label>E-Mail</Label>
        <Input name="email" type="email" required autoComplete="username" />
      </div>
      <div>
        <Label>Passwort</Label>
        <Input name="password" type="password" required autoComplete="current-password" />
      </div>
      <Button type="submit" className="w-full">
        Anmelden
      </Button>
    </form>
  );
}
