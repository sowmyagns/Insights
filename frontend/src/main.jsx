import React, { Suspense } from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import "./i18n";
import { BrowserRouter, useLocation } from "react-router-dom";

import App from "./App.jsx";
import BrandLogo from "./components/common/BrandLogo";
import ErrorBoundary from "./components/common/ErrorBoundary";
import SessionExpiredModal from "./components/common/states/SessionExpiredModal";
import { AuthProvider } from "./context/AuthContext.jsx";
import { NetworkStatusProvider } from "./context/NetworkStatusContext.jsx";
import { SettingsProvider } from "./context/SettingsContext.jsx";
import { ToastProvider } from "./context/ToastContext.jsx";
import useAuth from "./hooks/useAuth";

const LoadingFallback = () => (
  <div
    className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 dark:bg-slate-900"
    role="status"
    aria-live="polite"
    aria-label="Loading application"
  >
    <div className="mb-6 rounded-2xl bg-white p-2 shadow-sm dark:bg-slate-800">
      <BrandLogo size="lg" />
    </div>
    <div className="mb-4 flex h-10 w-10 items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-600 border-t-transparent dark:border-teal-400" />
    </div>
    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Loading Insights Iva…</p>
    <p className="ui-hint mt-1 text-center">Preparing your workspace</p>
  </div>
);

function SessionGate({ children }) {
  const { sessionExpired, clearSessionExpired } = useAuth();
  const location = useLocation();

  React.useEffect(() => {
    if (
      sessionExpired &&
      (location.pathname === "/login" ||
        location.pathname.startsWith("/gns-admin") ||
        location.pathname.startsWith("/register") ||
        location.pathname === "/landing")
    ) {
      clearSessionExpired();
    }
  }, [location.pathname, sessionExpired, clearSessionExpired]);

  const showModal =
    Boolean(sessionExpired) &&
    location.pathname !== "/login" &&
    !location.pathname.startsWith("/gns-admin") &&
    !location.pathname.startsWith("/register") &&
    location.pathname !== "/landing";

  return (
    <>
      {children}
      <SessionExpiredModal open={showModal} onLogin={clearSessionExpired} />
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <SettingsProvider>
      <AuthProvider>
        <ToastProvider>
          <NetworkStatusProvider>
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <ErrorBoundary>
                <Suspense fallback={<LoadingFallback />}>
                  <SessionGate>
                    <App />
                  </SessionGate>
                </Suspense>
              </ErrorBoundary>
            </BrowserRouter>
          </NetworkStatusProvider>
        </ToastProvider>
      </AuthProvider>
    </SettingsProvider>
  </React.StrictMode>
);
