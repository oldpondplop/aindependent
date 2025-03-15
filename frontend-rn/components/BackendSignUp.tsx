import React from 'react';
import { View, Button, TextInput, StyleSheet, Text } from 'react-native';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import { useAuth } from '@/context/authProvider';
import { emailPattern, passwordRules, confirmPasswordRules } from '@/utils/utils';
import { UserRegister } from '@/src/client';
import { router } from 'expo-router';

interface UserRegisterForm extends UserRegister {
  confirm_password: string
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

  const onSubmit: SubmitHandler<UserRegisterForm> = (data) => {
    if (isSubmitting) return;
    signUpWithBackend(data);
  };

  return (
    <View style={styles.container}>
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
                style={[styles.input, errors.full_name && styles.errorInput]}
                placeholder="Full Name"
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
                style={[styles.input, errors.email && styles.errorInput]}
                placeholder="Email"
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
                style={[styles.input, errors.password && styles.errorInput]}
                placeholder="Password"
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
                ]}
                placeholder="Confirm Password"
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
        <Button
          title={isSubmitting ? 'Signing Up...' : 'Sign Up'}
          onPress={handleSubmit(onSubmit)}
          disabled={isSubmitting}
        />

        {/* Login Link */}
        <Text style={styles.linkText}>
          Already have an account?{' '}
          <Text style={styles.link} onPress={() => router.replace('/sign-in')}>
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
    height: 40,
    borderWidth: 1,
    marginBottom: 10,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  errorInput: {
    borderColor: 'red',
  },
  errorText: {
    color: 'red',
    fontSize: 12,
    marginBottom: 10,
  },
  linkText: {
    marginTop: 10,
    textAlign: 'center',
  },
  link: {
    color: 'blue',
    textDecorationLine: 'underline',
  },
});
