import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  sendMock: vi.fn(),
  loggerErrorMock: vi.fn(),
}));

vi.mock("resend", () => ({
  Resend: class {
    public emails = {
      send: mocks.sendMock,
    };

    public constructor(_apiKey?: string) {}
  },
}));

vi.mock("../lib/logger.js", () => ({
  default: {
    error: mocks.loggerErrorMock,
  },
}));

import { sendBandMagicLink } from "./email.js";

describe("sendBandMagicLink", () => {
  const originalFromEmail = process.env.FROM_EMAIL;

  beforeEach(() => {
    mocks.sendMock.mockResolvedValue({ error: null });
    process.env.FROM_EMAIL = originalFromEmail;
  });

  it("sends email successfully", async () => {
    process.env.FROM_EMAIL = "events@example.com";

    await sendBandMagicLink(
      "band@example.com",
      "https://example.com/magic",
      "The Testers",
      "Uptown Porchfest"
    );

    expect(mocks.sendMock).toHaveBeenCalledOnce();
    expect(mocks.sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "events@example.com",
        to: "band@example.com",
        subject: "Edit your band info for Uptown Porchfest",
      })
    );
  });

  it("falls back to noreply address when FROM_EMAIL is missing", async () => {
    delete process.env.FROM_EMAIL;

    await sendBandMagicLink(
      "band@example.com",
      "https://example.com/magic",
      "The Testers",
      "Uptown Porchfest"
    );

    expect(mocks.sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "noreply@porchfest.app",
      })
    );
  });

  it("throws when email provider returns an error", async () => {
    mocks.sendMock.mockResolvedValue({ error: { message: "provider down" } });

    await expect(
      sendBandMagicLink(
        "band@example.com",
        "https://example.com/magic",
        "The Testers",
        "Uptown Porchfest"
      )
    ).rejects.toThrow("Failed to send email");

    expect(mocks.loggerErrorMock).toHaveBeenCalledOnce();
  });
});
