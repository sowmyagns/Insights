import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { login as loginApi, getApiErrorMessage } from "../../api/authApi";
import useAuth from "../../hooks/useAuth";
import AuthSlider from "../../components/auth/AuthSlider";
import PasswordInput from "../../components/auth/PasswordInput";
import BrandLogo from "../../components/common/BrandLogo";
import { ROLES } from "../../config/permissions";
import { getDashboardPathForRole } from "../../utils/roleRedirect";

const LOGIN_ROLES = ROLES.map((r) => r.name);

const EnvelopeIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const LockIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
);

const RoleIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const completeLogin = (data) => {
    login({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      user: data.user,
    });
    const resolvedRole = data.user?.role_name || data.user?.role || role;
    navigate(getDashboardPathForRole(resolvedRole), { replace: true });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password || !role) {
      setError("Company email, password, and role are required.");
      return;
    }
    setLoading(true);
    try {
      const data = await loginApi(email.trim(), password, role);
      completeLogin(data);
    } catch (err) {
      setError(getApiErrorMessage(err, "Login failed. Is the API running?"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <div className="w-full max-w-4xl">
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden relative" style={{ minHeight: "480px" }}>
          <div className="flex">
            <div className="w-1/2 flex flex-col justify-center items-center p-12 bg-white">
              <div className="text-center mb-8 w-full">
                <div className="mb-4 flex justify-center">
                  <BrandLogo size="xl" />
                </div>
                <h1 className="text-4xl font-bold text-gray-900 mb-2">Insights Iva</h1>
                <p className="text-gray-600 text-sm">Business Intelligence • Analytics • AI</p>
              </div>

              {error && (
                <div className="w-full mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="w-full space-y-4">
                <div className="relative">
                  <div className="absolute left-4 top-1/2 z-10 -translate-y-1/2 text-gray-400 pointer-events-none">
                    <RoleIcon />
                  </div>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    required
                    aria-label="Role"
                    className="box-border h-12 w-full min-w-0 rounded-lg border-none bg-gray-100 py-3 pl-12 pr-10 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500 appearance-none cursor-pointer"
                  >
                    <option value="" disabled>
                      Select Role *
                    </option>
                    {LOGIN_ROLES.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute left-4 top-1/2 z-10 -translate-y-1/2 text-gray-400 pointer-events-none">
                    <EnvelopeIcon />
                  </div>
                  <input
                    type="email"
                    placeholder="Company Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="username"
                    className="box-border h-12 w-full min-w-0 rounded-lg border-none bg-gray-100 py-3 pl-12 pr-4 text-sm text-gray-700 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    required
                  />
                </div>

                <PasswordInput
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  leftIcon={<LockIcon />}
                  autoComplete="current-password"
                  required
                />

                <div className="flex justify-between items-center text-xs">
                  <Link to="/forgot-password" className="text-gray-600 hover:text-teal-600">
                    Forgot Your Password?
                  </Link>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold uppercase tracking-wider rounded-lg transition disabled:opacity-50"
                >
                  {loading ? "Signing in..." : "SIGN IN"}
                </button>
              </form>

              <p className="mt-6 text-center text-xs text-gray-500">
                GNS Super Admin?{" "}
                <Link to="/gns-admin/login" className="font-medium text-teal-600 hover:underline">
                  Admin Portal
                </Link>
              </p>
            </div>

            <AuthSlider className="w-1/2">
              <h2 className="text-4xl font-bold mb-4">Welcome</h2>
              <p className="text-center text-sm mb-8 max-w-xs text-teal-50/90">
                Sign in with your company email, password, and role to open your dashboard.
              </p>
            </AuthSlider>
          </div>
        </div>
      </div>
    </div>
  );
}