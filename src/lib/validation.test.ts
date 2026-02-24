import { describe, it, expect } from "vitest";
import { CreateEnquirySchema, EnquiryModeSchema, EnquiryTypeSchema } from "./validation";

describe("EnquiryModeSchema", () => {
  it("accepts valid modes", () => {
    expect(EnquiryModeSchema.parse("GENERAL")).toBe("GENERAL");
    expect(EnquiryModeSchema.parse("FLEET")).toBe("FLEET");
    expect(EnquiryModeSchema.parse("PARCEL")).toBe("PARCEL");
    expect(EnquiryModeSchema.parse("PART_EX")).toBe("PART_EX");
    expect(EnquiryModeSchema.parse("STOCK")).toBe("STOCK");
  });

  it("rejects invalid mode values", () => {
    expect(() => EnquiryModeSchema.parse("INVALID")).toThrow();
    expect(() => EnquiryModeSchema.parse("")).toThrow();
  });
});

describe("EnquiryTypeSchema", () => {
  it("accepts valid types", () => {
    expect(EnquiryTypeSchema.parse("QUICK_QUESTION")).toBe("QUICK_QUESTION");
    expect(EnquiryTypeSchema.parse("QUOTE")).toBe("QUOTE");
    expect(EnquiryTypeSchema.parse("FLEET_ENQUIRY")).toBe("FLEET_ENQUIRY");
    expect(EnquiryTypeSchema.parse("PART_EXCHANGE")).toBe("PART_EXCHANGE");
  });

  it("rejects invalid type values", () => {
    expect(() => EnquiryTypeSchema.parse("INVALID")).toThrow();
    expect(() => EnquiryTypeSchema.parse("")).toThrow();
  });
});

describe("CreateEnquirySchema", () => {
  it("accepts valid public enquiry payload", () => {
    const valid = {
      mode: "GENERAL",
      type: "QUICK_QUESTION",
      name: "John Doe",
      email: "john@example.com",
      message: "Test message",
    };

    const result = CreateEnquirySchema.parse(valid);
    expect(result.mode).toBe("GENERAL");
    expect(result.type).toBe("QUICK_QUESTION");
    expect(result.name).toBe("John Doe");
    expect(result.email).toBe("john@example.com");
  });

  it("accepts valid enquiry with phone instead of email", () => {
    const valid = {
      mode: "GENERAL",
      type: "QUICK_QUESTION",
      name: "Jane Doe",
      phone: "1234567890",
      message: "Test message",
    };

    const result = CreateEnquirySchema.parse(valid);
    expect(result.phone).toBe("1234567890");
    expect(result.email).toBeUndefined();
  });

  it("rejects invalid email format", () => {
    const invalid = {
      mode: "GENERAL",
      type: "QUICK_QUESTION",
      name: "John Doe",
      email: "not-an-email",
      message: "Test message",
    };

    expect(() => CreateEnquirySchema.parse(invalid)).toThrow();
  });

  it("rejects enquiry without email or phone", () => {
    const invalid = {
      mode: "GENERAL",
      type: "QUICK_QUESTION",
      name: "John Doe",
      message: "Test message",
    };

    expect(() => CreateEnquirySchema.parse(invalid)).toThrow();
  });

  it("rejects empty name", () => {
    const invalid = {
      mode: "GENERAL",
      type: "QUICK_QUESTION",
      name: "",
      email: "john@example.com",
      message: "Test message",
    };

    expect(() => CreateEnquirySchema.parse(invalid)).toThrow();
  });

  it("rejects empty message", () => {
    const invalid = {
      mode: "GENERAL",
      type: "QUICK_QUESTION",
      name: "John Doe",
      email: "john@example.com",
      message: "",
    };

    expect(() => CreateEnquirySchema.parse(invalid)).toThrow();
  });

  it("requires reg and mileage for PART_EX mode", () => {
    const invalid = {
      mode: "PART_EX",
      type: "PART_EXCHANGE",
      name: "John Doe",
      email: "john@example.com",
      message: "Test message",
      // Missing reg and mileage
    };

    expect(() => CreateEnquirySchema.parse(invalid)).toThrow();
  });

  it("accepts valid PART_EX enquiry with reg and mileage", () => {
    const valid = {
      mode: "PART_EX",
      type: "PART_EXCHANGE",
      name: "John Doe",
      email: "john@example.com",
      message: "Test message",
      reg: "ABC123",
      mileage: 50000,
    };

    const result = CreateEnquirySchema.parse(valid);
    expect(result.reg).toBe("ABC123");
    expect(result.mileage).toBe(50000);
  });

  it("accepts optional context fields", () => {
    const valid = {
      mode: "GENERAL",
      type: "QUICK_QUESTION",
      name: "John Doe",
      email: "john@example.com",
      message: "Test message",
      pageUrl: "https://example.com/page",
      referrer: "https://google.com",
      utmSource: "google",
      utmMedium: "cpc",
      utmCampaign: "test",
      device: "desktop",
    };

    const result = CreateEnquirySchema.parse(valid);
    expect(result.pageUrl).toBe("https://example.com/page");
    expect(result.referrer).toBe("https://google.com");
    expect(result.utmSource).toBe("google");
  });

  it("rejects invalid URL in pageUrl", () => {
    const invalid = {
      mode: "GENERAL",
      type: "QUICK_QUESTION",
      name: "John Doe",
      email: "john@example.com",
      message: "Test message",
      pageUrl: "not-a-url",
    };

    expect(() => CreateEnquirySchema.parse(invalid)).toThrow();
  });

  it("accepts empty string for email and treats as optional", () => {
    const valid = {
      mode: "GENERAL",
      type: "QUICK_QUESTION",
      name: "John Doe",
      email: "",
      phone: "1234567890",
      message: "Test message",
    };

    const result = CreateEnquirySchema.parse(valid);
    // Empty string is allowed but should be treated as not provided
    expect(result.email).toBe("");
  });
});
