"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";

type Block = { id: string; type: string; sortOrder: number; content: Record<string, unknown> };
type Page = {
  id: string;
  slug: string;
  title: string;
  navLabel: string | null;
  published: boolean;
  showInNav: boolean;
  blocks: Block[];
};
type Site = {
  primaryColor: string;
  accentColor: string;
  contactEmail: string | null;
  contactPhone: string | null;
  address: string | null;
  footerText: string | null;
  published: boolean;
  showBookingCta: boolean;
  heroImageUrl: string | null;
  logoUrl: string | null;
};

export default function WebsiteAdminPage() {
  const [site, setSite] = useState<Site | null>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [publicUrl, setPublicUrl] = useState("");
  const [pageId, setPageId] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [newPage, setNewPage] = useState({ slug: "faq", title: "FAQ" });

  async function load() {
    const res = await fetch("/api/site");
    const json = await res.json();
    setSite(json.data?.site ?? null);
    setPages(json.data?.pages ?? []);
    setPublicUrl(json.data?.publicUrl ?? "");
    if (!pageId && json.data?.pages?.[0]) setPageId(json.data.pages[0].id);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const page = pages.find((p) => p.id === pageId);

  if (!site) return <p>Website wird geladen…</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">Website</h1>
          <p className="text-sm text-slate-600">
            Fertige Schul-Website inkl. Seiten und Buchungs-CTA. Öffentlich:{" "}
            <a className="underline" href={publicUrl} target="_blank" rel="noreferrer">
              {publicUrl}
            </a>
          </p>
        </div>
        <Button
          variant="outline"
          onClick={async () => {
            await fetch("/api/site", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ published: !site.published }),
            });
            load();
          }}
        >
          {site.published ? "Online" : "Offline"} (umschalten)
        </Button>
      </div>

      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="font-semibold">Design & Kontakt</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <div>
            <Label>Primärfarbe</Label>
            <Input
              type="color"
              value={site.primaryColor}
              onChange={(e) => setSite({ ...site, primaryColor: e.target.value })}
            />
          </div>
          <div>
            <Label>Akzentfarbe</Label>
            <Input
              type="color"
              value={site.accentColor}
              onChange={(e) => setSite({ ...site, accentColor: e.target.value })}
            />
          </div>
          <div>
            <Label>Hero-Bild URL</Label>
            <Input
              value={site.heroImageUrl ?? ""}
              onChange={(e) => setSite({ ...site, heroImageUrl: e.target.value })}
            />
          </div>
          <div>
            <Label>E-Mail</Label>
            <Input
              value={site.contactEmail ?? ""}
              onChange={(e) => setSite({ ...site, contactEmail: e.target.value })}
            />
          </div>
          <div>
            <Label>Telefon</Label>
            <Input
              value={site.contactPhone ?? ""}
              onChange={(e) => setSite({ ...site, contactPhone: e.target.value })}
            />
          </div>
          <div>
            <Label>Adresse</Label>
            <Input value={site.address ?? ""} onChange={(e) => setSite({ ...site, address: e.target.value })} />
          </div>
          <div className="md:col-span-3">
            <Label>Footer</Label>
            <Input
              value={site.footerText ?? ""}
              onChange={(e) => setSite({ ...site, footerText: e.target.value })}
            />
          </div>
        </div>
        <Button
          className="mt-3"
          onClick={async () => {
            setMsg(null);
            const res = await fetch("/api/site", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(site),
            });
            setMsg(res.ok ? "Design gespeichert" : "Fehler");
            load();
          }}
        >
          Speichern
        </Button>
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1">
            <Label>Seite bearbeiten</Label>
            <Select value={pageId} onChange={(e) => setPageId(e.target.value)}>
              {pages.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title} (/{p.slug})
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Neue Seite Slug</Label>
            <Input value={newPage.slug} onChange={(e) => setNewPage({ ...newPage, slug: e.target.value })} />
          </div>
          <div>
            <Label>Titel</Label>
            <Input value={newPage.title} onChange={(e) => setNewPage({ ...newPage, title: e.target.value })} />
          </div>
          <Button
            variant="outline"
            onClick={async () => {
              await fetch("/api/site", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "addPage", ...newPage }),
              });
              load();
            }}
          >
            Seite anlegen
          </Button>
        </div>

        {page && (
          <div className="mt-4 space-y-3">
            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <Label>Titel</Label>
                <Input
                  value={page.title}
                  onChange={(e) =>
                    setPages(pages.map((p) => (p.id === page.id ? { ...p, title: e.target.value } : p)))
                  }
                />
              </div>
              <div>
                <Label>Nav-Label</Label>
                <Input
                  value={page.navLabel ?? ""}
                  onChange={(e) =>
                    setPages(pages.map((p) => (p.id === page.id ? { ...p, navLabel: e.target.value } : p)))
                  }
                />
              </div>
              <div className="flex items-end gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={page.showInNav}
                    onChange={(e) =>
                      setPages(pages.map((p) => (p.id === page.id ? { ...p, showInNav: e.target.checked } : p)))
                    }
                  />
                  In Navigation
                </label>
                <Button
                  variant="outline"
                  onClick={async () => {
                    await fetch("/api/site", {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        action: "updatePage",
                        pageId: page.id,
                        title: page.title,
                        navLabel: page.navLabel,
                        showInNav: page.showInNav,
                        published: page.published,
                      }),
                    });
                    setMsg("Seite gespeichert");
                  }}
                >
                  Seite speichern
                </Button>
              </div>
            </div>

            {page.blocks.map((block) => (
              <div key={block.id} className="rounded-xl border border-slate-200 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase text-slate-500">{block.type}</p>
                  <button
                    className="text-xs text-rose-700 underline"
                    onClick={async () => {
                      await fetch("/api/site", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ action: "deleteBlock", blockId: block.id }),
                      });
                      load();
                    }}
                  >
                    Block löschen
                  </button>
                </div>
                <div className="grid gap-2">
                  {Object.entries(block.content).map(([key, value]) => (
                    <div key={key}>
                      <Label>{key}</Label>
                      {String(value).length > 80 ? (
                        <Textarea
                          value={String(value ?? "")}
                          onChange={(e) => {
                            const content = { ...block.content, [key]: e.target.value };
                            setPages(
                              pages.map((p) =>
                                p.id === page.id
                                  ? {
                                      ...p,
                                      blocks: p.blocks.map((b) => (b.id === block.id ? { ...b, content } : b)),
                                    }
                                  : p,
                              ),
                            );
                          }}
                        />
                      ) : (
                        <Input
                          value={String(value ?? "")}
                          onChange={(e) => {
                            const content = { ...block.content, [key]: e.target.value };
                            setPages(
                              pages.map((p) =>
                                p.id === page.id
                                  ? {
                                      ...p,
                                      blocks: p.blocks.map((b) => (b.id === block.id ? { ...b, content } : b)),
                                    }
                                  : p,
                              ),
                            );
                          }}
                        />
                      )}
                    </div>
                  ))}
                </div>
                <Button
                  className="mt-2"
                  variant="outline"
                  onClick={async () => {
                    await fetch("/api/site", {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        action: "updateBlock",
                        blockId: block.id,
                        content: block.content,
                      }),
                    });
                    setMsg("Block gespeichert");
                  }}
                >
                  Block speichern
                </Button>
              </div>
            ))}

            <Button
              variant="outline"
              onClick={async () => {
                await fetch("/api/site", {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    action: "addBlock",
                    pageId: page.id,
                    type: "TEXT",
                    content: { title: "Neuer Abschnitt", body: "Text hier…" },
                  }),
                });
                load();
              }}
            >
              Text-Block hinzufügen
            </Button>
          </div>
        )}
      </section>
      {msg && <p className="text-sm text-teal-800">{msg}</p>}
    </div>
  );
}
