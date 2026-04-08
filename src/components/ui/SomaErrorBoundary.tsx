/**
 * SomaErrorBoundary.tsx
 * Enhanced error boundary that catches React errors, reports them to error tracking,
 * and provides multiple recovery mechanisms.
 */
import { SymbolView } from "expo-symbols";
import React from "react";
import { Alert, Text, TouchableOpacity, View } from "react-native";

import { useAppTheme } from "@/src/context/ThemeContext";
import { captureException } from "@/src/services/errorTracking";
import { logError } from "@/platform/monitoring/logger";

interface SomaErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
  retryCount: number;
}

interface SomaErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{
    error?: Error;
    retry: () => void;
    reset: () => void;
  }>;
  maxRetries?: number;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

export class SomaErrorBoundary extends React.Component<
  SomaErrorBoundaryProps,
  SomaErrorBoundaryState
> {
  private resetTimeoutId?: NodeJS.Timeout;

  constructor(props: SomaErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, retryCount: 0 };
  }

  static getDerivedStateFromError(
    error: Error,
  ): Partial<SomaErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logError('ui', 'react_error_caught', {
      errorMessage: error.message,
      componentStack: errorInfo.componentStack,
    });

    // Report error to tracking service with React-specific context
    captureException(error, {
      screen: "react_component",
      action: "render_error",
      componentStack: errorInfo.componentStack,
      errorBoundary: true,
    });

    // Store error info for better debugging
    this.setState({ errorInfo });

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    // Auto-retry for transient errors after a delay
    if (
      this.isTransientError(error) &&
      this.state.retryCount < (this.props.maxRetries || 2)
    ) {
      this.resetTimeoutId = setTimeout(() => {
        this.setState((prevState) => ({
          hasError: false,
          error: undefined,
          errorInfo: undefined,
          retryCount: prevState.retryCount + 1,
        }));
      }, 3000);
    }
  }

  componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
  }

  private isTransientError(error: Error): boolean {
    const transientPatterns = [
      /network/i,
      /timeout/i,
      /fetch/i,
      /connection/i,
      /loading chunk failed/i,
    ];

    return transientPatterns.some(
      (pattern) =>
        pattern.test(error.message) || pattern.test(error.stack || ""),
    );
  }

  private retry = () => {
    this.setState((prevState) => ({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      retryCount: prevState.retryCount + 1,
    }));
  };

  private reset = () => {
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      retryCount: 0,
    });
  };

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return (
        <FallbackComponent
          error={this.state.error}
          retry={this.retry}
          reset={this.reset}
        />
      );
    }

    return this.props.children;
  }
}

function DefaultErrorFallback({
  error,
  retry,
  reset,
}: {
  error?: Error;
  retry: () => void;
  reset: () => void;
}) {
  const { isDark } = useAppTheme();

  const handleSendReport = () => {
    Alert.alert(
      "Send Error Report",
      "Would you like to send an error report to help us fix this issue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Send Report",
          onPress: () => {
            // Additional error context could be sent here
            captureException(error || new Error("Unknown error"), {
              screen: "error_boundary_fallback",
              action: "user_report_request",
              userInitiated: true,
            });
            Alert.alert(
              "Thank you",
              "Error report sent. We'll work on fixing this issue.",
            );
          },
        },
      ],
    );
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: isDark ? "#0F1115" : "#FFFDFB",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 32,
      }}
    >
      {/* Error icon */}
      <View
        style={{
          width: 80,
          height: 80,
          borderRadius: 40,
          backgroundColor: isDark
            ? "rgba(239, 68, 68, 0.2)"
            : "rgba(239, 68, 68, 0.1)",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 32,
        }}
      >
        <SymbolView
          name={{
            ios: "exclamationmark.triangle.fill",
            android: "warning",
            web: "warning",
          }}
          tintColor="#EF4444"
          size={32}
        />
      </View>

      {/* SOMA logo */}
      <Text
        style={{
          fontFamily: "PlayfairDisplay-SemiBold",
          fontSize: 32,
          color: isDark ? "#F2F2F2" : "#2D2327",
          textAlign: "center",
          marginBottom: 16,
        }}
      >
        SOMA
      </Text>

      {/* Error message */}
      <Text
        style={{
          fontSize: 18,
          color: isDark ? "#F2F2F2" : "#2D2327",
          textAlign: "center",
          marginBottom: 8,
        }}
      >
        Something went wrong
      </Text>

      <Text
        style={{
          fontSize: 14,
          color: isDark ? "rgba(242, 242, 242, 0.7)" : "rgba(45, 35, 39, 0.7)",
          textAlign: "center",
          marginBottom: 32,
          maxWidth: 280,
          lineHeight: 20,
        }}
      >
        {error?.message ||
          "An unexpected error occurred. We've been notified and are working on a fix."}
      </Text>

      {/* Primary action buttons */}
      <View style={{ gap: 12, width: "100%", maxWidth: 280 }}>
        <TouchableOpacity
          onPress={retry}
          style={{
            backgroundColor: isDark ? "#A78BFA" : "#DDA7A5",
            paddingVertical: 16,
            paddingHorizontal: 32,
            borderRadius: 999,
            shadowColor: isDark ? "#7C6BE8" : "#DDA7A5",
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.3,
            shadowRadius: 16,
            elevation: 8,
          }}
        >
          <Text
            style={{
              fontSize: 16,
              fontWeight: "600",
              color: "#FFFFFF",
              textAlign: "center",
            }}
          >
            Try again
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={reset}
          style={{
            backgroundColor: "transparent",
            paddingVertical: 12,
            paddingHorizontal: 32,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: isDark
              ? "rgba(242, 242, 242, 0.3)"
              : "rgba(45, 35, 39, 0.3)",
          }}
        >
          <Text
            style={{
              fontSize: 14,
              fontWeight: "500",
              color: isDark
                ? "rgba(242, 242, 242, 0.8)"
                : "rgba(45, 35, 39, 0.8)",
              textAlign: "center",
            }}
          >
            Reset app
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleSendReport}
          style={{
            backgroundColor: "transparent",
            paddingVertical: 8,
            paddingHorizontal: 16,
          }}
        >
          <Text
            style={{
              fontSize: 12,
              fontWeight: "400",
              color: isDark
                ? "rgba(242, 242, 242, 0.6)"
                : "rgba(45, 35, 39, 0.6)",
              textAlign: "center",
              textDecorationLine: "underline",
            }}
          >
            Send error report
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
