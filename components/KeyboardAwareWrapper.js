import { KeyboardAvoidingView, ScrollView, Platform } from 'react-native';

/**
 * Wraps form screens so inputs are never hidden by the keyboard.
 * On iOS: KeyboardAvoidingView with "padding" behavior pushes content up.
 * On Android: relies on adjustResize (set via softwareKeyboardLayoutMode in app.json).
 * ScrollView auto-scrolls to the focused TextInput on both platforms.
 */
export default function KeyboardAwareWrapper({
  children,
  style,
  contentStyle,
  scrollEnabled = true,
  scrollRef,
  ...scrollProps
}) {
  const content = scrollEnabled ? (
    <ScrollView
      ref={scrollRef}
      contentContainerStyle={[{ flexGrow: 1 }, contentStyle]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      bounces={false}
      {...scrollProps}
    >
      {children}
    </ScrollView>
  ) : children;

  return (
    <KeyboardAvoidingView
      style={[{ flex: 1 }, style]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {content}
    </KeyboardAvoidingView>
  );
}
