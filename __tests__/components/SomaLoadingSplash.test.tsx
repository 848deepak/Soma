import React from "react";
import { render } from "@testing-library/react-native";
import { Animated } from "react-native";

import { SomaLoadingSplash } from "@/src/components/ui/SomaLoadingSplash";

jest.mock("@/src/context/ThemeContext", () => ({
  useAppTheme: jest.fn(),
}));

describe("SomaLoadingSplash", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("uses light launch colors when color scheme is light", () => {
    const { useAppTheme } = require("@/src/context/ThemeContext");
    useAppTheme.mockReturnValue({
      isDark: false,
      theme: "cream",
      colors: {},
    });

    const view = render(<SomaLoadingSplash subtitle="SOMA" />);
    const animatedViews = view.UNSAFE_getAllByType(Animated.View);

    expect(animatedViews[0]?.props.style.backgroundColor).toBe("#FDF7F5");
  });

  it("uses dark launch colors when color scheme is dark", () => {
    const { useAppTheme } = require("@/src/context/ThemeContext");
    useAppTheme.mockReturnValue({
      isDark: true,
      theme: "midnight",
      colors: {},
    });

    const view = render(<SomaLoadingSplash subtitle="SOMA" />);
    const animatedViews = view.UNSAFE_getAllByType(Animated.View);

    expect(animatedViews[0]?.props.style.backgroundColor).toBe("#0F1115");
  });
});
