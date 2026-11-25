import { describe, expect, it } from "vitest";
import { entriesOf } from "./langs";
import type { Entry } from "./model";
import { normalize, search } from "./search";

// T46 AC-2: pure search over title, tags and signature, without accents or case.

function entry(id: string, fields: Partial<Entry> = {}): Entry {
  return {
    id,
    lang: "cpp",
    section: "io",
    title: id,
    signature: "",
    example: "",
    output: "",
    pitfalls: [],
    tags: [],
    ...fields,
  };
}

const CPP = entriesOf("cpp");
const first = (query: string) => search(CPP, query)[0]?.id;

describe("search", () => {
  it.each([
    ["lower", "lower_bound"],
    ["lb", "lower_bound"],
    ["busca binaria", "lower_bound"],
    ["Busca Binária", "lower_bound"],
    ["LOWER_BOUND", "lower_bound"],
    ["upper", "upper_bound"],
    ["priority", "priority_queue"],
    ["heap", "priority_queue"],
    ["popcount", "popcount"],
    ["endl", "endl"],
    ["sort", "sort"],
    ["potencia", "powmod"],
    ["inverso", "modinv"],
    ["mt19937", "mt19937"],
    ["ordered set", "ordered_set"],
    ["int128", "int128"],
    ["anti-hash", "unordered_map"],
    ["npos", "find"],
    ["submascara", "submasks"],
    ["eof", "read_until_eof"],
  ])("search finds %s first: %s", (query, id) => {
    expect(first(query)).toBe(id);
  });

  it("search ranks a title match above a signature match", () => {
    const sig = entry("a", { title: "alpha", signature: "vector<int> beta" });
    const title = entry("b", { title: "beta" });
    const inside = entry("c", { title: "alphabeta" });
    const tag = entry("d", { title: "delta", tags: ["beta"] });
    expect(search([sig, inside, tag, title], "beta").map((e) => e.id)).toEqual([
      "b",
      "c",
      "d",
      "a",
    ]);
  });

  it("search keeps the input order between equal ranks", () => {
    const one = entry("one", { title: "set" });
    const two = entry("two", { title: "set" });
    expect(search([two, one], "set").map((e) => e.id)).toEqual(["two", "one"]);
  });

  it("search requires every term", () => {
    const both = entry("both", { title: "map", tags: ["hash"] });
    const one = entry("one", { title: "map" });
    expect(search([one, both], "hash map").map((e) => e.id)).toEqual(["both"]);
    expect(search([one, both], "zzz")).toEqual([]);
  });

  it("search ignores accents and case", () => {
    const e = entry("pot", { title: "Potência modular" });
    expect(search([e], "POTENCIA").map((x) => x.id)).toEqual(["pot"]);
    expect(search([e], "potência").map((x) => x.id)).toEqual(["pot"]);
  });

  it("search with a blank query returns every entry in order", () => {
    const list = [entry("x"), entry("y")];
    expect(search(list, "   ")).toEqual(list);
  });

  it("normalize drops accents, case and extra spaces", () => {
    expect(normalize("  Ação  ÚNICA ")).toBe("acao unica");
  });
});
