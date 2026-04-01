/**
 * __tests__/components/SignupScreen.test.tsx
 * Component tests for the SignupScreen (account creation).
 */
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";

import { signUpWithEmail } from "@/lib/auth";
import { SignupScreen } from "@/src/screens/SignupScreen";

// expo-router is mocked via __mocks__/expo-router.ts
import { useRouter } from "expo-router";

const mockSignUp = signUpWithEmail as jest.MockedFunction<
  typeof signUpWithEmail
>;
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

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("SignupScreen – rendering", () => {
  it("renders email, password, and confirm password inputs", () => {
    const { getByTestId } = render(<SignupScreen />);
    expect(getByTestId("email-input")).toBeTruthy();
    expect(getByTestId("password-input")).toBeTruthy();
    expect(getByTestId("confirm-password-input")).toBeTruthy();
  });

  it("renders the Create Account button", () => {
    const { getByTestId } = render(<SignupScreen />);
    expect(getByTestId("signup-button")).toBeTruthy();
  });

  it("renders the Sign In link", () => {
    const { getByTestId } = render(<SignupScreen />);
    expect(getByTestId("signin-link")).toBeTruthy();
  });

  it("signs-in link navigates to login screen", () => {
    const { getByTestId } = render(<SignupScreen />);
    fireEvent.press(getByTestId("signin-link"));
    expect(mockPush).toHaveBeenCalledWith("/auth/login");
  });
});

describe("SignupScreen – input validation", () => {
  it("alerts when email is empty", () => {
    jest.spyOn(Alert, "alert");
    const { getByTestId } = render(<SignupScreen />);
    fireEvent.press(getByTestId("signup-button"));
    expect(Alert.alert).toHaveBeenCalledWith(
      "Missing email",
      expect.any(String),
    );
  });

  it("alerts when email is invalid format", () => {
    jest.spyOn(Alert, "alert");
    const { getByTestId } = render(<SignupScreen />);
    fireEvent.changeText(getByTestId("email-input"), "not-an-email");
    fireEvent.press(getByTestId("signup-button"));
    expect(Alert.alert).toHaveBeenCalledWith(
      "Invalid email",
      expect.any(String),
    );
  });

  it("alerts when password is shorter than 6 characters", () => {
    jest.spyOn(Alert, "alert");
    const { getByTestId } = render(<SignupScreen />);
    fireEvent.changeText(getByTestId("email-input"), "user@example.com");
    fireEvent.changeText(getByTestId("password-input"), "abc");
    fireEvent.press(getByTestId("signup-button"));
    expect(Alert.alert).toHaveBeenCalledWith(
      "Weak password",
      expect.any(String),
    );
  });

  it("alerts when passwords do not match", () => {
    jest.spyOn(Alert, "alert");
    const { getByTestId } = render(<SignupScreen />);
    fireEvent.changeText(getByTestId("email-input"), "user@example.com");
    fireEvent.changeText(getByTestId("password-input"), "password123");
    fireEvent.changeText(getByTestId("confirm-password-input"), "different123");
    fireEvent.press(getByTestId("signup-button"));
    expect(Alert.alert).toHaveBeenCalledWith(
      "Password mismatch",
      expect.any(String),
    );
  });

  it("does not call signUpWithEmail when validation fails", () => {
    const { getByTestId } = render(<SignupScreen />);
    // Empty email → fails at first validation
    fireEvent.press(getByTestId("signup-button"));
    expect(mockSignUp).not.toHaveBeenCalled();
  });
});

describe("SignupScreen – successful signup", () => {
  function fillValidForm(
    getByTestId: ReturnType<typeof render>["getByTestId"],
  ) {
    fireEvent.changeText(getByTestId("email-input"), "newuser@example.com");
    fireEvent.changeText(getByTestId("password-input"), "securePass1");
    fireEvent.changeText(getByTestId("confirm-password-input"), "securePass1");
  }

  it("calls signUpWithEmail once after submitting a valid form", async () => {
    const { getByTestId } = render(<SignupScreen />);
    fillValidForm(getByTestId);
    fireEvent.press(getByTestId("signup-button"));
    await waitFor(() => expect(mockSignUp).toHaveBeenCalledTimes(1));
  });

  it("calls signUpWithEmail with trimmed email and password", async () => {
    const { getByTestId } = render(<SignupScreen />);
    fireEvent.changeText(getByTestId("email-input"), "  newuser@example.com  ");
    fireEvent.changeText(getByTestId("password-input"), "securePass1");
    fireEvent.changeText(getByTestId("confirm-password-input"), "securePass1");
    fireEvent.press(getByTestId("signup-button"));
    await waitFor(() =>
      expect(mockSignUp).toHaveBeenCalledWith(
        "newuser@example.com",
        "securePass1",
      ),
    );
  });

  it("shows success screen after account creation", async () => {
    const { getByTestId, getByText } = render(<SignupScreen />);
    fillValidForm(getByTestId);
    fireEvent.press(getByTestId("signup-button"));
    await waitFor(() => expect(getByText("Check your email")).toBeTruthy());
  });

  it("success screen shows Go to Sign In button", async () => {
    const { getByTestId, getByText } = render(<SignupScreen />);
    fillValidForm(getByTestId);
    fireEvent.press(getByTestId("signup-button"));
    await waitFor(() => expect(getByText("Go to Sign In")).toBeTruthy());
  });

  it("Go to Sign In navigates to login", async () => {
    const { getByTestId, getByText } = render(<SignupScreen />);
    fillValidForm(getByTestId);
    fireEvent.press(getByTestId("signup-button"));
    await waitFor(() => expect(getByText("Go to Sign In")).toBeTruthy());
    fireEvent.press(getByText("Go to Sign In"));
    expect(mockPush).toHaveBeenCalledWith("/auth/login");
  });
});

describe("SignupScreen – signup failure", () => {
  it("shows alert with error message when signUpWithEmail throws", async () => {
    jest.spyOn(Alert, "alert");
    mockSignUp.mockRejectedValueOnce(new Error("Email already in use"));
    const { getByTestId } = render(<SignupScreen />);
    fireEvent.changeText(getByTestId("email-input"), "existing@example.com");
    fireEvent.changeText(getByTestId("password-input"), "password123");
    fireEvent.changeText(getByTestId("confirm-password-input"), "password123");
    fireEvent.press(getByTestId("signup-button"));
    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith(
        "Sign Up Failed",
        "Email already in use",
      ),
    );
  });

  it("does not show success screen after failure", async () => {
    mockSignUp.mockRejectedValueOnce(new Error("Something went wrong"));
    const { getByTestId, queryByText } = render(<SignupScreen />);
    fireEvent.changeText(getByTestId("email-input"), "user@example.com");
    fireEvent.changeText(getByTestId("password-input"), "password123");
    fireEvent.changeText(getByTestId("confirm-password-input"), "password123");
    fireEvent.press(getByTestId("signup-button"));
    await waitFor(() => expect(queryByText("Check your email")).toBeNull());
  });
});
