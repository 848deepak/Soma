/**
 * src/components/ui/BrandOrb.tsx
 *
 * Reusable brand orb used on Login and Signup screens.
 * Three-layer ambient glow orb matching the Figma design mark.
 */
import { View } from 'react-native';

type BrandOrbProps = {
  isDark: boolean;
  /** Diameter of the inner solid orb. Default: 72 */
  size?: number;
};

export function BrandOrb({ isDark, size = 72 }: BrandOrbProps) {
  const outerSize = Math.round(size * 1.67);
  const midSize = Math.round(size * 1.33);
  const halfOuter = Math.round(outerSize / 2);
  const halfMid = Math.round(midSize / 2);
  const halfInner = Math.round(size / 2);

  return (
    <View
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        height: outerSize,
        marginBottom: 32,
      }}
    >
      {/* Outer ambient glow */}
      <View
        style={{
          position: 'absolute',
          width: outerSize,
          height: outerSize,
          borderRadius: halfOuter,
          backgroundColor: isDark
            ? 'rgba(79,70,229,0.15)'
            : 'rgba(255,218,185,0.5)',
          opacity: 0.7,
        }}
      />
      {/* Mid glow layer */}
      <View
        style={{
          position: 'absolute',
          width: midSize,
          height: midSize,
          borderRadius: halfMid,
          backgroundColor: isDark
            ? 'rgba(167,139,250,0.25)'
            : 'rgba(221,167,165,0.55)',
          opacity: 0.8,
        }}
      />
      {/* Inner solid orb */}
      <View
        style={{
          width: size,
          height: size,
          borderRadius: halfInner,
          backgroundColor: isDark ? '#A78BFA' : '#DDA7A5',
          shadowColor: isDark ? '#7C6BE8' : '#DDA7A5',
          shadowOffset: { width: 0, height: 12 },
          shadowOpacity: 0.45,
          shadowRadius: 20,
          elevation: 10,
        }}
      />
    </View>
  );
}
