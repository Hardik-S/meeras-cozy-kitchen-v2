import { afterEach, describe, expect, it, vi } from "vitest";
import { defaultAdminData } from "@/lib/catalog";
import { POST } from "./route";

const resendSendMock = vi.hoisted(() => vi.fn());

vi.mock("resend", () => ({
  Resend: vi.fn(function Resend() {
    return { emails: { send: resendSendMock } };
  })
}));

const validPayload = {
  name: "Amina",
  email: "amina@example.com",
  phone: "4165550101",
  eventDate: "2099-05-20",
  pickupTime: "12:00-14:00",
  cakeSizeId: "eight-inch",
  flavourId: "vanilla",
  frostingId: "white-chocolate-ganache",
  fillingIds: ["raspberry-filling", "apricot-filling"],
  toppingIds: ["fresh-strawberry"],
  message: "Birthday cake with soft florals.",
  acknowledgements: {
    notice: true,
    allergens: true,
    address: true,
    certification: true,
    inspiration: true
  },
  website: ""
};

function request(payload: unknown = validPayload) {
  return new Request("http://localhost/api/inquiry", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

function appsScriptMock(data = defaultAdminData, submit: { ok: boolean; orderId?: string; error?: string } = {
  ok: true,
  orderId: "ord_route_123"
}) {
  return vi.fn(async (_url: string, init?: RequestInit) => {
    const body = JSON.parse(init?.body as string);
    return body.action === "listAdminData"
      ? new Response(JSON.stringify({ ok: true, data }), { status: 200 })
      : new Response(JSON.stringify(submit), { status: submit.ok ? 200 : 500 });
  });
}

describe("POST /api/inquiry", () => {
  afterEach(() => {
    resendSendMock.mockReset();
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("accepts the canonical cake payload with fallback catalog data", async () => {
    const response = await POST(request());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.email.status).toBe("skipped");
    expect(body.summary).toContain("Pickup time: 12pm-2pm");
    expect(body.summary).toContain("Fillings: Raspberry, Apricot");
    expect(body.summary).toContain("Starting at $100");
    expect(body.order).toMatchObject({
      productType: "cake",
      pickupTime: "12:00-14:00",
      cakeSizeId: "eight-inch",
      frostingId: "white-chocolate-ganache",
      fillingIds: ["raspberry-filling", "apricot-filling"],
      toppingIds: ["fresh-strawberry"]
    });
  });

  it("forwards the same validated cake summary to Apps Script", async () => {
    vi.stubEnv("GOOGLE_APPS_SCRIPT_URL", "https://script.google.com/macros/s/test/exec");
    vi.stubEnv("GOOGLE_APPS_SCRIPT_SECRET", "shared-secret");
    const fetchMock = appsScriptMock();
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(request());
    const body = await response.json();
    const submitCall = fetchMock.mock.calls.find(([, init]) =>
      JSON.parse(init?.body as string).action === "submitOrder"
    );
    const submitBody = JSON.parse(submitCall?.[1]?.body as string);

    expect(response.status).toBe(200);
    expect(body.appsScript).toEqual({ status: "sent", orderId: "ord_route_123" });
    expect(body.email).toEqual({ status: "skipped", reason: "apps-script-sent" });
    expect(submitBody.summary).toBe(body.summary);
    expect(submitBody.inquiry).not.toHaveProperty("productType");
  });

  it("uses configured live cake labels and prices in every summary", async () => {
    vi.stubEnv("GOOGLE_APPS_SCRIPT_URL", "https://script.google.com/macros/s/test/exec");
    vi.stubEnv("GOOGLE_APPS_SCRIPT_SECRET", "shared-secret");
    const liveData = {
      ...defaultAdminData,
      offerings: defaultAdminData.offerings.map((item) => {
        if (item.id === "eight-inch") return { ...item, label: "Tall 8-inch cake", low: 85, high: 85 };
        if (item.id === "fresh-strawberry") return { ...item, label: "Fresh local strawberry", low: 7, high: 7 };
        return item;
      })
    };
    const fetchMock = appsScriptMock(liveData);
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(request());
    const body = await response.json();

    expect(body.summary).toContain("Cake size: Tall 8-inch cake");
    expect(body.summary).toContain("Toppings: Fresh local strawberry");
    expect(body.summary).toContain("Starting at $112");
  });

  it("sends the live-catalog summary by fallback email when the Sheet write fails", async () => {
    vi.stubEnv("GOOGLE_APPS_SCRIPT_URL", "https://script.google.com/macros/s/test/exec");
    vi.stubEnv("GOOGLE_APPS_SCRIPT_SECRET", "shared-secret");
    vi.stubEnv("RESEND_API_KEY", "test-key");
    vi.stubEnv("ORDER_NOTIFY_EMAIL", "orders@example.com");
    resendSendMock.mockResolvedValue({ data: { id: "email_123" } });
    vi.stubGlobal("fetch", appsScriptMock(defaultAdminData, {
      ok: false,
      error: "Sheet write failed."
    }));

    const response = await POST(request());
    const body = await response.json();

    expect(body.appsScript).toEqual({ status: "error", message: "Sheet write failed." });
    expect(body.email).toEqual({ status: "sent", id: "email_123" });
    expect(resendSendMock).toHaveBeenCalledWith(expect.objectContaining({ text: body.summary }));
  });

  it.each([
    {
      field: "fillingIds",
      value: ["retired-filling"],
      issue: "Please remove unavailable fillings and try again."
    },
    {
      field: "toppingIds",
      value: ["retired-topping"],
      issue: "Please remove unavailable toppings and try again."
    },
    {
      field: "frostingId",
      value: "retired-frosting",
      issue: "Please choose an available frosting."
    }
  ])("rejects stale $field choices", async ({ field, value, issue }) => {
    const response = await POST(request({ ...validPayload, [field]: value }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.issues[field]).toContain(issue);
  });

  it("normalizes copied live offering ids before validation", async () => {
    const response = await POST(request({
      ...validPayload,
      cakeSizeId: " Eight-Inch ",
      flavourId: " Vanilla ",
      frostingId: " White-Chocolate-Ganache ",
      fillingIds: [" Raspberry-Filling "],
      toppingIds: [" Fresh-Strawberry "]
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.order).toMatchObject({
      cakeSizeId: "eight-inch",
      flavourId: "vanilla",
      frostingId: "white-chocolate-ganache",
      fillingIds: ["raspberry-filling"],
      toppingIds: ["fresh-strawberry"]
    });
  });

  it("rejects honeypots and removed legacy fields", async () => {
    expect((await POST(request({ ...validPayload, website: "filled" }))).status).toBe(400);
    expect((await POST(request({
      ...validPayload,
      productType: "cake",
      servings: 18,
      budget: "100-150",
      addOnIds: []
    }))).status).toBe(400);
  });

  it("validates notice against the current request date", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2099-05-20T12:00:00-04:00"));

    const response = await POST(request());
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.issues.eventDate).toContain("Please choose a pickup date at least 7 days away.");
  });
});
