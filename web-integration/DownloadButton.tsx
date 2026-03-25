import { useEffect, useState } from "react";

interface BuildMetadata {
  version: string;
  buildId: string;
  apkUrl: string;
  platform: string;
  buildDate: string;
  commitSha: string;
  commitMessage: string;
  branch: string;
}

export default function DownloadButton() {
  const [buildData, setBuildData] = useState<BuildMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const metadataUrl =
    "https://raw.githubusercontent.com/848deepak/Soma/main/build-artifacts/latest-build.json";

  useEffect(() => {
    fetchLatestBuild();
  }, []);

  const fetchLatestBuild = async () => {
    try {
      setLoading(true);
      // Fetch from GitHub raw content
      const response = await fetch(metadataUrl);

      if (!response.ok) throw new Error("Failed to fetch build data");

      const data = await response.json();
      setBuildData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load build");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (buildData?.apkUrl) {
      window.open(buildData.apkUrl, "_blank");
    }
  };

  if (loading) {
    return (
      <div className="inline-flex items-center px-6 py-3 bg-gray-200 rounded-lg cursor-not-allowed">
        <svg
          className="animate-spin h-5 w-5 mr-3 text-gray-600"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        Loading...
      </div>
    );
  }

  if (error || !buildData) {
    return (
      <div className="inline-flex items-center px-6 py-3 bg-red-100 text-red-700 rounded-lg">
        <span>Unable to load latest build</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Download Button */}
      <button
        onClick={handleDownload}
        className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200"
      >
        <svg
          className="w-6 h-6 mr-2"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
          />
        </svg>
        Download Latest APK
      </button>

      {/* Build Info */}
      <div className="text-sm text-gray-600 text-center">
        <p className="font-medium">Version {buildData.version}</p>
        <p className="text-xs text-gray-500">
          Built on {new Date(buildData.buildDate).toLocaleDateString()}
        </p>
      </div>

      {/* Installation Instructions */}
      <details className="mt-4 max-w-md">
        <summary className="cursor-pointer text-sm text-gray-700 font-medium hover:text-gray-900">
          Installation Instructions
        </summary>
        <div className="mt-2 text-sm text-gray-600 space-y-2 pl-4">
          <ol className="list-decimal space-y-2">
            <li>Download the APK file above</li>
            <li>Open the downloaded file on your Android device</li>
            <li>
              If prompted, enable "Install from Unknown Sources" in your device
              settings
            </li>
            <li>Follow the installation prompts</li>
            <li>Open the Soma app and enjoy!</li>
          </ol>
          <p className="text-xs text-gray-500 mt-3">
            Note: You may see a warning from Google Play Protect. This is normal
            for apps not distributed through the Play Store. You can safely
            proceed with the installation.
          </p>
        </div>
      </details>
    </div>
  );
}
