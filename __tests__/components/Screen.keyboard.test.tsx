import React from "react";
import { ScrollView } from "react-native";

import { renderWithProviders } from "../testUtils";
import { Screen } from "@/src/components/ui/Screen";

describe("Screen keyboard behavior", () => {
  it("configures ScrollView to keep form interactions usable while keyboard is open", () => {
    const view = renderWithProviders(
      <Screen>
        <></>
      </Screen>,
    );

    const scroll = view.UNSAFE_getByType(ScrollView);

    expect(scroll.props.keyboardShouldPersistTaps).toBe("handled");
    expect(scroll.props.keyboardDismissMode).toBe("on-drag");
  });
});
