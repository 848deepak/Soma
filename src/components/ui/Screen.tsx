import { ReactNode } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, StatusBar, useColorScheme, View } from 'react-native';

type ScreenProps = {
  children: ReactNode;
  scrollable?: boolean;
  /**
   * When true, renders ambient aurora background blobs behind content.
   * Defaults to true for most screens per Figma design.
   */
  showAurora?: boolean;
};

/** Soft ambient background blobs matching Figma's aurora glow effect */
function AuroraBlobs({ isDark }: { isDark: boolean }) {
  return (
    <>
      {/* Top-right warm peach glow */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: -60,
          right: -60,
          width: 280,
          height: 280,
          borderRadius: 140,
          backgroundColor: isDark ? 'rgba(79,70,229,0.12)' : 'rgba(255,218,185,0.35)',
          // React Native doesn't support CSS blur, so we approximate with opacity layers
          opacity: 0.6,
        }}
      />
      {/* Bottom-left dusty-rose glow */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          bottom: '30%',
          left: -80,
          width: 240,
          height: 240,
          borderRadius: 120,
          backgroundColor: isDark ? 'rgba(167,139,250,0.1)' : 'rgba(221,167,165,0.25)',
          opacity: 0.5,
        }}
      />
    </>
  );
}

export function Screen({ children, scrollable = true, showAurora = true }: ScreenProps) {
  const isDark = useColorScheme() === 'dark';

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: isDark ? '#0F1115' : '#FFFDFB' }}
    >
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Aurora background — absolutely positioned so it goes behind content */}
      {showAurora && <AuroraBlobs isDark={isDark} />}

      {scrollable ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 28, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={{ flex: 1, paddingHorizontal: 28, paddingBottom: 32 }}>
          {children}
        </View>
      )}
    </SafeAreaView>
  );
}
