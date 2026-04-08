import React from "react";
import { renderWithProviders } from "../testUtils";

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
    renderWithProviders(<QuickCheckinRoute />);

    expect(mockRedirectSpy).toHaveBeenCalledWith("/log");
  });
});
