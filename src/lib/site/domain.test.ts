import { mapCustomDomainPath, sitePath, resolveCtaHref } from "./domain";

describe("custom domain path mapping", () => {
  it("maps root and booking paths", () => {
    expect(mapCustomDomainPath("/", "north-sea-surf")).toBe("/o/north-sea-surf");
    expect(mapCustomDomainPath("/book", "north-sea-surf")).toBe("/o/north-sea-surf/book");
    expect(mapCustomDomainPath("/stay", "wattenmeer-stay")).toBe("/o/wattenmeer-stay/stay");
  });

  it("maps CMS pages without /p prefix", () => {
    expect(mapCustomDomainPath("/about", "north-sea-surf")).toBe("/o/north-sea-surf/p/about");
  });

  it("leaves platform paths alone", () => {
    expect(mapCustomDomainPath("/admin", "north-sea-surf")).toBe("/admin");
    expect(mapCustomDomainPath("/api/health", "north-sea-surf")).toBe("/api/health");
  });

  it("builds pretty links on custom domains", () => {
    expect(sitePath({ orgSlug: "x", customDomain: true, kind: "book" })).toBe("/book");
    expect(sitePath({ orgSlug: "x", customDomain: true, kind: "page", pageSlug: "about" })).toBe("/about");
    expect(resolveCtaHref("north-sea-surf", "book", true)).toBe("/book");
  });
});
