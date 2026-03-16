jest.mock("../supabase", () => ({}));
import { parsePrepChecklist, parseSteps } from "../packService";

describe("parsePrepChecklist", () => {
  it("returns null for non-array input", () => {
    expect(parsePrepChecklist(null)).toBeNull();
    expect(parsePrepChecklist(undefined)).toBeNull();
    expect(parsePrepChecklist("")).toBeNull();
    expect(parsePrepChecklist({})).toBeNull();
  });

  it("returns null for empty array", () => {
    expect(parsePrepChecklist([])).toBeNull();
  });

  it("parses valid prep checklist items", () => {
    const raw = [
      { title: "A good hiding spot", description: "Under a table" },
      { title: "Blankets", description: "To make it cosy" },
    ];
    expect(parsePrepChecklist(raw)).toEqual([
      { title: "A good hiding spot", description: "Under a table" },
      { title: "Blankets", description: "To make it cosy" },
    ]);
  });

  it("skips items missing title or description", () => {
    const raw = [
      { title: "OK", description: "Yes" },
      { instruction: "only" },
      { title: "Also OK", description: "" },
    ];
    expect(parsePrepChecklist(raw)).toEqual([
      { title: "OK", description: "Yes" },
      { title: "Also OK", description: "" },
    ]);
  });
});

describe("parseSteps", () => {
  it("returns null for non-array input", () => {
    expect(parseSteps(null)).toBeNull();
    expect(parseSteps(undefined)).toBeNull();
    expect(parseSteps([])).toBeNull();
  });

  it("parses valid steps with instruction only", () => {
    const raw = [{ instruction: "Do this first" }];
    expect(parseSteps(raw)).toEqual([
      { instruction: "Do this first", tip: null, media_url: null },
    ]);
  });

  it("parses steps with tip and media_url", () => {
    const raw = [
      {
        instruction: "Criss-cross strings",
        tip: "Try different heights",
        media_url: "https://example.com/img.jpg",
      },
    ];
    expect(parseSteps(raw)).toEqual([
      {
        instruction: "Criss-cross strings",
        tip: "Try different heights",
        media_url: "https://example.com/img.jpg",
      },
    ]);
  });

  it("skips items without instruction", () => {
    const raw = [{ tip: "no instruction" }, { instruction: "Valid" }];
    expect(parseSteps(raw)).toEqual([
      { instruction: "Valid", tip: null, media_url: null },
    ]);
  });
});
