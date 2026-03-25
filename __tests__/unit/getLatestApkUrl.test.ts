import { getLatestApkUrl } from "@/web/src/utils/getLatestApkUrl";

describe("getLatestApkUrl", () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    (global as unknown as { fetch: typeof fetch }).fetch = fetchMock;
  });

  it("returns downloadUrl from primary metadata", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ downloadUrl: "https://example.com/latest.apk" }),
    });

    const result = await getLatestApkUrl();

    expect(result).toBe("https://example.com/latest.apk");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenNthCalledWith(1, "/download.json", {
      cache: "no-store",
    });
  });

  it("falls back to apkUrl from secondary source", async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ apkUrl: "https://example.com/eas.apk" }),
      });

    const result = await getLatestApkUrl();

    expect(result).toBe("https://example.com/eas.apk");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("returns null when all sources fail", async () => {
    fetchMock
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

    const result = await getLatestApkUrl();

    expect(result).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
