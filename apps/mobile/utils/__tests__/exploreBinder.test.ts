import {
  BINDER_FILTERS,
  binderFiltersAreActive,
  binderPocketAccessibilityLabel,
  canGoNextPage,
  canGoPreviousPage,
  cardsPerPageForLayout,
  categoryProgressRows,
  completionPercent,
  describeStopHabitat,
  filterBinderByStatus,
  filterBinderCards,
  filterBinderCardsFull,
  formatMatchedEnvironments,
  formatRarityLabel,
  pageCount,
  pageIndexForCardId,
  paginateBinderCards,
  PHONE_CARDS_PER_PAGE,
  readableHabitatAffinities,
  sortBinderCards,
  sortBinderCardsBy,
  TABLET_CARDS_PER_PAGE,
  totalCopyCount,
  uniqueCollectedCount,
  type BinderCardEntry,
} from "../exploreBinder";

function card(partial: Partial<BinderCardEntry> & Pick<BinderCardEntry, "id" | "name">): BinderCardEntry {
  return {
    slug: partial.slug ?? partial.id,
    description: partial.description ?? "",
    category: partial.category ?? "animal",
    rarity: partial.rarity ?? "common",
    imageUrl: partial.imageUrl ?? null,
    sortOrder: partial.sortOrder ?? 0,
    habitatWeights: partial.habitatWeights ?? {},
    count: partial.count ?? 0,
    collected: partial.collected ?? false,
    firstCollectedAt: partial.firstCollectedAt ?? null,
    lastCollectedAt: partial.lastCollectedAt ?? null,
    ...partial,
  };
}

describe("exploreBinder helpers", () => {
  const sample: BinderCardEntry[] = [
    card({ id: "b", name: "Bee", sortOrder: 20, category: "animal", collected: true, count: 2 }),
    card({ id: "a", name: "Acorn", sortOrder: 10, category: "flora_wildlife", collected: false, count: 0 }),
    card({ id: "c", name: "Creek", sortOrder: 10, category: "habitat", collected: true, count: 1 }),
  ];

  it("sorts by sort_order then name", () => {
    expect(sortBinderCards(sample).map((c) => c.id)).toEqual(["a", "c", "b"]);
  });

  it("filters by category", () => {
    expect(filterBinderCards(sample, "animal").map((c) => c.id)).toEqual(["b"]);
    expect(filterBinderCards(sample, "habitat").map((c) => c.id)).toEqual(["c"]);
    expect(filterBinderCards(sample, "flora_wildlife").map((c) => c.id)).toEqual(["a"]);
    expect(filterBinderCards(sample, "all")).toHaveLength(3);
  });

  it("uses 9 cards per page on phone and tablet", () => {
    expect(cardsPerPageForLayout(false)).toBe(PHONE_CARDS_PER_PAGE);
    expect(cardsPerPageForLayout(true)).toBe(TABLET_CARDS_PER_PAGE);
    expect(PHONE_CARDS_PER_PAGE).toBe(9);
    expect(TABLET_CARDS_PER_PAGE).toBe(9);
  });

  it("paginates and counts pages for 21 cards", () => {
    const cards = Array.from({ length: 21 }, (_, i) =>
      card({ id: `c${i}`, name: `Card ${i}`, sortOrder: i })
    );
    expect(pageCount(21, 9)).toBe(3);
    expect(paginateBinderCards(cards, 9)).toHaveLength(3);
    expect(paginateBinderCards(cards, 9)[0]).toHaveLength(9);
    expect(paginateBinderCards(cards, 9)[2]).toHaveLength(3);
    expect(pageCount(21, 6)).toBe(4);
  });

  it("keeps missing cards in fixed catalogue positions", () => {
    const ordered = filterBinderCards(sample, "all");
    expect(ordered[0]?.id).toBe("a");
    expect(ordered[0]?.collected).toBe(false);
    expect(ordered[1]?.collected).toBe(true);
  });

  it("counts unique completion separately from total copies", () => {
    expect(uniqueCollectedCount(sample)).toBe(2);
    expect(totalCopyCount(sample)).toBe(3);
    expect(completionPercent(2, 3)).toBe(67);
  });

  it("finds the page for an awarded card", () => {
    const cards = Array.from({ length: 21 }, (_, i) =>
      card({ id: `c${i}`, name: `Card ${i}`, sortOrder: i })
    );
    const ordered = filterBinderCards(cards, "all");
    expect(pageIndexForCardId(ordered, "c0", 6)).toBe(0);
    expect(pageIndexForCardId(ordered, "c6", 6)).toBe(1);
    expect(pageIndexForCardId(ordered, "c20", 6)).toBe(3);
    expect(pageIndexForCardId(ordered, "missing", 6)).toBe(-1);
  });

  it("disables previous on first page and next on last page", () => {
    expect(canGoPreviousPage(0)).toBe(false);
    expect(canGoPreviousPage(1)).toBe(true);
    expect(canGoNextPage(0, 4)).toBe(true);
    expect(canGoNextPage(3, 4)).toBe(false);
    expect(canGoNextPage(0, 1)).toBe(false);
  });

  it("still paginates a full binder when nothing is owned", () => {
    const cards = Array.from({ length: 21 }, (_, i) =>
      card({ id: `c${i}`, name: `Card ${i}`, sortOrder: i, collected: false, count: 0 })
    );
    expect(uniqueCollectedCount(cards)).toBe(0);
    expect(paginateBinderCards(filterBinderCards(cards, "all"), 6)).toHaveLength(4);
  });

  it("builds accessibility labels with state and duplicates", () => {
    expect(
      binderPocketAccessibilityLabel(
        card({ id: "x", name: "Pond Habitat", rarity: "common", collected: true, count: 2 })
      )
    ).toBe("Pond Habitat, collected, 2 copies, common");
    expect(
      binderPocketAccessibilityLabel(
        card({ id: "y", name: "Tawny Owl", rarity: "rare", collected: false, count: 0 })
      )
    ).toBe("Tawny Owl, not discovered, rare");
  });

  it("formats habitat affinities without raw JSON", () => {
    const rows = readableHabitatAffinities({ freshwater: 5, woodland: 2, general: 0.25 });
    expect(rows[0]?.label).toBe("Freshwater");
    expect(formatRarityLabel("very_rare")).toBe("Very Rare");
  });

  it("filters by collected / missing status", () => {
    expect(filterBinderByStatus(sample, "collected").map((c) => c.id)).toEqual(["b", "c"]);
    expect(filterBinderByStatus(sample, "missing").map((c) => c.id)).toEqual(["a"]);
    expect(filterBinderCardsFull(sample, "animal", "collected").map((c) => c.id)).toEqual(["b"]);
  });

  it("sorts by name and rarity", () => {
    expect(sortBinderCardsBy(sample, "name_asc").map((c) => c.id)).toEqual(["a", "b", "c"]);
    expect(sortBinderCardsBy(sample, "name_desc").map((c) => c.id)).toEqual(["c", "b", "a"]);
    const rareFirst = [
      card({ id: "r", name: "Rare", rarity: "rare", sortOrder: 1 }),
      card({ id: "c", name: "Common", rarity: "common", sortOrder: 0 }),
    ];
    expect(sortBinderCardsBy(rareFirst, "rarity").map((c) => c.id)).toEqual(["r", "c"]);
  });

  it("reports when non-default filters are active", () => {
    expect(binderFiltersAreActive("all", "all", "default")).toBe(false);
    expect(binderFiltersAreActive("animal", "all", "default")).toBe(true);
    expect(binderFiltersAreActive("all", "collected", "default")).toBe(true);
    expect(binderFiltersAreActive("all", "all", "name_asc")).toBe(true);
  });

  it("summarises category progress and stop habitats", () => {
    const rows = categoryProgressRows(sample);
    expect(rows.find((r) => r.category === "animal")?.collected).toBe(1);
    expect(describeStopHabitat({ woodland: 0.8, urban: 0.3 })).toBe(
      "Near woodland · town & urban"
    );
    expect(formatMatchedEnvironments(["park_garden", "freshwater"])).toBe(
      "Found near parks & gardens · freshwater"
    );
  });

  it("exposes filter labels for All / Animals / Habitats / Flora", () => {
    expect(BINDER_FILTERS.map((f) => f.label)).toEqual([
      "All",
      "Animals",
      "Habitats",
      "Flora & Wildlife",
    ]);
  });
});
