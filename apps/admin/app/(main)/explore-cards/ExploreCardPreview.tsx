"use client";

import Image from "next/image";

const RARITY_COLORS: Record<string, string> = {
  common: "#3B82F6",
  uncommon: "#2D8A4E",
  rare: "#9B4FD1",
  very_rare: "#C4851A",
};

function formatRarityLabel(rarity: string): string {
  return rarity.replace(/_/g, " ");
}

export type ExploreCardPreviewProps = {
  name: string;
  rarity: string;
  description: string;
  imageUrl: string | null;
  collected?: boolean;
};

/** Web preview of the mobile Explore trading-card face. */
export function ExploreCardPreview({
  name,
  rarity,
  description,
  imageUrl,
  collected = true,
}: ExploreCardPreviewProps) {
  const rarityColor = RARITY_COLORS[rarity] ?? "#3B82F6";
  const displayName = collected
    ? (name.trim() || "Card name").toUpperCase()
    : "?????";
  const rarityLabel = collected
    ? formatRarityLabel(rarity || "common").toUpperCase()
    : "UNKNOWN";
  const bodyText = collected
    ? description.trim() || "A discovery from your Explore adventures."
    : "Not discovered yet. Keep exploring to find this card.";
  const showArt = Boolean(imageUrl?.startsWith("http")) && collected;

  return (
    <div
      className="mx-auto w-full max-w-[240px] overflow-hidden rounded-[14px] border-2 border-[#1A2E20] shadow-lg"
      style={{ aspectRatio: "682 / 1024" }}
    >
      <div
        className="flex h-full flex-col gap-1.5 p-3"
        style={{
          background:
            "linear-gradient(160deg, #3D6B42 0%, #2A4A32 45%, #1E3526 100%)",
        }}
      >
        <div
          className="rounded-[10px] border px-2.5 py-1.5"
          style={{
            background: collected
              ? "rgba(228, 242, 215, 0.72)"
              : "rgba(18, 28, 22, 0.78)",
            borderColor: collected
              ? "rgba(50, 90, 55, 0.4)"
              : "rgba(255,255,255,0.16)",
          }}
        >
          <p
            className="truncate text-[11px] font-extrabold tracking-wide"
            style={{ color: collected ? "#1A2A1C" : "rgba(235,240,230,0.9)" }}
          >
            {displayName}
          </p>
        </div>

        <div className="flex justify-end">
          <span
            className="rounded-full px-2 py-0.5 text-[9px] font-black tracking-wider text-white"
            style={{
              backgroundColor: collected ? rarityColor : "rgba(80,95,88,0.85)",
            }}
          >
            {rarityLabel}
          </span>
        </div>

        <div className="flex min-h-0 flex-1 items-center justify-center">
          <div
            className="aspect-square w-[86%] rounded-[9px] border border-[#33483A] p-0.5"
            style={{ background: "#D2E2C8" }}
          >
            <div
              className="relative h-full w-full overflow-hidden rounded-[7px] border border-[#0A0E0C]"
              style={{ background: collected ? "#1A2420" : "#0A100E" }}
            >
              {showArt ? (
                <Image
                  src={imageUrl!}
                  alt=""
                  fill
                  className="object-cover"
                  unoptimized={!imageUrl!.includes("supabase.co")}
                />
              ) : (
                <div
                  className="flex h-full items-center justify-center text-xs font-bold"
                  style={{
                    color: collected
                      ? "rgba(30,50,32,0.45)"
                      : "rgba(255,255,255,0.55)",
                    background: collected
                      ? "rgba(180, 210, 150, 0.28)"
                      : "rgba(0,0,0,0.45)",
                  }}
                >
                  {collected ? "Artwork" : "Locked"}
                </div>
              )}
            </div>
          </div>
        </div>

        <div
          className="rounded-[9px] border px-2 py-1.5"
          style={{
            background: collected
              ? "rgba(228, 242, 215, 0.72)"
              : "rgba(18, 28, 22, 0.78)",
            borderColor: collected
              ? "rgba(50, 90, 55, 0.4)"
              : "rgba(255,255,255,0.16)",
          }}
        >
          <p
            className="line-clamp-3 text-[10px] leading-snug"
            style={{
              color: collected ? "#243028" : "rgba(210,220,210,0.75)",
            }}
          >
            {bodyText}
          </p>
        </div>
      </div>
    </div>
  );
}
