import React from "react";
import { render } from "@testing-library/react-native";

const mockRedirectSpy = jest.fn();

jest.mock("expo-router", () => ({
  Redirect: ({ href }: { href: string }) => {
    mockRedirectSpy(href);
    return null;
  },
}));

import QuickCheckinRoute from "@/app/quick-checkin";

describe("QuickCheckinRoute", () => {
  beforeEach(() => {
    mockRedirectSpy.mockClear();
  });

  it("redirects legacy quick-checkin route to canonical daily log route", () => {
    render(<QuickCheckinRoute />);

    expect(mockRedirectSpy).toHaveBeenCalledWith("/log");
  });
});
