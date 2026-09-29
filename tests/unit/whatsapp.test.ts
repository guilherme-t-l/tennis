import { describe, expect, it } from "vitest";
import { formatLongWhen } from "@/lib/format";
import { buildInviteMessage, buildWhatsAppShareUrl } from "@/lib/domain/whatsapp";

const startsAt = new Date("2026-10-03T13:00:00.000Z");

describe("buildInviteMessage", () => {
  it("includes the invitee's first name, format, when, where, and invite URL", () => {
    const message = buildInviteMessage({
      inviteeName: "João Silva",
      format: "singles",
      startsAt,
      locationName: "Belvedere",
      token: "abc123",
      appUrl: "http://localhost:3000",
    });
    expect(message).toContain("João");
    expect(message).not.toContain("Silva");
    expect(message).toContain("Singles");
    expect(message).toContain(formatLongWhen(startsAt));
    expect(message).toContain("Belvedere");
    expect(message).toContain("http://localhost:3000/i/abc123");
  });
});

describe("buildWhatsAppShareUrl", () => {
  it("encodes the message on wa.me without a phone number", () => {
    const message = "Hello world\nhttp://localhost:3000/i/abc";
    const url = buildWhatsAppShareUrl(message);
    expect(url.startsWith("https://wa.me/?text=")).toBe(true);
    expect(url).not.toMatch(/wa\.me\/\d/);
    expect(url).toContain("%20");
    expect(url).toContain("%3A");
    expect(url).toContain("%2F");
    expect(url).toContain("%0A");
    const text = decodeURIComponent(url.slice("https://wa.me/?text=".length));
    expect(text).toBe(message);
  });
});
