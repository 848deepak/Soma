import React from "react";
import { render } from "@testing-library/react-native";
import { ScrollView } from "react-native";

import { Screen } from "@/src/components/ui/Screen";

describe("Screen keyboard behavior", () => {
  it("configures ScrollView to keep form interactions usable while keyboard is open", () => {
    const view = render(
      <Screen>
        <></>
      </Screen>,
    );

    const scroll = view.UNSAFE_getByType(ScrollView);

    expect(scroll.props.keyboardShouldPersistTaps).toBe("handled");
    expect(scroll.props.keyboardDismissMode).toBe("on-drag");
  });
});
