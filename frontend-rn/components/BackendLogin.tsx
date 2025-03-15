import React from 'react';
import { View, TextInput, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import { useAuth } from '@/context/authProvider';
import { BodyLoginLoginForAccessToken as AccessToken } from '@/src/client';
import { emailPattern, passwordRules } from '@/utils/utils';
import { useThemeColor } from '@/hooks/useThemeColor';

export default function LoginForm() {
  const { signInWithBackend } = useAuth();
  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<AccessToken>({
    defaultValues: {
      username: 'a@b.cc',
      password: 'password',
    },
    mode: 'onBlur',
    criteriaMode: 'all',
  });

  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');
  const borderColor = useThemeColor({}, 'inputBorder');
  const inputBackground = useThemeColor({}, 'inputBackground');
  const inputTextColor = useThemeColor({}, 'inputText');
  const buttonBackground = useThemeColor({}, 'buttonBackground');
  const buttonTextColor = useThemeColor({}, 'buttonText');

  const onSubmit: SubmitHandler<AccessToken> = (data) => {
    if (isSubmitting) return;
    signInWithBackend(data);
  };

  return (
    <View style={styles.form}>
      {/* Email Field */}
      <Controller
        control={control}
        name="username"
        rules={{
          required: 'Email is required',
          pattern: emailPattern,
        }}
        render={({ field: { onChange, onBlur, value } }) => (
          <View>
            <TextInput
              style={[
                styles.input,
                errors.username && styles.errorInput,
                { borderColor, backgroundColor: inputBackground, color: inputTextColor },
              ]}
              placeholder="Email"
              placeholderTextColor={borderColor}
              autoCapitalize="none"
              keyboardType="email-address"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
            />
            {errors.username && <Text style={styles.errorText}>{errors.username.message}</Text>}
          </View>
        )}
      />

      {/* Password Field */}
      <Controller
        control={control}
        name="password"
        rules={passwordRules()}
        render={({ field: { onChange, onBlur, value } }) => (
          <View>
            <TextInput
              style={[
                styles.input,
                errors.password && styles.errorInput,
                { borderColor, backgroundColor: inputBackground, color: inputTextColor },
              ]}
              placeholder="Password"
              placeholderTextColor={borderColor}
              autoCapitalize="none"
              secureTextEntry
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
            />
            {errors.password && <Text style={styles.errorText}>{errors.password.message}</Text>}
          </View>
        )}
      />

      {/* Sign In Button */}
      <TouchableOpacity
        style={[styles.button, { backgroundColor: buttonBackground }]}
        onPress={handleSubmit(onSubmit)}
        disabled={isSubmitting}
      >
        <Text style={[styles.buttonText, { color: buttonTextColor }]}>
          {isSubmitting ? 'Signing In...' : 'Sign In'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    width: '100%',
    maxWidth: 400,
  },
  input: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 15,
    paddingHorizontal: 15,
    fontSize: 16,
  },
  errorInput: {
    borderColor: 'red',
  },
  errorText: {
    color: 'red',
    fontSize: 12,
    marginBottom: 10,
  },
  button: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});
