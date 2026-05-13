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

import { sendBandMagicLink, sendReviewerAssignmentEmail } from "./email.js";

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

describe("sendReviewerAssignmentEmail", () => {
  const originalFromEmail = process.env.FROM_EMAIL;
  const originalFrontendUrl = process.env.FRONTEND_URL;

  beforeEach(() => {
    mocks.sendMock.mockResolvedValue({ error: null });
    process.env.FROM_EMAIL = originalFromEmail;
    process.env.FRONTEND_URL = originalFrontendUrl;
  });

  it("sends email with correct parameters", async () => {
    process.env.FROM_EMAIL = "events@example.com";
    process.env.FRONTEND_URL = "https://fest.example.com";

    await sendReviewerAssignmentEmail(
      "reviewer@example.com",
      "Alice",
      3,
      "Uptown Porchfest"
    );

    expect(mocks.sendMock).toHaveBeenCalledOnce();
    expect(mocks.sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "events@example.com",
        to: "reviewer@example.com",
        subject: "You've been assigned bands to review for Uptown Porchfest",
      })
    );
    const html = mocks.sendMock.mock.calls[0][0].html as string;
    expect(html).toContain("Alice");
    expect(html).toContain("3 bands");
    expect(html).toContain("https://fest.example.com/admin?section=my-reviews");
  });

  it("uses singular 'band' when count is 1", async () => {
    await sendReviewerAssignmentEmail("r@example.com", "Bob", 1, "Fest");

    const html = mocks.sendMock.mock.calls[0][0].html as string;
    expect(html).toContain("1 band");
    expect(html).not.toContain("1 bands");
  });

  it("falls back to defaults when env vars are missing", async () => {
    delete process.env.FROM_EMAIL;
    delete process.env.FRONTEND_URL;

    await sendReviewerAssignmentEmail("r@example.com", "Bob", 2, "Fest");

    expect(mocks.sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "noreply@porchfest.app",
      })
    );
    const html = mocks.sendMock.mock.calls[0][0].html as string;
    expect(html).toContain("http://localhost:5173/admin?section=my-reviews");
  });

  it("throws when email provider returns an error", async () => {
    mocks.sendMock.mockResolvedValue({ error: { message: "provider down" } });

    await expect(
      sendReviewerAssignmentEmail("r@example.com", "Bob", 2, "Fest")
    ).rejects.toThrow("Failed to send email");

    expect(mocks.loggerErrorMock).toHaveBeenCalledOnce();
  });
});
