// Utility to fetch the latest APK URL from the build-artifacts/latest-build.json file in the repo

export async function getLatestApkUrl(): Promise<string | null> {
  try {
    const res = await fetch(
      "https://raw.githubusercontent.com/848deepak/Soma/main/build-artifacts/latest-build.json",
      { cache: "no-store" },
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.apkUrl || null;
  } catch (e) {
    return null;
  }
}
