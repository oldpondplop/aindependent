import React from 'react';
import { View, TextInput, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import { useAuth } from '@/context/authProvider';
import { emailPattern, passwordRules, confirmPasswordRules } from '@/utils/utils';
import { UserRegister } from '@/src/client';
import { router } from 'expo-router';
import { useThemeColor } from '@/hooks/useThemeColor';

interface UserRegisterForm extends UserRegister {
  confirm_password: string;
}

export default function SignUpForm() {
  const { signUpWithBackend } = useAuth();
  const {
    control,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<UserRegisterForm>({
    mode: 'onBlur',
    criteriaMode: 'all',
    defaultValues: {
      email: '',
      full_name: '',
      password: '',
      confirm_password: '',
    },
  });

  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');
  const inputBackground = useThemeColor({}, 'inputBackground');
  const inputBorder = useThemeColor({}, 'inputBorder');
  const inputTextColor = useThemeColor({}, 'inputText');
  const buttonBackground = useThemeColor({}, 'buttonBackground');
  const buttonTextColor = useThemeColor({}, 'buttonText');

  const onSubmit: SubmitHandler<UserRegisterForm> = (data) => {
    if (isSubmitting) return;
    signUpWithBackend(data);
  };

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <View style={styles.form}>
        {/* Full Name Field */}
        <Controller
          control={control}
          name="full_name"
          rules={{
            required: 'Full Name is required',
            minLength: {
              value: 3,
              message: 'Full Name must be at least 3 characters',
            },
          }}
          render={({ field: { onChange, onBlur, value } }) => (
            <View>
              <TextInput
                style={[
                  styles.input,
                  errors.full_name && styles.errorInput,
                  { borderColor: inputBorder, backgroundColor: inputBackground, color: inputTextColor },
                ]}
                placeholder="Full Name"
                placeholderTextColor={inputBorder}
                autoCapitalize="words"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value || ''}
              />
              {errors.full_name && (
                <Text style={styles.errorText}>{errors.full_name.message}</Text>
              )}
            </View>
          )}
        />

        {/* Email Field */}
        <Controller
          control={control}
          name="email"
          rules={{
            required: 'Email is required',
            pattern: emailPattern,
          }}
          render={({ field: { onChange, onBlur, value } }) => (
            <View>
              <TextInput
                style={[
                  styles.input,
                  errors.email && styles.errorInput,
                  { borderColor: inputBorder, backgroundColor: inputBackground, color: inputTextColor },
                ]}
                placeholder="Email"
                placeholderTextColor={inputBorder}
                autoCapitalize="none"
                keyboardType="email-address"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
              />
              {errors.email && (
                <Text style={styles.errorText}>{errors.email.message}</Text>
              )}
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
                  { borderColor: inputBorder, backgroundColor: inputBackground, color: inputTextColor },
                ]}
                placeholder="Password"
                placeholderTextColor={inputBorder}
                autoCapitalize="none"
                secureTextEntry
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
              />
              {errors.password && (
                <Text style={styles.errorText}>{errors.password.message}</Text>
              )}
            </View>
          )}
        />

        {/* Confirm Password Field */}
        <Controller
          control={control}
          name="confirm_password"
          rules={confirmPasswordRules(getValues)}
          render={({ field: { onChange, onBlur, value } }) => (
            <View>
              <TextInput
                style={[
                  styles.input,
                  errors.confirm_password && styles.errorInput,
                  { borderColor: inputBorder, backgroundColor: inputBackground, color: inputTextColor },
                ]}
                placeholder="Confirm Password"
                placeholderTextColor={inputBorder}
                autoCapitalize="none"
                secureTextEntry
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
              />
              {errors.confirm_password && (
                <Text style={styles.errorText}>
                  {errors.confirm_password.message}
                </Text>
              )}
            </View>
          )}
        />

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.button, { backgroundColor: buttonBackground }]}
          onPress={handleSubmit(onSubmit)}
          disabled={isSubmitting}
        >
          <Text style={[styles.buttonText, { color: buttonTextColor }]}>
            {isSubmitting ? 'Signing Up...' : 'Sign Up'}
          </Text>
        </TouchableOpacity>

        {/* Login Link */}
        <Text style={[styles.linkText, { color: textColor }]}>
          Already have an account?{' '}
          <Text style={[styles.link, { color: tintColor }]} onPress={() => router.replace('/sign-in')}>
            Log In
          </Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  form: {
    width: '80%',
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
  linkText: {
    marginTop: 20,
    textAlign: 'center',
  },
  link: {
    fontWeight: 'bold',
  },
});
