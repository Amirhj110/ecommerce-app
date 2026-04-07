import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export function AuthPage() {
  const navigate = useNavigate();
  const { login, register, isAuthenticated, isLoading } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [showPassword, setShowPassword] = useState(false);

  // Login form
  const [loginData, setLoginData] = useState({
    username: '',
    password: '',
  });

  // Register form
  const [registerData, setRegisterData] = useState({
    username: '',
    email: '',
    password: '',
    first_name: '',
    last_name: '',
  });

  if (isAuthenticated) {
    navigate('/');
    return null;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await login(loginData.username, loginData.password);
    if (success) {
      navigate('/');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await register(registerData);
    if (success) {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen pt-20 pb-16 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/" className="font-serif text-2xl text-luxury-charcoal">
            LUXE
          </Link>
          <h1 className="font-serif text-3xl text-luxury-charcoal mt-4">
            {activeTab === 'login' ? 'Welcome Back' : 'Create Account'}
          </h1>
          <p className="text-luxury-gray mt-2">
            {activeTab === 'login'
              ? 'Sign in to access your account and orders'
              : 'Join us for exclusive access to luxury items'}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex mb-6 border-b border-luxury-charcoal/10">
          <button
            onClick={() => setActiveTab('login')}
            className={`flex-1 pb-3 text-sm font-medium uppercase tracking-wider transition-colors ${
              activeTab === 'login'
                ? 'text-luxury-charcoal border-b-2 border-luxury-gold'
                : 'text-luxury-gray hover:text-luxury-charcoal'
            }`}
          >
            Login
          </button>
          <button
            onClick={() => setActiveTab('register')}
            className={`flex-1 pb-3 text-sm font-medium uppercase tracking-wider transition-colors ${
              activeTab === 'register'
                ? 'text-luxury-charcoal border-b-2 border-luxury-gold'
                : 'text-luxury-gray hover:text-luxury-charcoal'
            }`}
          >
            Register
          </button>
        </div>

        {/* Forms */}
        <div className="bg-white border border-luxury-charcoal/10 p-6 md:p-8">
          {activeTab === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-luxury-charcoal mb-1">
                  Username
                </label>
                <input
                  type="text"
                  required
                  value={loginData.username}
                  onChange={(e) => setLoginData({ ...loginData, username: e.target.value })}
                  className="w-full border border-luxury-charcoal/20 px-4 py-3 focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold outline-none transition-colors"
                  placeholder="Enter your username"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-luxury-charcoal mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={loginData.password}
                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                    className="w-full border border-luxury-charcoal/20 px-4 py-3 focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold outline-none transition-colors pr-12"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-luxury-gray hover:text-luxury-charcoal"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-luxury-charcoal text-luxury-cream py-3 font-semibold uppercase tracking-wider text-sm hover:bg-luxury-gold hover:text-luxury-charcoal transition-colors disabled:opacity-50 flex items-center justify-center"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-luxury-charcoal mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={registerData.first_name}
                    onChange={(e) => setRegisterData({ ...registerData, first_name: e.target.value })}
                    className="w-full border border-luxury-charcoal/20 px-4 py-3 focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold outline-none transition-colors"
                    placeholder="John"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-luxury-charcoal mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={registerData.last_name}
                    onChange={(e) => setRegisterData({ ...registerData, last_name: e.target.value })}
                    className="w-full border border-luxury-charcoal/20 px-4 py-3 focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold outline-none transition-colors"
                    placeholder="Doe"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-luxury-charcoal mb-1">
                  Username *
                </label>
                <input
                  type="text"
                  required
                  value={registerData.username}
                  onChange={(e) => setRegisterData({ ...registerData, username: e.target.value })}
                  className="w-full border border-luxury-charcoal/20 px-4 py-3 focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold outline-none transition-colors"
                  placeholder="johndoe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-luxury-charcoal mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  required
                  value={registerData.email}
                  onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                  className="w-full border border-luxury-charcoal/20 px-4 py-3 focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold outline-none transition-colors"
                  placeholder="john@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-luxury-charcoal mb-1">
                  Password *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={registerData.password}
                    onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                    className="w-full border border-luxury-charcoal/20 px-4 py-3 focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold outline-none transition-colors pr-12"
                    placeholder="Min 6 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-luxury-gray hover:text-luxury-charcoal"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-luxury-charcoal text-luxury-cream py-3 font-semibold uppercase tracking-wider text-sm hover:bg-luxury-gold hover:text-luxury-charcoal transition-colors disabled:opacity-50 flex items-center justify-center"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  'Create Account'
                )}
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <p className="text-center mt-6 text-sm text-luxury-gray">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}
