/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

const tintColorLight = '#007BFF'; // A vibrant blue for light mode
const tintColorDark = '#BB86FC'; // A soft purple for dark mode

export const Colors = {
  light: {
    text: '#11181C', // Dark gray for text
    background: '#FFFFFF', // White background
    tint: tintColorLight, // Primary color for light mode
    icon: '#687076', // Gray for icons
    tabIconDefault: '#687076', // Gray for inactive tab icons
    tabIconSelected: tintColorLight, // Blue for active tab icons
    buttonBackground: tintColorLight, // Blue for buttons
    buttonText: '#FFFFFF', // White text for buttons
    inputBackground: '#fff', // Light gray for input backgrounds
    inputBorder: '#CCCCCC', // Light gray for input borders
    inputText: '#11181C', // Dark gray for input text
  },
  dark: {
    text: '#ECEDEE', // Light gray for text
    background: '#121212', // Dark background
    tint: tintColorDark, // Primary color for dark mode
    icon: '#9BA1A6', // Light gray for icons
    tabIconDefault: '#9BA1A6', // Light gray for inactive tab icons
    tabIconSelected: tintColorDark, // Purple for active tab icons
    buttonBackground: tintColorDark, // Purple for buttons
    buttonText: '#121212', // Dark text for buttons
    inputBackground: '#1E1E1E', // Dark gray for input backgrounds
    inputBorder: '#333333', // Dark gray for input borders
    inputText: '#ECEDEE', // Light gray for input text
  },
};
