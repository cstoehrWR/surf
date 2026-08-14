import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5">
      <Link href="/" className="flex items-center gap-2 text-lg font-bold tracking-tight text-teal-900">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-teal-700 text-white">NS</span>
        North Sea Surf
      </Link>
      <nav className="flex items-center gap-4 text-sm font-medium">
        <Link href="/book" className="text-teal-800 hover:underline">
          Buchen
        </Link>
        <Link href="/login" className="rounded-xl bg-teal-800 px-4 py-2 text-white">
          Login
        </Link>
      </nav>
    </header>
  );
}
