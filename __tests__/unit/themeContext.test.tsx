import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, renderHook, waitFor } from "@testing-library/react-native";

import { THEME_PREFERENCE_KEY } from "@/src/constants/storage";
import { ThemeProvider, useAppTheme } from "@/src/context/ThemeContext";

jest.mock("@react-native-async-storage/async-storage");

describe("ThemeContext", () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <ThemeProvider>{children}</ThemeProvider>
  );

  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
  });

  it("defaults to cream and hydrates", async () => {
    const { result } = renderHook(() => useAppTheme(), { wrapper });

    await waitFor(() => {
      expect(result.current.isHydrated).toBe(true);
    });

    expect(result.current.theme).toBe("cream");
    expect(result.current.isDark).toBe(false);
    expect(result.current.colors.background).toBe("#FFFDFB");
  });

  it("loads persisted midnight theme", async () => {
    await AsyncStorage.setItem(THEME_PREFERENCE_KEY, "midnight");

    const { result } = renderHook(() => useAppTheme(), { wrapper });

    await waitFor(() => {
      expect(result.current.isHydrated).toBe(true);
      expect(result.current.theme).toBe("midnight");
    });

    expect(result.current.isDark).toBe(true);
    expect(result.current.colors.background).toBe("#0F1115");
  });

  it("persists theme changes", async () => {
    const { result } = renderHook(() => useAppTheme(), { wrapper });

    await waitFor(() => {
      expect(result.current.isHydrated).toBe(true);
    });

    act(() => {
      result.current.setTheme("lavender");
    });

    await waitFor(() => {
      expect(result.current.theme).toBe("lavender");
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        THEME_PREFERENCE_KEY,
        "lavender",
      );
    });
  });

  it("returns a safe fallback when used without ThemeProvider", () => {
    const { result } = renderHook(() => useAppTheme());

    expect(result.current.theme).toBe("cream");
    expect(result.current.isHydrated).toBe(true);
  });
});
