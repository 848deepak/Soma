import fs from "node:fs";
import path from "node:path";

describe("app icon configuration", () => {
  const workspaceRoot = path.resolve(__dirname, "../..");
  const appJsonPath = path.join(workspaceRoot, "app.json");

  it("defines explicit iOS and Android icon assets that exist", () => {
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, "utf8"));
    const expo = appJson.expo;

    expect(expo?.icon).toBe("./assets/images/icon.png");
    expect(expo?.ios?.icon).toBe("./assets/images/icon.png");

    expect(expo?.android?.adaptiveIcon?.foregroundImage).toBe(
      "./assets/images/android-icon-foreground.png",
    );
    expect(expo?.android?.adaptiveIcon?.backgroundImage).toBe(
      "./assets/images/android-icon-background.png",
    );
    expect(expo?.android?.adaptiveIcon?.monochromeImage).toBe(
      "./assets/images/android-icon-monochrome.png",
    );

    const requiredFiles = [
      expo.icon,
      expo.ios.icon,
      expo.android.adaptiveIcon.foregroundImage,
      expo.android.adaptiveIcon.backgroundImage,
      expo.android.adaptiveIcon.monochromeImage,
    ];

    for (const relativeFile of requiredFiles) {
      const filePath = path.join(workspaceRoot, relativeFile.replace("./", ""));
      expect(fs.existsSync(filePath)).toBe(true);
    }
  });
});
