type ApkMetadata = {
  apkUrl?: string;
  downloadUrl?: string;
};

const METADATA_SOURCES = [
  "/download.json",
  "https://raw.githubusercontent.com/848deepak/Soma/main/web/public/download.json",
  "https://raw.githubusercontent.com/848deepak/Soma/main/build-artifacts/latest-build.json",
];

export async function getLatestApkUrl(): Promise<string | null> {
  for (const source of METADATA_SOURCES) {
    try {
      const res = await fetch(source, { cache: "no-store" });
      if (!res.ok) continue;

      const data = (await res.json()) as ApkMetadata;
      const resolved = data.downloadUrl ?? data.apkUrl ?? null;

      if (resolved) {
        return resolved;
      }
    } catch {
      // Try the next metadata source.
    }
  }

  return null;
}
