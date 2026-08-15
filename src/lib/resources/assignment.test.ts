import { ResourceStatus } from "@prisma/client";

function nextResourceStatus(params: { returned: boolean; damageNote?: string }) {
  if (!params.returned) return ResourceStatus.ISSUED;
  return params.damageNote?.trim() ? ResourceStatus.DEFECT : ResourceStatus.AVAILABLE;
}

describe("Resource return status", () => {
  it("marks damaged gear as defect", () => {
    expect(nextResourceStatus({ returned: true, damageNote: "Riss im Deck" })).toBe("DEFECT");
  });

  it("frees undamaged gear", () => {
    expect(nextResourceStatus({ returned: true })).toBe("AVAILABLE");
  });
});
