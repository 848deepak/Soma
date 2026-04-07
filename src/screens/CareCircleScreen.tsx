/**
 * src/screens/CareCircleScreen.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Care Circle connection flow: scan QR → enter code → select role → confirm.
 *
 * Non-destructive integration point for Role-Based Partner Sharing.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    TextInput,
    View,
} from "react-native";

import { CARE_CIRCLE_KEY } from "@/hooks/useCareCircle";
import { normalizeInviteCode } from "@/hooks/useLinkPartner";
import { HeaderBar } from "@/src/components/ui/HeaderBar";
import { PressableScale } from "@/src/components/ui/PressableScale";
import { Screen } from "@/src/components/ui/Screen";
import { Typography } from "@/src/components/ui/Typography";
import { useAppTheme } from "@/src/context/ThemeContext";
import { logDataAccess } from "@/src/services/auditService";
import * as careCircleService from "@/src/services/careCircleService";
import type { CareCircleRole } from "@/types/database";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { SymbolView } from "expo-symbols";

// ─ Tab state ──────────────────────────────────────────────────────────────
type TabMode = "enter-code" | "select-role";

// ─ Component ──────────────────────────────────────────────────────────────

export function CareCircleScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isDark } = useAppTheme();

  const [tab, setTab] = useState<TabMode>("enter-code");
  const [code, setCode] = useState("");
  const [selectedRole, setSelectedRole] = useState<CareCircleRole>("viewer");

  const createConnectionMutation = useMutation({
    mutationFn: ({
      inviteCode,
      role,
    }: {
      inviteCode: string;
      role: CareCircleRole;
    }) => careCircleService.createConnection(inviteCode, role),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: CARE_CIRCLE_KEY });
      void logDataAccess("care_circle", "create_connection", {
        source: "care_circle_submit",
        selectedRole,
        success: true,
      });
      Alert.alert(
        "Request Sent!",
        `Connection request sent as ${selectedRole}. They'll need to accept your request.`,
        [
          {
            text: "Got it",
            onPress: () => router.back(),
          },
        ],
      );
    },
    onError: (error: any) => {
      void logDataAccess("care_circle", "request", {
        source: "care_circle_submit",
        selectedRole,
        success: false,
        message: error?.message ?? "unknown_error",
      });
      const message =
        error?.message || "Failed to send request. Please try again.";
      Alert.alert("Request Failed", message, [{ text: "Try Again" }]);
    },
  });

  const handleContinueToRole = () => {
    if (!code.trim()) {
      Alert.alert("Empty Code", "Please enter an invite code.");
      return;
    }

    try {
      const normalized = normalizeInviteCode(code);
      setCode(normalized);
      void logDataAccess("care_circle", "request", {
        source: "care_circle_role_selection_open",
        normalizedCodeLength: normalized.replace(/[^A-Z0-9]/g, "").length,
      });
      setTab("select-role");
    } catch (err: any) {
      Alert.alert("Invalid Code", err?.message || "Code format is incorrect.");
    }
  };

  const handleConfirmConnection = () => {
    void logDataAccess("care_circle", "request", {
      source: "care_circle_submit_attempt",
      selectedRole,
    });
    createConnectionMutation.mutate({ inviteCode: code, role: selectedRole });
  };

  useEffect(() => {
    void logDataAccess("care_circle", "view", {
      source: "care_circle_screen",
      tab,
      selectedRole,
    });
  }, [tab, selectedRole]);

  const cardStyle = {
    marginTop: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.7)",
    backgroundColor: isDark ? "rgba(30,33,40,0.85)" : "rgba(255,255,255,0.75)",
    padding: 20,
    shadowColor: "#DDA7A5",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 3,
  };

  const roleInfo: Record<CareCircleRole, { label: string; desc: string }> = {
    viewer: {
      label: "Viewer",
      desc: "See their cycle phase and alerts only. Limited read-only access.",
    },
    trusted: {
      label: "Trusted Friend",
      desc: "See cycle, mood, symptoms, and cycle predictions. Full read-only access.",
    },
    mutual: {
      label: "Mutual Share",
      desc: "Both of you can see each other's cycle and shared data. Two-way connection.",
    },
  };

  return (
    <Screen>
      <HeaderBar
        title={
          tab === "enter-code"
            ? "Connect Someone\nto Your Circle"
            : "Choose Your Role"
        }
        subtitle={
          tab === "enter-code"
            ? "Enter their invite code or scan QR"
            : "How do you want to share?"
        }
      />

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* ─ Tab: Enter Code ─────────────────────────────────────────────── */}
        {tab === "enter-code" && (
          <View>
            {/* Placeholder for QR Scanner */}
            <View style={{ ...cardStyle, alignItems: "center", marginTop: 32 }}>
              <View
                style={{
                  width: 120,
                  height: 120,
                  borderRadius: 20,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: isDark
                    ? "rgba(167,139,250,0.15)"
                    : "rgba(255,218,185,0.3)",
                  marginBottom: 16,
                }}
              >
                <SymbolView
                  name={{
                    ios: "qrcode.viewfinder",
                    android: "qr_code_scanner",
                    web: "qr_code_scanner",
                  }}
                  tintColor="#9B7E8C"
                  size={48}
                />
              </View>
              <Typography
                style={{ fontSize: 14, fontWeight: "600", marginBottom: 8 }}
              >
                Scan QR Code
              </Typography>
              <Typography
                variant="helper"
                style={{ textAlign: "center", marginBottom: 12 }}
              >
                Ask them to show their invite QR code.
              </Typography>
              <PressableScale
                disabled
                style={{
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: isDark
                    ? "rgba(255,255,255,0.2)"
                    : "rgba(221,167,165,0.3)",
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  opacity: 0.5,
                }}
              >
                <Typography
                  style={{
                    fontSize: 14,
                    fontWeight: "600",
                    color: isDark ? "#F2F2F2" : "#2D2327",
                  }}
                >
                  Scanner
                </Typography>
              </PressableScale>
            </View>

            {/* Divider */}
            <View style={{ marginVertical: 24 }}>
              <Typography
                variant="helper"
                style={{
                  textAlign: "center",
                  color: isDark ? "#9B7E8C" : "#BFAEB8",
                }}
              >
                OR
              </Typography>
            </View>

            {/* Code entry card */}
            <View style={cardStyle}>
              <Typography
                style={{ fontSize: 14, fontWeight: "600", marginBottom: 12 }}
              >
                Enter Invite Code
              </Typography>
              <Typography
                variant="helper"
                style={{
                  marginBottom: 12,
                  color: isDark ? "rgba(242,242,242,0.7)" : "#9B7E8C",
                }}
              >
                6-character code like AB-12-CD (with or without dashes)
              </Typography>

              <View
                style={{
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: isDark
                    ? "rgba(255,255,255,0.1)"
                    : "rgba(221,167,165,0.2)",
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.04)"
                    : "rgba(255,255,255,0.5)",
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  marginBottom: 16,
                }}
              >
                <TextInput
                  value={code}
                  onChangeText={setCode}
                  placeholder="AB-12-CD"
                  autoCapitalize="characters"
                  autoCorrect={false}
                  maxLength={8}
                  style={{
                    fontSize: 16,
                    fontWeight: "600",
                    letterSpacing: 2,
                    color: isDark ? "#F2F2F2" : "#2D2327",
                    textTransform: "uppercase",
                  }}
                />
              </View>

              {/* Buttons */}
              <View style={{ flexDirection: "row", gap: 10 }}>
                <PressableScale
                  onPress={() => router.back()}
                  style={{
                    flex: 1,
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: isDark
                      ? "rgba(255,255,255,0.2)"
                      : "rgba(221,167,165,0.35)",
                    paddingVertical: 12,
                  }}
                >
                  <Typography
                    style={{
                      fontSize: 14,
                      fontWeight: "600",
                      color: isDark ? "#F2F2F2" : "#2D2327",
                    }}
                  >
                    Cancel
                  </Typography>
                </PressableScale>

                <PressableScale
                  onPress={handleContinueToRole}
                  disabled={!code.trim()}
                  style={{
                    flex: 1,
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 999,
                    backgroundColor: code.trim() ? "#DDA7A5" : "#DDA7A5",
                    paddingVertical: 12,
                    opacity: code.trim() ? 1 : 0.5,
                  }}
                >
                  <Typography
                    style={{
                      fontSize: 14,
                      fontWeight: "600",
                      color: "#FFFFFF",
                    }}
                  >
                    Continue
                  </Typography>
                </PressableScale>
              </View>
            </View>
          </View>
        )}

        {/* ─ Tab: Select Role ────────────────────────────────────────────── */}
        {tab === "select-role" && (
          <View>
            <Typography variant="helper" style={{ marginBottom: 16 }}>
              Code: {code}
            </Typography>

            {/* Role picker cards */}
            {(Object.keys(roleInfo) as CareCircleRole[]).map((role) => (
              <PressableScale
                key={role}
                onPress={() => setSelectedRole(role)}
                style={{
                  ...cardStyle,
                  marginBottom: 12,
                  borderWidth: 2,
                  borderColor:
                    selectedRole === role
                      ? "#DDA7A5"
                      : isDark
                        ? "rgba(255,255,255,0.1)"
                        : "rgba(255,255,255,0.7)",
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "flex-start",
                    gap: 12,
                  }}
                >
                  <View
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      borderWidth: 2,
                      borderColor:
                        selectedRole === role ? "#DDA7A5" : "#9B7E8C",
                      backgroundColor:
                        selectedRole === role ? "#DDA7A5" : "transparent",
                      alignItems: "center",
                      justifyContent: "center",
                      marginTop: 2,
                    }}
                  >
                    {selectedRole === role && (
                      <Typography
                        style={{ color: "#FFFFFF", fontWeight: "bold" }}
                      >
                        ✓
                      </Typography>
                    )}
                  </View>

                  <View style={{ flex: 1 }}>
                    <Typography
                      style={{
                        fontSize: 16,
                        fontWeight: "600",
                        color: isDark ? "#F2F2F2" : "#2D2327",
                        marginBottom: 6,
                      }}
                    >
                      {roleInfo[role].label}
                    </Typography>
                    <Typography
                      variant="helper"
                      style={{
                        color: isDark ? "rgba(242,242,242,0.7)" : "#9B7E8C",
                        lineHeight: 18,
                      }}
                    >
                      {roleInfo[role].desc}
                    </Typography>
                  </View>
                </View>
              </PressableScale>
            ))}

            {/* Action buttons */}
            <View style={{ flexDirection: "row", gap: 10, marginTop: 24 }}>
              <PressableScale
                onPress={() => setTab("enter-code")}
                style={{
                  flex: 1,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: isDark
                    ? "rgba(255,255,255,0.2)"
                    : "rgba(221,167,165,0.35)",
                  paddingVertical: 12,
                }}
              >
                <Typography
                  style={{
                    fontSize: 14,
                    fontWeight: "600",
                    color: isDark ? "#F2F2F2" : "#2D2327",
                  }}
                >
                  Back
                </Typography>
              </PressableScale>

              <PressableScale
                onPress={handleConfirmConnection}
                disabled={createConnectionMutation.isPending}
                style={{
                  flex: 1,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 999,
                  backgroundColor: "#DDA7A5",
                  paddingVertical: 12,
                  opacity: createConnectionMutation.isPending ? 0.7 : 1,
                }}
              >
                {createConnectionMutation.isPending ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Typography
                    style={{
                      fontSize: 14,
                      fontWeight: "600",
                      color: "#FFFFFF",
                    }}
                  >
                    Connect as {roleInfo[selectedRole].label}
                  </Typography>
                )}
              </PressableScale>
            </View>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}
