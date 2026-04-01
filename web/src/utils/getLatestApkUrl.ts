type DownloadMetadata = {
  apkUrl?: string;
  downloadUrl?: string;
  iosIpaUrl?: string;
};

export type DownloadLinks = {
  androidUrl: string | null;
  iosIpaUrl: string | null;
};

const METADATA_SOURCES = [
  "/download.json",
  "https://raw.githubusercontent.com/848deepak/Soma/main/web/public/download.json",
  "https://raw.githubusercontent.com/848deepak/Soma/main/build-artifacts/latest-build.json",
];

export async function getLatestApkUrl(): Promise<string | null> {
  const links = await getLatestDownloadLinks();
  return links.androidUrl;
}

export async function getLatestDownloadLinks(): Promise<DownloadLinks> {
  for (const source of METADATA_SOURCES) {
    try {
      const res = await fetch(source, { cache: "no-store" });
      if (!res.ok) continue;

      const data = (await res.json()) as DownloadMetadata;
      const androidUrl = data.downloadUrl ?? data.apkUrl ?? null;
      const iosIpaUrl = data.iosIpaUrl ?? null;

      if (androidUrl || iosIpaUrl) {
        return {
          androidUrl,
          iosIpaUrl,
        };
      }
    } catch {
      // Try the next metadata source.
    }
  }

  return {
    androidUrl: null,
    iosIpaUrl: null,
  };
}
