type AuthErrorHandler = () => void;

let handler: AuthErrorHandler | null = null;

export function registerAuthErrorHandler(fn: AuthErrorHandler) {
  handler = fn;
  return () => {
    if (handler === fn) handler = null;
  };
}

export function notifyAuthError() {
  if (handler) {
    handler();
  }
}
