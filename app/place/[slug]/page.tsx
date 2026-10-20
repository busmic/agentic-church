import type { Metadata } from "next";
import { notFound } from "next/navigation";
import InteriorView from "@/components/InteriorView";
import { getPlace, PLACES } from "@/lib/places";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = getPlace(slug);
  return { title: p ? `${p.name} · Agentic Church` : "Agentic Church", description: p?.description };
}

export default async function PlacePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!getPlace(slug)) notFound();
  return <InteriorView slug={slug} />;
}

export function generateStaticParams() {
  return PLACES.map((p) => ({ slug: p.slug }));
}
