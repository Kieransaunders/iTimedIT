import Toast from "react-native-toast-message";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastOptions {
  title?: string;
  message: string;
  duration?: number;
  position?: "top" | "bottom";
}

export class ToastManager {
  /**
   * Show a success toast
   */
  static success(options: ToastOptions) {
    Toast.show({
      type: "success",
      text1: options.title || "Success",
      text2: options.message,
      position: options.position || "top",
      visibilityTime: options.duration || 3000,
    });
  }

  /**
   * Show an error toast
   */
  static error(options: ToastOptions) {
    Toast.show({
      type: "error",
      text1: options.title || "Error",
      text2: options.message,
      position: options.position || "top",
      visibilityTime: options.duration || 4000,
    });
  }

  /**
   * Show an info toast
   */
  static info(options: ToastOptions) {
    Toast.show({
      type: "info",
      text1: options.title || "Info",
      text2: options.message,
      position: options.position || "top",
      visibilityTime: options.duration || 3000,
    });
  }

  /**
   * Show a warning toast
   */
  static warning(options: ToastOptions) {
    Toast.show({
      type: "error", // Use error type for warnings since react-native-toast-message doesn't have warning
      text1: options.title || "Warning",
      text2: options.message,
      position: options.position || "top",
      visibilityTime: options.duration || 4000,
    });
  }

  /**
   * Hide all toasts
   */
  static hide() {
    Toast.hide();
  }

  /**
   * Show workspace-specific success message
   */
  static workspaceSuccess(workspace: "personal" | "team", action: string) {
    this.success({
      title: "Workspace Updated",
      message: `Switched to ${workspace} workspace. ${action}`,
    });
  }

  /**
   * Show workspace-specific error message
   */
  static workspaceError(workspace: "personal" | "team", error: string) {
    this.error({
      title: "Workspace Error",
      message: `Failed to switch to ${workspace} workspace: ${error}`,
    });
  }

  /**
   * Show organization switch success message
   */
  static organizationSuccess(organizationName: string) {
    this.success({
      title: "Organization Changed",
      message: `Switched to ${organizationName}`,
    });
  }

  /**
   * Show organization switch error message
   */
  static organizationError(organizationName: string, error: string) {
    this.error({
      title: "Organization Error",
      message: `Failed to switch to ${organizationName}: ${error}`,
    });
  }

  /**
   * Show network error message
   */
  static networkError(message?: string) {
    this.error({
      title: "Network Error",
      message: message || "Please check your internet connection and try again.",
      duration: 5000,
    });
  }

  /**
   * Show offline message
   */
  static offline() {
    this.warning({
      title: "Offline",
      message: "You're currently offline. Some features may not work.",
      duration: 5000,
    });
  }
}