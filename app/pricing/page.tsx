'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Check, 
  X, 
  Zap, 
  TrendingUp,
  Shield,
  Clock,
  Bot,
  AlertCircle,
  ArrowLeft
} from 'lucide-react';

interface Plan {
  id: 'basic' | 'growth' | 'pro';
  name: string;
  price: number;
  credits: number;
  features: string[];
  limitations: string[];
  popular?: boolean;
  icon: React.ReactNode;
  color: string;
}

export default function PricingPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  const plans: Plan[] = [
    {
      id: 'basic',
      name: 'Basic',
      price: 499,
      credits: 70,
      icon: <Zap className="h-6 w-6" />,
      color: 'from-gray-600 to-gray-700',
      features: [
        '70 AI credits per month',
        'Google Business Profile connect',
        'Manual refresh only',
        'English only',
        '1 free regenerate',
        'Short reply only',
        'Basic risk indicator',
        '1 profile only',
      ],
      limitations: [
        'No auto fetch',
        'No email alerts',
        'No Hindi support',
        'No competitor tracking',
        'No export reports',
      ],
    },
    {
      id: 'growth',
      name: 'Growth',
      price: 799,
      credits: 160,
      popular: true,
      icon: <TrendingUp className="h-6 w-6" />,
      color: 'from-indigo-600 to-purple-600',
      features: [
        '160 AI credits per month',
        'Auto fetch every few hours',
        'Email alerts for new reviews',
        'English + Hindi support',
        '3 free regenerates',
        'Short + Medium replies',
        'Brand memory',
        'SEO keywords included',
        'Export reports (CSV/PDF)',
        'Import reviews (CSV/PDF)',
        '3 profiles',
        'Competitor tracking (1 competitor)',
      ],
      limitations: [
        'No WhatsApp alerts',
        'No priority support',
      ],
    },
    {
      id: 'pro',
      name: 'Pro',
      price: 1099,
      credits: 250,
      icon: <Shield className="h-6 w-6" />,
      color: 'from-purple-600 to-pink-600',
      features: [
        '250 AI credits per month',
        'Instant auto fetch (30 min)',
        'Email + WhatsApp alerts',
        'English + Hindi + Custom tone',
        '5 free regenerates',
        'Short + Medium + Detailed replies',
        'Advanced tone presets',
        'Keyword-enhanced replies',
        'FAQ generator',
        'Advanced competitor tracking',
        '5 profiles',
        'Priority support',
      ],
      limitations: [],
    },
  ];

  const handleSelectPlan = (planId: string) => {
    if (!user) {
      router.push(`/auth-login?returnTo=/pricing&plan=${planId}`);
      return;
    }

    // Payment integration will come in Phase 11
    alert(`Payment integration coming soon! You selected ${planId} plan.`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center">
            <Link href="/reputation" className="mr-4 text-gray-500 hover:text-gray-700">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">
              Pricing Plans
            </h1>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Choose the plan that fits your business. All plans include AI-powered replies and Google Q&A management.
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="flex justify-center mb-12">
          <div className="bg-gray-100 p-1 rounded-xl inline-flex">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
                billingCycle === 'monthly'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
                billingCycle === 'yearly'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Yearly <span className="text-green-600 text-xs ml-1">Save 20%</span>
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="max-w-md mx-auto mb-8 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
            <AlertCircle className="h-5 w-5 text-red-600 mr-3 shrink-0 mt-0.5" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan) => {
            const yearlyPrice = Math.round(plan.price * 12 * 0.8); // 20% off
            const displayPrice = billingCycle === 'yearly' ? yearlyPrice : plan.price;
            const displayPeriod = billingCycle === 'yearly' ? '/year' : '/month';

            return (
              <div
                key={plan.id}
                className={`relative bg-white rounded-2xl border-2 transition-all duration-300 hover:shadow-xl ${
                  plan.popular
                    ? 'border-indigo-500 shadow-lg scale-105 z-10'
                    : 'border-gray-200 hover:border-indigo-300'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-1 rounded-full text-sm font-medium shadow-lg">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="p-8">
                  {/* Icon */}
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${plan.color} text-white flex items-center justify-center mb-6 shadow-lg`}>
                    {plan.icon}
                  </div>

                  {/* Name and Price */}
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                  <div className="flex items-baseline mb-4">
                    <span className="text-4xl font-bold text-gray-900">
                      ₹{displayPrice}
                    </span>
                    <span className="text-gray-500 ml-2">{displayPeriod}</span>
                  </div>

                  {/* Credits Highlight */}
                  <div className="bg-indigo-50 rounded-lg p-4 mb-6">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-indigo-700 font-medium">
                        AI Credits
                      </span>
                      <span className="text-2xl font-bold text-indigo-700">
                        {plan.credits}
                      </span>
                    </div>
                    <p className="text-xs text-indigo-600 mt-1">
                      ~{Math.round(plan.credits / 2)} Q&A replies or {plan.credits} review replies
                    </p>
                  </div>

                  {/* Features List */}
                  <div className="space-y-3 mb-8">
                    {plan.features.map((feature, i) => (
                      <div key={i} className="flex items-start">
                        <Check className="h-5 w-5 text-green-500 mr-2 shrink-0" />
                        <span className="text-sm text-gray-600">{feature}</span>
                      </div>
                    ))}
                    {plan.limitations.map((limitation, i) => (
                      <div key={i} className="flex items-start opacity-50">
                        <X className="h-5 w-5 text-gray-400 mr-2 shrink-0" />
                        <span className="text-sm text-gray-400">{limitation}</span>
                      </div>
                    ))}
                  </div>

                  {/* CTA Button */}
                  <button
                    onClick={() => handleSelectPlan(plan.id)}
                    disabled={loading === plan.id}
                    className={`w-full py-3 px-4 rounded-xl font-medium transition-all duration-200 ${
                      plan.popular
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 shadow-md hover:shadow-lg'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {loading === plan.id ? (
                      <span className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                        Processing...
                      </span>
                    ) : !user ? (
                      'Sign in to Purchase'
                    ) : (
                      'Get Started'
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Note about payment */}
        <div className="mt-12 text-center text-sm text-gray-500">
          <p>Payment integration coming soon! You will be able to pay via UPI, Credit Card, or NetBanking.</p>
          <p className="mt-2">All plans include 7-day money-back guarantee.</p>
        </div>
      </div>
    </div>
  );
}