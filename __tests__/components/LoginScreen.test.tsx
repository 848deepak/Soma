/**
 * __tests__/components/LoginScreen.test.tsx
 * Component tests for the LoginScreen (sign-in + password reset).
 */
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";

import { resetPassword, signInWithEmail } from "@/lib/auth";
import { LoginScreen } from "@/src/screens/LoginScreen";

// expo-router is mocked via __mocks__/expo-router.ts
import { useRouter } from "expo-router";

const mockSignIn = signInWithEmail as jest.MockedFunction<
  typeof signInWithEmail
>;
const mockResetPw = resetPassword as jest.MockedFunction<typeof resetPassword>;
const mockUseRouter = useRouter as jest.Mock;

const mockReplace = jest.fn();
const mockPush = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  mockUseRouter.mockReturnValue({
    replace: mockReplace,
    push: mockPush,
    back: jest.fn(),
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("LoginScreen – login mode", () => {
  it("renders email and password inputs", () => {
    const { getByTestId } = render(<LoginScreen />);
    expect(getByTestId("email-input")).toBeTruthy();
    expect(getByTestId("password-input")).toBeTruthy();
  });

  it("renders the Sign In button", () => {
    const { getByTestId } = render(<LoginScreen />);
    expect(getByTestId("primary-button")).toBeTruthy();
  });

  it("shows forgot-password and create-account links in login mode", () => {
    const { getByTestId } = render(<LoginScreen />);
    expect(getByTestId("forgot-password-button")).toBeTruthy();
    expect(getByTestId("create-account-button")).toBeTruthy();
  });

  it("shows the skip button for anonymous use", () => {
    const { getByTestId } = render(<LoginScreen />);
    expect(getByTestId("skip-button")).toBeTruthy();
  });

  it("alerts when email and password are empty", () => {
    jest.spyOn(Alert, "alert");
    const { getByTestId } = render(<LoginScreen />);
    fireEvent.press(getByTestId("primary-button"));
    expect(Alert.alert).toHaveBeenCalledWith(
      "Missing fields",
      expect.any(String),
    );
  });

  it("calls signInWithEmail with trimmed credentials", async () => {
    const { getByTestId } = render(<LoginScreen />);
    fireEvent.changeText(getByTestId("email-input"), "  test@example.com  ");
    fireEvent.changeText(getByTestId("password-input"), "password123");
    fireEvent.press(getByTestId("primary-button"));
    await waitFor(() =>
      expect(mockSignIn).toHaveBeenCalledWith(
        "test@example.com",
        "password123",
      ),
    );
  });

  it("navigates to tabs on successful login", async () => {
    // Default mock already resolves successfully; just verify navigation
    const { getByTestId } = render(<LoginScreen />);
    fireEvent.changeText(getByTestId("email-input"), "test@example.com");
    fireEvent.changeText(getByTestId("password-input"), "password123");
    fireEvent.press(getByTestId("primary-button"));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/(tabs)"));
  });

  it("shows alert on sign in failure", async () => {
    jest.spyOn(Alert, "alert");
    mockSignIn.mockRejectedValueOnce(new Error("Invalid credentials"));
    const { getByTestId } = render(<LoginScreen />);
    fireEvent.changeText(getByTestId("email-input"), "bad@example.com");
    fireEvent.changeText(getByTestId("password-input"), "wrongpass");
    fireEvent.press(getByTestId("primary-button"));
    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith(
        "Sign In Failed",
        "Invalid credentials",
      ),
    );
  });

  it("navigates to tabs when skip button is pressed", () => {
    const { getByTestId } = render(<LoginScreen />);
    fireEvent.press(getByTestId("skip-button"));
    expect(mockReplace).toHaveBeenCalledWith("/(tabs)");
  });

  it("navigates to signup when create account is pressed", () => {
    const { getByTestId } = render(<LoginScreen />);
    fireEvent.press(getByTestId("create-account-button"));
    expect(mockPush).toHaveBeenCalledWith("/auth/signup");
  });
});

describe("LoginScreen – reset mode", () => {
  it("switches to reset mode on forgot-password press", () => {
    const { getByTestId, getByText } = render(<LoginScreen />);
    fireEvent.press(getByTestId("forgot-password-button"));
    expect(getByText("Reset password")).toBeTruthy();
  });

  it("hides password input in reset mode", () => {
    const { getByTestId, queryByTestId } = render(<LoginScreen />);
    fireEvent.press(getByTestId("forgot-password-button"));
    expect(queryByTestId("password-input")).toBeNull();
  });

  it("shows Send Reset Link button in reset mode", () => {
    const { getByTestId, getByText } = render(<LoginScreen />);
    fireEvent.press(getByTestId("forgot-password-button"));
    expect(getByText("Send Reset Link")).toBeTruthy();
  });

  it("alerts when email is empty in reset mode", () => {
    jest.spyOn(Alert, "alert");
    const { getByTestId } = render(<LoginScreen />);
    fireEvent.press(getByTestId("forgot-password-button"));
    fireEvent.press(getByTestId("primary-button"));
    expect(Alert.alert).toHaveBeenCalledWith(
      "Email required",
      expect.any(String),
    );
  });

  it("calls resetPassword with trimmed email", async () => {
    const { getByTestId } = render(<LoginScreen />);
    fireEvent.press(getByTestId("forgot-password-button"));
    fireEvent.changeText(getByTestId("email-input"), "  user@example.com  ");
    fireEvent.press(getByTestId("primary-button"));
    await waitFor(() =>
      expect(mockResetPw).toHaveBeenCalledWith("user@example.com"),
    );
  });

  it("shows recovery email sent confirmation after successful reset", async () => {
    const { getByTestId, getByText } = render(<LoginScreen />);
    fireEvent.press(getByTestId("forgot-password-button"));
    fireEvent.changeText(getByTestId("email-input"), "user@example.com");
    fireEvent.press(getByTestId("primary-button"));
    await waitFor(() => expect(getByText(/Recovery email sent/)).toBeTruthy());
  });

  it("shows error alert when reset password fails", async () => {
    jest.spyOn(Alert, "alert");
    mockResetPw.mockRejectedValueOnce(new Error("Email not found"));
    const { getByTestId } = render(<LoginScreen />);
    fireEvent.press(getByTestId("forgot-password-button"));
    fireEvent.changeText(getByTestId("email-input"), "unknown@example.com");
    fireEvent.press(getByTestId("primary-button"));
    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith("Error", "Email not found"),
    );
  });

  it("returns to login mode via back to sign in link", () => {
    const { getByTestId, getByText } = render(<LoginScreen />);
    fireEvent.press(getByTestId("forgot-password-button"));
    fireEvent.press(getByText("← Back to sign in"));
    expect(getByText("Welcome back")).toBeTruthy();
  });
});
