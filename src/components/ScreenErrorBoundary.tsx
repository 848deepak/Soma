/**
 * src/components/ScreenErrorBoundary.tsx
 *
 * Screen-level error boundary that wraps individual screens and provides
 * a focused error fallback UI without exposing raw error messages.
 *
 * This is a layer above SomaErrorBoundary to catch errors scoped to a single screen,
 * providing better UX than a full-app error state.
 */

import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { useAppTheme } from '@/src/context/ThemeContext';
import { captureException } from '@/src/services/errorTracking';

interface ScreenErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
  retryCount: number;
}

interface ScreenErrorBoundaryProps {
  children: React.ReactNode;
  screenName?: string;
  onError?: (error: Error, info: React.ErrorInfo) => void;
  maxRetries?: number;
}

/**
 * Error key → i18n-ready user message.
 * Use these keys with your i18n system instead of raw error messages.
 */
const ERROR_MESSAGE_MAP: Record<string, string> = {
  'validation_error': 'error.validation_failed',
  'network_error': 'error.network_unavailable',
  'permission_denied': 'error.permission_denied',
  'not_found': 'error.resource_not_found',
  'conflict_error': 'error.conflict_occurred',
  'internal_error': 'error.internal_server_error',
  'timeout_error': 'error.request_timeout',
  'offline_error': 'error.offline_mode',
  'unknown_error': 'error.something_went_wrong',
};

export class ScreenErrorBoundary extends React.Component<
  ScreenErrorBoundaryProps,
  ScreenErrorBoundaryState
> {
  constructor(props: ScreenErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, retryCount: 0 };
  }

  static getDerivedStateFromError(error: Error): Partial<ScreenErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(
      `[ScreenErrorBoundary${this.props.screenName ? `:${this.props.screenName}` : ''}] Error caught:`,
      error,
      errorInfo,
    );

    // Always report to error tracking with screen context
    captureException(error, {
      screen: `screen_error:${this.props.screenName || 'unknown'}`,
      errorBoundary: 'screen_level',
      componentStack: errorInfo.componentStack,
      retryCount: this.state.retryCount,
    });

    this.setState({ errorInfo });
    this.props.onError?.(error, errorInfo);
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

  private getErrorKey = (error?: Error): string => {
    if (!error) return 'unknown_error';

    const message = error.message.toLowerCase();

    if (message.includes('validation')) return 'validation_error';
    if (message.includes('network') || message.includes('fetch')) return 'network_error';
    if (message.includes('permission') || message.includes('unauthorized')) return 'permission_denied';
    if (message.includes('not found') || message.includes('404')) return 'not_found';
    if (message.includes('conflict') || message.includes('409')) return 'conflict_error';
    if (message.includes('timeout')) return 'timeout_error';
    if (message.includes('offline')) return 'offline_error';
    if (message.includes('500') || message.includes('server error')) return 'internal_error';

    return 'unknown_error';
  };

  render() {
    if (this.state.hasError) {
      const errorKey = this.getErrorKey(this.state.error);
      const i18nKey = ERROR_MESSAGE_MAP[errorKey] || ERROR_MESSAGE_MAP['unknown_error'];

      return (
        <ScreenErrorFallback
          i18nKey={i18nKey}
          errorKey={errorKey}
          screenName={this.props.screenName}
          onRetry={this.retry}
          onReset={this.reset}
          retryCount={this.state.retryCount}
          maxRetries={this.props.maxRetries || 2}
        />
      );
    }

    return this.props.children;
  }
}

interface ScreenErrorFallbackProps {
  i18nKey: string;
  errorKey: string;
  screenName?: string;
  onRetry: () => void;
  onReset: () => void;
  retryCount: number;
  maxRetries: number;
}

function ScreenErrorFallback({
  i18nKey,
  errorKey,
  screenName,
  onRetry,
  onReset,
  retryCount,
  maxRetries,
}: ScreenErrorFallbackProps) {
  const { isDark } = useAppTheme();
  const canRetry = retryCount < maxRetries;

  // Get icon based on error type
  const getErrorIcon = () => {
    switch (errorKey) {
      case 'network_error':
      case 'offline_error':
        return 'wifi.slash';
      case 'permission_denied':
        return 'lock.fill';
      case 'not_found':
        return 'questionmark.circle.fill';
      case 'conflict_error':
        return 'exclamationmark.circle.fill';
      default:
        return 'exclamationmark.triangle.fill';
    }
  };

  return (
    <ScrollView
      contentContainerStyle={{
        flex: 1,
        justifyContent: 'center',
        backgroundColor: isDark ? '#0F1115' : '#FFFDFB',
        paddingHorizontal: 24,
        paddingVertical: 32,
      }}
    >
      <View style={{ alignItems: 'center', gap: 24 }}>
        {/* Error Icon */}
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: 36,
            backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <SymbolView
            name={{
              ios: getErrorIcon(),
              android: 'error_outline',
              web: 'error_outline',
            }}
            tintColor="#EF4444"
            size={28}
          />
        </View>

        {/* Title */}
        <Text
          style={{
            fontSize: 20,
            fontWeight: '600',
            color: isDark ? '#F2F2F2' : '#2D2327',
            textAlign: 'center',
          }}
        >
          {/* Fallback: use i18n key as display text if i18n not available */}
          {/* In production, integrate with your i18n library here */}
          Something went wrong
        </Text>

        {/* Description - use i18n key for lookup */}
        <Text
          style={{
            fontSize: 14,
            color: isDark ? 'rgba(242, 242, 242, 0.7)' : 'rgba(45, 35, 39, 0.7)',
            textAlign: 'center',
            lineHeight: 20,
          }}
        >
          {/* i18n integration point: i18n.t(i18nKey) */}
          We encountered an issue on {screenName || 'this screen'}. Please try again.
        </Text>

        {/* Context: show error key for debugging (dev only) */}
        {__DEV__ && (
          <Text
            style={{
              fontSize: 11,
              color: isDark ? 'rgba(242, 242, 242, 0.4)' : 'rgba(45, 35, 39, 0.4)',
              fontFamily: 'Courier New',
              textAlign: 'center',
            }}
          >
            [{errorKey}] Retry {retryCount + 1} of {maxRetries}
          </Text>
        )}

        {/* Action Buttons */}
        <View style={{ gap: 12, width: '100%', marginTop: 8 }}>
          <TouchableOpacity
            onPress={onRetry}
            disabled={!canRetry}
            style={{
              backgroundColor: canRetry ? (isDark ? '#A78BFA' : '#DDA7A5') : 'rgba(128, 128, 128, 0.5)',
              paddingVertical: 14,
              paddingHorizontal: 24,
              borderRadius: 999,
              opacity: canRetry ? 1 : 0.6,
            }}
          >
            <Text
              style={{
                fontSize: 16,
                fontWeight: '600',
                color: '#FFFFFF',
                textAlign: 'center',
              }}
            >
              Try again
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onReset}
            style={{
              backgroundColor: 'transparent',
              paddingVertical: 12,
              paddingHorizontal: 24,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: isDark ? 'rgba(242, 242, 242, 0.2)' : 'rgba(45, 35, 39, 0.2)',
            }}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: '500',
                color: isDark ? 'rgba(242, 242, 242, 0.7)' : 'rgba(45, 35, 39, 0.7)',
                textAlign: 'center',
              }}
            >
              Go back
            </Text>
          </TouchableOpacity>
        </View>

        {/* Support link for permission/server errors */}
        {(errorKey === 'permission_denied' || errorKey === 'internal_error') && (
          <TouchableOpacity
            onPress={() => {
              // In production, link to support page
              console.log('[Support] Contact support for:', errorKey);
            }}
          >
            <Text
              style={{
                fontSize: 12,
                color: isDark ? '#A78BFA' : '#DDA7A5',
                textDecorationLine: 'underline',
                marginTop: 8,
              }}
            >
              Need help? Contact support
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}
