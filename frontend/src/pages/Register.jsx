import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Mail,
  Lock,
  User,
  Phone,
  Building,
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

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    company: '',
    role: 'self_owner',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [registrationStatus, setRegistrationStatus] = useState(null);
  
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setRegistrationStatus(null);

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    const result = await register({
      name: formData.name,
      email: formData.email,
      password: formData.password,
      phone: formData.phone,
      companyName: formData.company,
      role: formData.role,
    });
    
    if (result.success) {
      if (result.token) {
        // User approved, redirect to role dashboard
        navigate(getDashboardPath(result.user?.role), { replace: true });
      } else {
        // User pending approval
        setRegistrationStatus({
          pending: true,
          message: 'Registration successful! Your account is pending approval from the admin. You will receive an email once your account is approved.'
        });
        // Reset form
        setFormData({
          name: '',
          email: '',
          password: '',
          confirmPassword: '',
          phone: '',
          company: '',
          role: 'self_owner',
        });
      }
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
        <aside className="relative hidden overflow-hidden rounded-2xl bg-blue-700 p-8 text-white shadow-xl shadow-blue-900/10 lg:flex lg:flex-col lg:justify-start lg:gap-8">

          <div className="relative z-10">
            <div className="mb-6 flex items-center gap-3">
              <BrandLogo size="lg" tone="onDark" />
              <div>
                <h1 className="text-2xl font-semibold leading-tight">{PLATFORM_NAME}</h1>
                <p className="mt-1 text-sm font-semibold text-blue-100">Professional rental management</p>
              </div>
            </div>

            <h2 className="max-w-md text-3xl font-semibold leading-tight text-white">
              Build a modern rental operation from day one.
            </h2>
            <p className="mt-4 max-w-md text-base text-blue-50/90">
              Create your account to manage tenants, properties, invoices, and maintenance in one place.
            </p>
          </div>

          <div className="relative z-10 grid gap-3 sm:grid-cols-2">
            <div className="auth-feature-card rounded-xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
              <ShieldCheck className="mb-2 h-5 w-5 text-blue-100" />
              <p className="text-sm font-semibold">Secure Platform</p>
              <p className="mt-1 text-xs text-blue-50/90">Trusted, role-aware access for teams and tenants.</p>
            </div>
            <div className="auth-feature-card rounded-xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
              <Wallet className="mb-2 h-5 w-5 text-blue-100" />
              <p className="text-sm font-semibold">Payment Visibility</p>
              <p className="mt-1 text-xs text-blue-50/90">Track rent activity with clear payment records.</p>
            </div>
            <div className="auth-feature-card rounded-xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
              <Wrench className="mb-2 h-5 w-5 text-blue-100" />
              <p className="text-sm font-semibold">Maintenance Flow</p>
              <p className="mt-1 text-xs text-blue-50/90">Handle maintenance tickets with less admin work.</p>
            </div>
            <div className="auth-feature-card rounded-xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
              <BarChart3 className="mb-2 h-5 w-5 text-blue-100" />
              <p className="text-sm font-semibold">Growth Insights</p>
              <p className="mt-1 text-xs text-blue-50/90">Monitor occupancy and performance trends easily.</p>
            </div>
          </div>
        </aside>

        {/* Right Side - Register Form */}
        <div className="flex items-center justify-center">
          <div className="auth-card-slide w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/5 sm:p-8">
            <div className="mb-6 lg:hidden">
              <div className="mb-4 flex items-center gap-3">
                <BrandLogo />
                <p className="text-base font-semibold text-slate-900">{PLATFORM_NAME}</p>
              </div>
            </div>

            <h2 className="text-2xl font-semibold text-slate-900 sm:text-3xl">Create your account</h2>
            <p className="mt-1 text-sm text-slate-600">Set up your profile and start managing rentals professionally.</p>

            {error && (
              <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {registrationStatus && registrationStatus.pending && (
              <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-blue-700">
                <p className="mb-1 text-sm font-semibold">Registration successful</p>
                <p className="text-sm">{registrationStatus.message}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Full Name
                </label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-slate-900 shadow-sm transition-all duration-200 placeholder:text-slate-400 focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-100"
                    placeholder="Enter Full Name"
                    required
                  />
                </div>
              </div>

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
                  Phone
                </label>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-slate-900 shadow-sm transition-all duration-200 placeholder:text-slate-400 focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-100"
                    placeholder="+256 700 000 000"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  User Role
                </label>
                <div className="rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
                  Property manager / Landlord
                </div>
                <input
                  type="hidden"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Company Name
                </label>
                <div className="relative">
                  <Building className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-slate-900 shadow-sm transition-all duration-200 placeholder:text-slate-400 focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-100"
                    placeholder="Your Company Ltd"
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
                    placeholder="Create a password"
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

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-slate-900 shadow-sm transition-all duration-200 placeholder:text-slate-400 focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-100"
                    placeholder="Confirm your password"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-primary-600 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-primary-600/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary-700 hover:shadow-lg hover:shadow-primary-700/20 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Creating account...' : 'Create Account'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-600">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-primary-600 transition-colors hover:text-primary-700">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
