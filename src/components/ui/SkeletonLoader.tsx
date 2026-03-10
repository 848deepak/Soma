import { useEffect, useRef } from "react";
import { Animated, Easing, View, useColorScheme } from "react-native";

function PulseBlock({
  style,
  duration = 1800,
}: {
  style: any;
  duration?: number;
}) {
  const opacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.35,
          duration,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [opacity, duration]);

  return <Animated.View style={[style, { opacity }]} />;
}

export function SkeletonLoader() {
  const isDark = useColorScheme() === "dark";

  const shell = isDark ? "rgba(255,255,255,0.12)" : "rgba(221,167,165,0.15)";
  const shellSoft = isDark ? "rgba(255,255,255,0.08)" : "rgba(221,167,165,0.1)";

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? "#0F1115" : "#FFFDFB" }}>
      <View
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: 384,
          height: 384,
          borderRadius: 192,
          backgroundColor: isDark
            ? "rgba(167,139,250,0.12)"
            : "rgba(255,218,185,0.2)",
        }}
      />
      <View
        style={{
          position: "absolute",
          bottom: "30%",
          left: 0,
          width: 320,
          height: 320,
          borderRadius: 160,
          backgroundColor: isDark
            ? "rgba(129,140,248,0.1)"
            : "rgba(221,167,165,0.15)",
        }}
      />

      <View
        style={{ paddingHorizontal: 28, paddingTop: 56, paddingBottom: 24 }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <View style={{ gap: 10 }}>
            <PulseBlock
              style={{
                height: 30,
                width: 190,
                borderRadius: 999,
                backgroundColor: shell,
              }}
            />
            <PulseBlock
              style={{
                height: 30,
                width: 130,
                borderRadius: 999,
                backgroundColor: shell,
              }}
              duration={2000}
            />
          </View>
          <PulseBlock
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: shellSoft,
            }}
          />
        </View>
      </View>

      <View style={{ alignItems: "center", marginTop: 24, marginBottom: 20 }}>
        <PulseBlock
          style={{
            width: 280,
            height: 280,
            borderRadius: 140,
            backgroundColor: shellSoft,
          }}
        />
        <View style={{ position: "absolute", top: 56 }}>
          <PulseBlock
            style={{
              width: 168,
              height: 168,
              borderRadius: 84,
              backgroundColor: shell,
            }}
          />
        </View>
      </View>

      <View style={{ paddingHorizontal: 28, gap: 18 }}>
        <PulseBlock
          style={{ height: 122, borderRadius: 28, backgroundColor: shellSoft }}
        />

        <View
          style={{ flexDirection: "row", justifyContent: "center", gap: 8 }}
        >
          <PulseBlock
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: shell,
            }}
          />
          <PulseBlock
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: shell,
            }}
            duration={1900}
          />
          <PulseBlock
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: shell,
            }}
            duration={2100}
          />
        </View>

        <PulseBlock
          style={{ height: 96, borderRadius: 24, backgroundColor: shellSoft }}
        />

        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            justifyContent: "space-between",
            rowGap: 12,
          }}
        >
          {[0, 1, 2, 3].map((item) => (
            <PulseBlock
              key={item}
              style={{
                width: "48.3%",
                aspectRatio: 1,
                borderRadius: 24,
                backgroundColor: shellSoft,
              }}
              duration={1700 + item * 120}
            />
          ))}
        </View>

        <PulseBlock
          style={{ height: 60, borderRadius: 999, backgroundColor: shell }}
        />
      </View>
    </View>
  );
}
