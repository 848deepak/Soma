import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, TextInput, View, useColorScheme } from 'react-native';

import { SymptomButton } from '@/src/components/buttons/SymptomButton';
import { PressableScale } from '@/src/components/ui/PressableScale';
import { HeaderBar } from '@/src/components/ui/HeaderBar';
import { Screen } from '@/src/components/ui/Screen';
import { Typography } from '@/src/components/ui/Typography';
import { symptomOptions } from '@/src/features/cycle/uiMockData';
import { useSaveLog } from '@/hooks/useSaveLog';
import { useTodayLog } from '@/hooks/useDailyLogs';
import type { FlowLevel, SymptomOption } from '@/types/database';

const flowLevels = [
  { label: 'None', opacity: 0.1 },
  { label: 'Light', opacity: 0.3 },
  { label: 'Medium', opacity: 0.55 },
  { label: 'Heavy', opacity: 0.8 },
  { label: 'V. Heavy', opacity: 1.0 },
] as const;

export function DailyLogScreen() {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const saveLog = useSaveLog();

  const { data: todayLog } = useTodayLog();

  const [flowLevel, setFlowLevel] = useState<number>(todayLog?.flow_level ?? 2);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>(
    todayLog?.symptoms ?? [],
  );
  const [notes, setNotes] = useState(todayLog?.notes ?? '');

  const subtitle = useMemo(
    () => new Date().toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }),
    [],
  );

  function handleFlowChange(index: number) {
    void Haptics.selectionAsync();
    setFlowLevel(index);
  }

  function handleSymptomToggle(symptom: string) {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedSymptoms((previous) =>
      previous.includes(symptom) ? previous.filter((item) => item !== symptom) : [...previous, symptom],
    );
  }

  function handleSave() {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    saveLog.mutate(
      {
        flow_level: flowLevel as FlowLevel,
        symptoms: selectedSymptoms as SymptomOption[],
        notes: notes.trim() || null,
      },
      {
        onSuccess: () => router.back(),
      },
    );
  }

  const cardStyle = {
    marginTop: 20,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.7)',
    backgroundColor: isDark ? 'rgba(30,33,40,0.85)' : 'rgba(255,255,255,0.75)',
    padding: 20,
    shadowColor: '#DDA7A5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 3,
  };

  const dropColor = isDark ? '#A78BFA' : '#DDA7A5';

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Screen scrollable>
        <HeaderBar
          title={'How are you\nfeeling today?'}
          subtitle={subtitle}
          rightSlot={
            <PressableScale
              onPress={() => router.back()}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(221,167,165,0.3)',
                backgroundColor: isDark ? 'rgba(30,33,40,0.9)' : 'rgba(255,255,255,0.85)',
              }}
            >
              <Typography style={{ fontSize: 22, color: '#9B7E8C', lineHeight: 26 }}>
                ×
              </Typography>
            </PressableScale>
          }
        />

        {/* ── Flow section ──────────────────────────────────────── */}
        <View style={cardStyle}>
          <Typography
            style={{
              marginBottom: 20,
              fontSize: 17,
              fontWeight: '600',
              color: isDark ? '#F2F2F2' : '#2D2327',
            }}
          >
            Flow
          </Typography>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around' }}>
            {flowLevels.map((level, index) => {
              const isSelected = flowLevel === index;
              const dropHeight = 36 + index * 10;
              return (
                <PressableScale
                  key={level.label}
                  onPress={() => handleFlowChange(index)}
                  style={{ alignItems: 'center', paddingHorizontal: 8 }}
                >
                  {/* Teardrop shape */}
                  <View
                    style={{
                      width: 34,
                      height: dropHeight,
                      borderTopLeftRadius: 17,
                      borderTopRightRadius: 17,
                      borderBottomLeftRadius: 999,
                      borderBottomRightRadius: 999,
                      backgroundColor: dropColor,
                      opacity: isSelected ? 1.0 : level.opacity,
                      shadowColor: isSelected ? dropColor : 'transparent',
                      shadowOffset: { width: 0, height: 6 },
                      shadowOpacity: isSelected ? 0.5 : 0,
                      shadowRadius: 12,
                      elevation: isSelected ? 6 : 0,
                    }}
                  />
                  <Typography
                    variant="helper"
                    style={{
                      marginTop: 10,
                      color: isSelected
                        ? isDark ? '#F2F2F2' : '#2D2327'
                        : '#9B7E8C',
                      fontWeight: isSelected ? '600' : '400',
                    }}
                  >
                    {level.label}
                  </Typography>
                </PressableScale>
              );
            })}
          </View>
        </View>

        {/* ── Symptoms section ──────────────────────────────────── */}
        <View style={cardStyle}>
          <Typography
            style={{
              marginBottom: 16,
              fontSize: 17,
              fontWeight: '600',
              color: isDark ? '#F2F2F2' : '#2D2327',
            }}
          >
            Symptoms
          </Typography>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {symptomOptions.map((symptom) => {
              const isSelected = selectedSymptoms.includes(symptom);
              return (
                <SymptomButton
                  key={symptom}
                  label={symptom}
                  selected={isSelected}
                  onPress={() => handleSymptomToggle(symptom)}
                />
              );
            })}
          </View>
        </View>

        {/* ── Notes section ─────────────────────────────────────── */}
        <View style={cardStyle}>
          <Typography
            style={{
              marginBottom: 12,
              fontSize: 17,
              fontWeight: '600',
              color: isDark ? '#F2F2F2' : '#2D2327',
            }}
          >
            Notes
          </Typography>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            multiline
            placeholder="How are you feeling? Any observations?"
            placeholderTextColor="#9B7E8C"
            textAlignVertical="top"
            style={{
              minHeight: 92,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(221,167,165,0.25)',
              backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,218,185,0.15)',
              padding: 16,
              fontSize: 14,
              color: isDark ? '#F2F2F2' : '#2D2327',
              lineHeight: 20,
            }}
          />
        </View>

        {/* ── Save button ───────────────────────────────────────── */}
        <PressableScale
          onPress={handleSave}
          style={{
            marginTop: 24,
            marginBottom: 32,
            alignItems: 'center',
            borderRadius: 999,
            backgroundColor: isDark ? '#A78BFA' : '#DDA7A5',
            paddingVertical: 18,
            opacity: saveLog.isPending ? 0.6 : 1,
            shadowColor: '#DDA7A5',
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 0.4,
            shadowRadius: 40,
            elevation: 12,
          }}
        >
          <Typography
            style={{
              fontSize: 16,
              fontWeight: '600',
              color: '#FFFFFF',
            }}
          >
            {saveLog.isPending ? 'Saving…' : "Save Today's Log"}
          </Typography>
        </PressableScale>
      </Screen>
    </KeyboardAvoidingView>
  );
}
