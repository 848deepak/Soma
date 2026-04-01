import React from "react";
import { render } from "@testing-library/react-native";
import { Animated } from "react-native";

import { SomaLoadingSplash } from "@/src/components/ui/SomaLoadingSplash";

describe("SomaLoadingSplash", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("uses light launch colors when color scheme is light", () => {
    jest
      .spyOn(require("react-native"), "useColorScheme")
      .mockReturnValue("light");

    const view = render(<SomaLoadingSplash subtitle="SOMA" />);
    const animatedViews = view.UNSAFE_getAllByType(Animated.View);

    expect(animatedViews[0]?.props.style.backgroundColor).toBe("#FDF7F5");
  });

  it("uses dark launch colors when color scheme is dark", () => {
    jest
      .spyOn(require("react-native"), "useColorScheme")
      .mockReturnValue("dark");

    const view = render(<SomaLoadingSplash subtitle="SOMA" />);
    const animatedViews = view.UNSAFE_getAllByType(Animated.View);

    expect(animatedViews[0]?.props.style.backgroundColor).toBe("#0F1115");
  });
});
