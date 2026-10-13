export type GtagEvent = {
  action: string;
  category?: string;
  label?: string;
  value?: number | string;
  [key: string]: unknown;
};

declare global {
  interface Window {
    gtag: (command: "event", action: string, params?: Record<string, unknown>) => void;
  }
}

export const gtagEvent = (action: string, params?: Record<string, unknown>): void => {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", action, params);
  }
};
