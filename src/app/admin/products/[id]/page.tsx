import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { formatMoney } from "@/lib/utils";

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await prisma.product.findUnique({
    where: { id },
    include: { variants: true, requirements: { include: { resourceType: true } }, translations: true },
  });
  if (!product) notFound();
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-semibold">{product.name}</h1>
      <p className="text-slate-600">{product.description}</p>
      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <p>Preis {formatMoney(Number(product.basePrice))} · Steuer {Number(product.taxRate)}%</p>
        <p>Teilnehmer {product.minParticipants}–{product.maxParticipants} · Vorlauf {product.bookingLeadHours}h</p>
        <p>Instructoren min. {product.requiredInstructors}, Ratio 1:{product.instructorRatio}</p>
      </section>
      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="font-semibold">Varianten</h2>
        {product.variants.map((v) => (
          <p key={v.id}>{v.name}: {formatMoney(Number(v.price))}</p>
        ))}
      </section>
      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="font-semibold">Ressourcenbedarf</h2>
        {product.requirements.map((r) => (
          <p key={r.id}>{r.resourceType.name}: {r.quantityPerParticipant} / Teilnehmer</p>
        ))}
      </section>
    </div>
  );
}
