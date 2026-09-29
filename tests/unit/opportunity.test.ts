import { describe, expect, it } from "vitest";
import {
  canRespond,
  effectiveStatus,
  expandInvitees,
  invitationView,
} from "@/lib/domain/opportunity";

const now = new Date("2026-09-27T15:00:00.000Z");
const future = new Date("2026-10-03T13:00:00.000Z");
const past = new Date("2026-09-01T13:00:00.000Z");

describe("effectiveStatus", () => {
  it("keeps an open future opportunity open and treats a past one as expired", () => {
    expect(effectiveStatus({ status: "open", startsAt: future }, now)).toBe("open");
    expect(effectiveStatus({ status: "open", startsAt: now }, now)).toBe("expired");
    expect(effectiveStatus({ status: "open", startsAt: past }, now)).toBe("expired");
  });

  it("does not let time change a confirmed or cancelled opportunity", () => {
    expect(effectiveStatus({ status: "confirmed", startsAt: past }, now)).toBe("confirmed");
    expect(effectiveStatus({ status: "cancelled", startsAt: past }, now)).toBe("cancelled");
    expect(effectiveStatus({ status: "confirmed", startsAt: future }, now)).toBe("confirmed");
  });
});

describe("invitationView", () => {
  const open = { status: "open" as const, startsAt: future, confirmedInvitationId: null };

  it("covers each state the invitee can see", () => {
    expect(invitationView({ status: "confirmed", startsAt: future, confirmedInvitationId: "i1" }, { id: "i1", response: "in" }, now)).toBe("you_are_in");
    expect(invitationView({ status: "confirmed", startsAt: future, confirmedInvitationId: "i1" }, { id: "i2", response: "none" }, now)).toBe("closed_fixed_with_other");
    expect(invitationView({ status: "cancelled", startsAt: future, confirmedInvitationId: null }, { id: "i1", response: "none" }, now)).toBe("closed_cancelled");
    expect(invitationView({ status: "open", startsAt: past, confirmedInvitationId: null }, { id: "i1", response: "none" }, now)).toBe("closed_expired");
    expect(invitationView(open, { id: "i1", response: "none" }, now)).toBe("awaiting");
    expect(invitationView(open, { id: "i1", response: "maybe" }, now)).toBe("maybe");
    expect(invitationView(open, { id: "i1", response: "out" }, now)).toBe("declined");
  });
});

describe("canRespond", () => {
  const open = { status: "open" as const, startsAt: future, confirmedInvitationId: null };

  it("refuses I'm in once the opportunity is expired, confirmed, or cancelled", () => {
    expect(canRespond({ status: "open", startsAt: past, confirmedInvitationId: null }, { id: "i1", response: "none" }, "in", now)).toBe(false);
    expect(canRespond({ status: "confirmed", startsAt: future, confirmedInvitationId: "i1" }, { id: "i2", response: "none" }, "in", now)).toBe(false);
    expect(canRespond({ status: "cancelled", startsAt: future, confirmedInvitationId: null }, { id: "i1", response: "none" }, "in", now)).toBe(false);
  });

  it("lets Maybe, Can't play, and clearing that reply change while the opportunity is open", () => {
    expect(canRespond(open, { id: "i1", response: "maybe" }, "out", now)).toBe(true);
    expect(canRespond(open, { id: "i1", response: "out" }, "none", now)).toBe(true);
    expect(canRespond(open, { id: "i1", response: "none" }, "in", now)).toBe(true);
    expect(canRespond(open, { id: "i1", response: "out" }, "in", now)).toBe(true);
  });

  it("allows nothing after the match is confirmed", () => {
    const confirmed = { status: "confirmed" as const, startsAt: future, confirmedInvitationId: "i1" };
    expect(canRespond(confirmed, { id: "i1", response: "in" }, "out", now)).toBe(false);
    expect(canRespond(confirmed, { id: "i1", response: "in" }, "maybe", now)).toBe(false);
    expect(canRespond(confirmed, { id: "i1", response: "in" }, "none", now)).toBe(false);
    expect(canRespond(confirmed, { id: "i2", response: "maybe" }, "in", now)).toBe(false);
  });
});

describe("expandInvitees", () => {
  it("dedupes list members and individuals and leaves the host out", () => {
    expect(
      expandInvitees(
        [{ memberIds: ["a", "b", "host"] }, { memberIds: ["b", "c"] }],
        ["a", "d", "host"],
        "host",
      ).sort(),
    ).toEqual(["a", "b", "c", "d"]);
  });
});
