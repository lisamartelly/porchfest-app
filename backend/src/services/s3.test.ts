import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  sendMock: vi.fn(),
  getSignedUrlMock: vi.fn(),
  s3ClientConfigCalls: [] as unknown[],
  putObjectInputs: [] as unknown[],
  deleteObjectInputs: [] as unknown[],
}));

vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: class {
    public constructor(config: unknown) {
      mocks.s3ClientConfigCalls.push(config);
    }

    public send = mocks.sendMock;
  },
  PutObjectCommand: class {
    public constructor(input: unknown) {
      mocks.putObjectInputs.push(input);
    }
  },
  DeleteObjectCommand: class {
    public constructor(input: unknown) {
      mocks.deleteObjectInputs.push(input);
    }
  },
}));

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: mocks.getSignedUrlMock,
}));

describe("s3 service", () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.s3ClientConfigCalls.length = 0;
    mocks.putObjectInputs.length = 0;
    mocks.deleteObjectInputs.length = 0;
    delete process.env.S3_BUCKET_NAME;
    delete process.env.AWS_REGION;
    delete process.env.AWS_ACCESS_KEY_ID;
    delete process.env.AWS_SECRET_ACCESS_KEY;
    mocks.getSignedUrlMock.mockResolvedValue("https://signed.example/upload");
  });

  it("creates a presigned upload URL", async () => {
    const s3 = await import("./s3.js");

    const result = await s3.getPresignedUploadUrl("uploads/key.jpg", "image/jpeg");

    expect(result).toBe("https://signed.example/upload");
    expect(mocks.putObjectInputs[0]).toEqual({
      Bucket: "porchfest-band-photos-dev",
      Key: "uploads/key.jpg",
      ContentType: "image/jpeg",
    });
    expect(mocks.getSignedUrlMock).toHaveBeenCalledWith(
      expect.any(Object),
      expect.any(Object),
      { expiresIn: 300 }
    );
  });

  it("passes configured credentials into S3 client when provided", async () => {
    process.env.AWS_REGION = "us-east-2";
    process.env.AWS_ACCESS_KEY_ID = "abc";
    process.env.AWS_SECRET_ACCESS_KEY = "def";

    const s3 = await import("./s3.js");

    await s3.getPresignedUploadUrl("uploads/key.jpg", "image/jpeg");

    expect(mocks.s3ClientConfigCalls[0]).toEqual({
      region: "us-east-2",
      credentials: {
        accessKeyId: "abc",
        secretAccessKey: "def",
      },
    });
  });

  it("deletes an object from the configured bucket", async () => {
    process.env.S3_BUCKET_NAME = "my-test-bucket";
    const s3 = await import("./s3.js");

    await s3.deleteObject("uploads/key.jpg");

    expect(mocks.deleteObjectInputs[0]).toEqual({
      Bucket: "my-test-bucket",
      Key: "uploads/key.jpg",
    });
    expect(mocks.sendMock).toHaveBeenCalledWith(expect.any(Object));
  });

  it("returns correct public URL", async () => {
    process.env.S3_BUCKET_NAME = "my-bucket";
    process.env.AWS_REGION = "us-west-1";

    const s3 = await import("./s3.js");

    expect(s3.getPublicUrl("uploads/key.jpg")).toBe(
      "https://my-bucket.s3.us-west-1.amazonaws.com/uploads/key.jpg"
    );
  });

  it("reuses cached S3 client across calls", async () => {
    const s3 = await import("./s3.js");

    await s3.getPresignedUploadUrl("uploads/one.jpg", "image/jpeg");
    await s3.getPresignedUploadUrl("uploads/two.jpg", "image/jpeg");

    expect(mocks.s3ClientConfigCalls).toHaveLength(1);
    expect(mocks.getSignedUrlMock).toHaveBeenCalledTimes(2);
  });

  it("uses default region in public URL when AWS_REGION is unset", async () => {
    process.env.S3_BUCKET_NAME = "my-bucket";
    delete process.env.AWS_REGION;

    const s3 = await import("./s3.js");

    expect(s3.getPublicUrl("uploads/key.jpg")).toBe(
      "https://my-bucket.s3.us-east-2.amazonaws.com/uploads/key.jpg"
    );
  });
});
