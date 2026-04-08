/**
 * app/components/SomaRootErrorBoundary.tsx
 *
 * Root-level error boundary for catching unhandled React render errors
 * that would otherwise crash the entire app.
 *
 * Features:
 * - Catches render errors at the root level
 * - Displays recovery UI with structured error message
 * - Routes to /auth/login on recovery tap
 * - Logs errors to structured logger
 *
 * Usage:
 *   <SomaRootErrorBoundary>
 *     <YourApp />
 *   </SomaRootErrorBoundary>
 */

import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { logAuthEvent } from "@/lib/logAuthEvent";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class SomaRootErrorBoundary extends React.Component<Props, State> {
  private recoveryAttempts = 0;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    try {
      const timestamp = new Date().toISOString();
      const errorLog = {
        timestamp,
        type: "root_error_boundary",
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
      };

      console.error("[Root Error Boundary] Caught error:", errorLog);

      // Log to structured logger
      logAuthEvent({
        type: "session_restore",
        success: false,
        error: `Root render error: ${error.message}`,
      });
    } catch (loggingError) {
      console.error("[Root Error Boundary] Failed to log error:", loggingError);
    }
  }

  private handleRecovery = (): void => {
    try {
      this.recoveryAttempts += 1;
      const router = (this.context as any)?.router || useRouter();

      // Use a safe reference to router from outside the component
      const performRecovery = async () => {
        try {
          if (router && typeof router.replace === "function") {
            router.replace("/auth/login" as never);
          } else {
            console.warn("[Root Error Boundary] Router not available, attempting fallback");
            // Fallback: reload app by resetting state
            this.setState({
              hasError: false,
              error: null,
            });
          }
        } catch (e) {
          console.error("[Root Error Boundary] Recovery failed:", e);
        }
      };

      void performRecovery();
    } catch (e) {
      console.error("[Root Error Boundary] Error during recovery:", e);
    }
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <View style={styles.content}>
            <Text style={styles.title}>Something went wrong</Text>
            <Text style={styles.message}>
              We encountered an unexpected error. You can tap below to restart the app and return to login.
            </Text>
            {this.state.error && (
              <Text style={styles.errorDetails} numberOfLines={3}>
                {this.state.error.message}
              </Text>
            )}
            <TouchableOpacity
              style={styles.recoveryButton}
              onPress={this.handleRecovery}
              activeOpacity={0.7}
            >
              <Text style={styles.recoveryButtonText}>Tap to restart</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

// Custom hook wrapper for router-based recovery
export function makeSomaRootErrorBoundaryWithRouter(
  Component: React.ComponentType<any>,
) {
  return function RootErrorBoundaryWithRouter(props: any) {
    const router = useRouter();
    return (
      <RootErrorBoundaryWithRouterContext router={router}>
        <Component {...props} />
      </RootErrorBoundaryWithRouterContext>
    );
  };
}

interface RootErrorBoundaryWithRouterContextProps {
  children: React.ReactNode;
  router: any;
}

export class RootErrorBoundaryWithRouterContext extends React.Component<
  RootErrorBoundaryWithRouterContextProps,
  State
> {
  private router: any;
  private recoveryAttempts = 0;

  constructor(props: RootErrorBoundaryWithRouterContextProps) {
    super(props);
    this.router = props.router;
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    try {
      const timestamp = new Date().toISOString();
      const errorLog = {
        timestamp,
        type: "root_error_boundary",
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
      };

      console.error("[Root Error Boundary] Caught error:", errorLog);

      logAuthEvent({
        type: "session_restore",
        success: false,
        error: `Root render error: ${error.message}`,
      });
    } catch (loggingError) {
      console.error("[Root Error Boundary] Failed to log error:", loggingError);
    }
  }

  private handleRecovery = (): void => {
    try {
      this.recoveryAttempts += 1;

      if (this.router && typeof this.router.replace === "function") {
        this.router.replace("/auth/login" as never);
      } else {
        console.warn(
          "[Root Error Boundary] Router not available, resetting state",
        );
        this.setState({
          hasError: false,
          error: null,
        });
      }
    } catch (e) {
      console.error("[Root Error Boundary] Error during recovery:", e);
    }
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <View style={styles.content}>
            <Text style={styles.title}>Something went wrong</Text>
            <Text style={styles.message}>
              We encountered an unexpected error. You can tap below to restart
              the app and return to login.
            </Text>
            {this.state.error && (
              <Text style={styles.errorDetails} numberOfLines={3}>
                {this.state.error.message}
              </Text>
            )}
            <TouchableOpacity
              style={styles.recoveryButton}
              onPress={this.handleRecovery}
              activeOpacity={0.7}
            >
              <Text style={styles.recoveryButtonText}>Tap to restart</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  content: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    paddingVertical: 32,
    paddingHorizontal: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 12,
    textAlign: "center",
  },
  message: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
    marginBottom: 16,
    textAlign: "center",
  },
  errorDetails: {
    fontSize: 12,
    color: "#999",
    fontFamily: "monospace",
    marginBottom: 20,
    textAlign: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#f0f0f0",
    borderRadius: 6,
  },
  recoveryButton: {
    backgroundColor: "#8B4789",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 160,
    alignItems: "center",
  },
  recoveryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
});
