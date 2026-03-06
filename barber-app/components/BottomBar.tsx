import {
  View,
  Pressable,
  StyleSheet,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useGlobalSearchParams, useRouter, usePathname, Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { useEffect, useRef } from 'react';
import { getUser } from '../app/store/userStore';

const GOLD = '#c59d5f';

type Tab = {
  icon: keyof typeof Ionicons.glyphMap;
  route: Href;
};

const tabs: Tab[] = [
  { icon: 'home-outline', route: '/' },
  { icon: 'calendar-outline', route: '/booking' },
  { icon: 'time-outline', route: '/history' },
  { icon: 'person-outline', route: '/profile' },
];

const protectedRoutes = new Set(['/booking', '/history']);

const isActiveRoute = (pathname: string, route: Href, activeTab?: string) => {
  const target = String(route);
  if (target === '/') return pathname === '/';

  if (target === '/booking') {
    if (pathname === '/booking') return true;
    if (pathname === '/client' || pathname === '/barber') return activeTab === 'booking';
  }

  if (target === '/history') {
    if (pathname === '/history') return true;
    if (pathname === '/client' || pathname === '/barber') return activeTab === 'history';
  }

  return pathname === target || pathname.startsWith(`${target}/`);
};

export default function BottomBar() {
  const router = useRouter();
  const pathname = usePathname();
  const globalParams = useGlobalSearchParams<{ activeTab?: string }>();
  const insets = useSafeAreaInsets();
  const currentUser = getUser();
  const activeTab = Array.isArray(globalParams.activeTab)
    ? globalParams.activeTab[0]
    : globalParams.activeTab;

  return (
    <View
      style={[
        styles.wrapper,
        {
          bottom: insets.bottom > 0 ? insets.bottom - 12 : 10,
        },
      ]}
    >
      <BlurView intensity={80} tint="dark" style={styles.container}>
        {tabs.map((tab, index) => {
          const isActive = isActiveRoute(pathname, tab.route, activeTab);

          return (
            <AnimatedTab
              key={index}
              icon={tab.icon}
              isActive={isActive}
              onPress={() => {
                if (isActive) return;

                const targetRoute = String(tab.route);
                if (protectedRoutes.has(targetRoute) && !currentUser) {
                  router.replace('/profile');
                  return;
                }

                router.replace(tab.route);
              }}
            />
          );
        })}
      </BlurView>
    </View>
  );
}

/* 🔥 TAB ANIMATA */
function AnimatedTab({
  icon,
  isActive,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  isActive: boolean;
  onPress: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isActive) {
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1.15,
          useNativeDriver: true,
        }),
        Animated.timing(glowOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.timing(glowOpacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isActive, glowOpacity, scale]);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.tab,
        pressed && { transform: [{ scale: 0.9 }] },
      ]}
    >
      <View style={styles.iconWrapper}>
        <Animated.View
          style={[
            styles.glow,
            { opacity: glowOpacity },
          ]}
        />

        <Animated.View style={{ transform: [{ scale }] }}>
          <Ionicons
            name={icon}
            size={22}
            color={isActive ? GOLD : '#777'}
          />
        </Animated.View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 20,
    right: 20,
    alignItems: 'center',
  },

  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    width: '100%',
    height: 65,
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',

    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 20,
  },

  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  glow: {
    position: 'absolute',
    bottom: -12,
    width: 30,
    height: 10,
    borderRadius: 20,
    backgroundColor: GOLD,

    shadowColor: GOLD,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.95,
    shadowRadius: 14,
    elevation: 12,
  },
});
