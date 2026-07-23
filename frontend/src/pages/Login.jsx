import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  Wallet,
  Wrench,
  BarChart3,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getDashboardPath } from '../utils/authRoutes';
import BrandLogo from '../components/BrandLogo';
import { PLATFORM_NAME } from '../constants/brand';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    remember: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(formData.email, formData.password);
    
    if (result.success) {
      navigate(getDashboardPath(result.user?.role), { replace: true });
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  };

  return (
    <div className="auth-shell relative min-h-screen overflow-hidden bg-slate-50">
      <div className="auth-bg-shape auth-bg-shape-1" aria-hidden="true" />
      <div className="auth-bg-shape auth-bg-shape-2" aria-hidden="true" />

      <div className="auth-fade-in mx-auto grid min-h-screen w-full max-w-7xl grid-cols-1 gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:grid-cols-2 lg:gap-8 lg:px-8 lg:py-10">
        {/* Left Side - Marketing */}
        <aside className="relative hidden overflow-hidden rounded-2xl bg-blue-700 p-8 text-white shadow-xl shadow-blue-900/10 lg:flex lg:flex-col lg:justify-between">

          <div className="relative z-10">
            <div className="mb-6 flex items-center gap-3">
              <BrandLogo size="lg" tone="onDark" />
              <div>
                <h1 className="text-2xl font-semibold leading-tight">{PLATFORM_NAME}</h1>
                <p className="mt-1 text-sm font-semibold text-blue-100">Professional rental management</p>
              </div>
            </div>

            <h2 className="max-w-md text-3xl font-semibold leading-tight text-white">
              Run your properties with confidence and clarity.
            </h2>
            <p className="mt-4 max-w-md text-base text-blue-50/90">
              Built for super admins, self owners, and tenants to collaborate from one rental platform.
            </p>
          </div>

          <div className="relative z-10 grid gap-3 sm:grid-cols-2">
            <div className="auth-feature-card rounded-xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
              <ShieldCheck className="mb-2 h-5 w-5 text-blue-100" />
              <p className="text-sm font-semibold">Secure Access</p>
              <p className="mt-1 text-xs text-blue-50/90">Purpose-built access for super admin, self owner, and tenant users.</p>
            </div>
            <div className="auth-feature-card rounded-xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
              <Wallet className="mb-2 h-5 w-5 text-blue-100" />
              <p className="text-sm font-semibold">Rent Tracking</p>
              <p className="mt-1 text-xs text-blue-50/90">Monitor payments, balances, and history at a glance.</p>
            </div>
            <div className="auth-feature-card rounded-xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
              <Wrench className="mb-2 h-5 w-5 text-blue-100" />
              <p className="text-sm font-semibold">Maintenance</p>
              <p className="mt-1 text-xs text-blue-50/90">Track requests and keep properties in top condition.</p>
            </div>
            <div className="auth-feature-card rounded-xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
              <BarChart3 className="mb-2 h-5 w-5 text-blue-100" />
              <p className="text-sm font-semibold">Insights</p>
              <p className="mt-1 text-xs text-blue-50/90">Use live analytics to make smarter rental decisions.</p>
            </div>
          </div>
        </aside>

        {/* Right Side - Login Form */}
        <div className="flex items-center justify-center">
          <div className="auth-card-slide w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/5 sm:p-8">
            <div className="mb-6 lg:hidden">
              <div className="mb-4 flex items-center gap-3">
                <BrandLogo />
                <p className="text-base font-semibold text-slate-900">{PLATFORM_NAME}</p>
              </div>
            </div>

            <h2 className="text-2xl font-semibold text-slate-900 sm:text-3xl">Welcome back</h2>
            <p className="mt-2 text-sm text-slate-600">Sign in to continue managing your rental operations.</p>

            {error && (
              <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Email
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-slate-900 shadow-sm transition-all duration-200 placeholder:text-slate-400 focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-100"
                    placeholder="you@example.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Password
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-12 text-slate-900 shadow-sm transition-all duration-200 placeholder:text-slate-400 focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-100"
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition-colors hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4">
                <label className="flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={formData.remember}
                    onChange={(e) => setFormData({ ...formData, remember: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm text-slate-600">Remember me</span>
                </label>
                <Link to="/forgot-password" className="text-sm font-medium text-primary-600 transition-colors hover:text-primary-700">
                  Forgot password?
                </Link>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-primary-600 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-primary-600/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary-700 hover:shadow-lg hover:shadow-primary-700/20 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-600">
              Don't have an account?{' '}
              <Link to="/register" className="font-semibold text-primary-600 transition-colors hover:text-primary-700">
                Create account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
