'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Clock, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  AlertCircle,
  Download,
  Mail,
  Star,
  MessageSquare,
  CheckCircle,
  XCircle,
  HelpCircle,
  ThumbsUp,
  ThumbsDown,
  MinusCircle,
  BarChart3,
  PieChart,
  TrendingUp as TrendingUpIcon
} from 'lucide-react';
import { getUserPlanRules } from '@/lib/plan-rules';
import { formatRevenueAlert, estimateLostRevenue } from '@/lib/revenue-estimator';

// ==================== TYPES ====================
interface Question {
  id: string;
  status?: 'posted' | 'pending' | 'ai_generated' | 'approved' | 'failed';
  createdAt?: any;
  answeredAt?: any;
  text?: string;
}

interface Review {
  id: string;
  status: 'new' | 'ai_generated' | 'approved' | 'posted' | 'failed';
  rating: number;
  comment: string;
  reply?: string;
  createdAt?: any;
}

interface AnalyticsData {
  // Questions Data
  questions: {
    total: number;
    answered: number;
    unanswered: number;
    aiGenerated: number;
    approved: number;
    failed: number;
    avgResponseTime: number;
    responseSpeedRank: number;
  };
  
  // Reviews Data
  reviews: {
    total: number;
    new: number;
    aiGenerated: number;
    approved: number;
    posted: number;
    failed: number;
    avgRating: number;
    ratingBreakdown: {
      5: number;
      4: number;
      3: number;
      2: number;
      1: number;
    };
    positive: number;  // 4-5 stars
    neutral: number;   // 3 stars
    negative: number;  // 1-2 stars
  };
  
  // Combined Metrics
  healthScore: number;
  revenueAlert: string;
  lostRevenueEstimate: string;
}

// ==================== HELPER FUNCTIONS ====================
function toDateSafe(value: any): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (typeof value === 'object' && typeof value.toDate === 'function') {
    return value.toDate();
  }
  return null;
}

function formatDate(date: any): string {
  if (!date) return 'N/A';
  try {
    const d = toDateSafe(date);
    if (!d) return 'N/A';
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch {
    return 'N/A';
  }
}

// ==================== MAIN COMPONENT ====================
export default function AnalyticsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [userPlan, setUserPlan] = useState('basic');
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    if (!user) return;

    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        
        // ==================== GET USER DATA ====================
        const userDoc = await getDocs(query(collection(db, 'users'), where('__name__', '==', user.uid)));
        const userData = userDoc.docs[0]?.data();
        setUserPlan(userData?.plan || 'basic');

        // ==================== FETCH QUESTIONS DATA ====================
        const questionsQuery = query(
          collection(db, 'questions'),
          where('uid', '==', user.uid)
        );
        const questionsSnapshot = await getDocs(questionsQuery);
        
        const questions: Question[] = questionsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Calculate question metrics
        const totalQuestions = questions.length;
        const answeredQuestions = questions.filter(q => q.status === 'posted').length;
        const unansweredQuestions = questions.filter(q => q.status === 'pending').length;
        const aiGeneratedQuestions = questions.filter(q => q.status === 'ai_generated').length;
        const approvedQuestions = questions.filter(q => q.status === 'approved').length;
        const failedQuestions = questions.filter(q => q.status === 'failed').length;

        // Calculate average response time for questions
        let totalResponseTime = 0;
        let responseCount = 0;
        questions.forEach(q => {
          if (q.answeredAt && q.createdAt) {
            const created = toDateSafe(q.createdAt);
            const answered = toDateSafe(q.answeredAt);
            if (created && answered) {
              const hours = (answered.getTime() - created.getTime()) / (1000 * 60 * 60);
              totalResponseTime += hours;
              responseCount++;
            }
          }
        });
        const avgResponseTime = responseCount > 0 ? totalResponseTime / responseCount : 0;

        // Response speed rank (based on response time)
        let responseSpeedRank = 50; // default
        if (avgResponseTime === 0) responseSpeedRank = 0;
        else if (avgResponseTime < 2) responseSpeedRank = 95;
        else if (avgResponseTime < 6) responseSpeedRank = 80;
        else if (avgResponseTime < 12) responseSpeedRank = 60;
        else if (avgResponseTime < 24) responseSpeedRank = 40;
        else responseSpeedRank = 20;

        // ==================== FETCH REVIEWS DATA ====================
        const reviewsQuery = query(
          collection(db, 'reviews'),
          where('userId', '==', user.uid)
        );
        const reviewsSnapshot = await getDocs(reviewsQuery);
        
        const reviews: Review[] = reviewsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Review[];

        // Calculate review metrics
        const totalReviews = reviews.length;
        const newReviews = reviews.filter(r => r.status === 'new').length;
        const aiGeneratedReviews = reviews.filter(r => r.status === 'ai_generated').length;
        const approvedReviews = reviews.filter(r => r.status === 'approved').length;
        const postedReviews = reviews.filter(r => r.status === 'posted').length;
        const failedReviews = reviews.filter(r => r.status === 'failed').length;

        // Calculate average rating
        let totalRating = 0;
        const ratingBreakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        let positive = 0, neutral = 0, negative = 0;
        
        reviews.forEach(r => {
          totalRating += r.rating || 0;
          if (r.rating === 5) ratingBreakdown[5]++;
          else if (r.rating === 4) ratingBreakdown[4]++;
          else if (r.rating === 3) ratingBreakdown[3]++;
          else if (r.rating === 2) ratingBreakdown[2]++;
          else if (r.rating === 1) ratingBreakdown[1]++;

          // Sentiment analysis
          if (r.rating >= 4) positive++;
          else if (r.rating === 3) neutral++;
          else if (r.rating <= 2) negative++;
        });
        
        const avgRating = totalReviews > 0 ? totalRating / totalReviews : 0;

        // ==================== CALCULATE HEALTH SCORE ====================
        // Question Score (40% weight)
        const questionResponseScore = Math.min(100, (answeredQuestions / Math.max(totalQuestions, 1)) * 100);
        const questionTimeScore = Math.max(0, 100 - (avgResponseTime * 5));
        const questionScore = (questionResponseScore * 0.6) + (questionTimeScore * 0.4);

        // Review Score (60% weight)
        const reviewRatingScore = (avgRating / 5) * 100;
        const reviewReplyScore = (postedReviews / Math.max(totalReviews, 1)) * 100;
        const reviewScore = (reviewRatingScore * 0.7) + (reviewReplyScore * 0.3);

        // Combined Health Score
        const healthScore = totalQuestions === 0 && totalReviews === 0 ? 0 :
          Math.floor((questionScore * 0.4) + (reviewScore * 0.6));

        // Lost revenue estimate
        const lostRevenueEstimate = estimateLostRevenue(unansweredQuestions);

        setData({
          questions: {
            total: totalQuestions,
            answered: answeredQuestions,
            unanswered: unansweredQuestions,
            aiGenerated: aiGeneratedQuestions,
            approved: approvedQuestions,
            failed: failedQuestions,
            avgResponseTime: Math.round(avgResponseTime * 10) / 10,
            responseSpeedRank
          },
          reviews: {
            total: totalReviews,
            new: newReviews,
            aiGenerated: aiGeneratedReviews,
            approved: approvedReviews,
            posted: postedReviews,
            failed: failedReviews,
            avgRating: Math.round(avgRating * 10) / 10,
            ratingBreakdown,
            positive,
            neutral,
            negative
          },
          healthScore,
          revenueAlert: formatRevenueAlert(unansweredQuestions),
          lostRevenueEstimate
        });

        setLastUpdated(new Date());

      } catch (err) {
        console.error('Analytics error:', err);
        setError('Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [user]);

  const handleExport = (format: 'csv' | 'pdf') => {
    alert(`${format.toUpperCase()} export coming soon!`);
  };

  const handleEmailReport = () => {
    alert('Weekly report will be emailed to you!');
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Please login to continue</p>
          <Link href="/auth-login" className="mt-4 inline-block text-indigo-600 hover:text-indigo-800">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  const planRules = getUserPlanRules(userPlan);
  const canExport = planRules.features.exportReports;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ==================== HEADER ==================== */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Link
                href="/dashboard"
                className="mr-4 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                  <BarChart3 className="h-6 w-6 mr-2 text-indigo-600" />
                  Analytics Dashboard
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  Last updated: {formatDate(lastUpdated)}
                </p>
              </div>
            </div>
            <div className="flex space-x-3">
              {canExport && (
                <>
                  <button
                    onClick={() => handleExport('csv')}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </button>
                  {userPlan === 'pro' && (
                    <button
                      onClick={handleEmailReport}
                      className="inline-flex items-center px-4 py-2 bg-indigo-600 border border-transparent rounded-lg text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      Email Report
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ==================== MAIN CONTENT ==================== */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading your analytics...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 font-medium">{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : data ? (
          <div className="space-y-8">
            {/* ==================== SECTION 1: HEALTH SCORE ==================== */}
            <section className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <TrendingUpIcon className="h-5 w-5 mr-2 text-indigo-600" />
                Overall Reputation Health
              </h2>
              
              <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                <div className="relative">
                  <div className="w-32 h-32 rounded-full flex items-center justify-center border-8 border-gray-100">
                    <div className="text-center">
                      <span className="text-4xl font-bold text-gray-900">{data.healthScore}</span>
                      <span className="text-sm text-gray-500 block">/100</span>
                    </div>
                  </div>
                  <div className={`absolute -top-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center ${
                    data.healthScore >= 70 ? 'bg-green-500' :
                    data.healthScore >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}>
                    {data.healthScore >= 70 ? '👍' : data.healthScore >= 40 ? '⚠️' : '🔴'}
                  </div>
                </div>

                <div className="flex-1">
                  <div className="mb-3">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">Health Score</span>
                      <span className="font-medium">{data.healthScore}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div 
                        className={`h-2.5 rounded-full ${
                          data.healthScore >= 70 ? 'bg-green-600' :
                          data.healthScore >= 40 ? 'bg-yellow-500' :
                          'bg-red-600'
                        }`}
                        style={{ width: `${data.healthScore}%` }}
                      ></div>
                    </div>
                  </div>

                  <p className="text-gray-700">
                    {data.healthScore >= 80 ? '🌟 Excellent! Your reputation is strong.' :
                     data.healthScore >= 60 ? '👍 Good, but there\'s room for improvement.' :
                     data.healthScore >= 40 ? '⚠️ Needs attention. Focus on responding to customers.' :
                     '🔴 Critical! Take immediate action to improve.'}
                  </p>

                  {data.questions.unanswered > 0 && (
                    <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-amber-800 text-sm flex items-start">
                        <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0 mt-0.5" />
                        <span>{data.revenueAlert}</span>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* ==================== SECTION 2: QUICK STATS ==================== */}
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <QuickStatCard
                title="Total Questions"
                value={data.questions.total}
                icon={<MessageSquare className="h-6 w-6 text-blue-600" />}
                bgColor="bg-blue-50"
              />
              <QuickStatCard
                title="Total Reviews"
                value={data.reviews.total}
                icon={<Star className="h-6 w-6 text-yellow-600" />}
                bgColor="bg-yellow-50"
              />
              <QuickStatCard
                title="Avg. Rating"
                value={data.reviews.avgRating.toFixed(1)}
                suffix="/5"
                icon={<ThumbsUp className="h-6 w-6 text-green-600" />}
                bgColor="bg-green-50"
              />
              <QuickStatCard
                title="Response Time"
                value={data.questions.avgResponseTime}
                suffix="hrs"
                icon={<Clock className="h-6 w-6 text-purple-600" />}
                bgColor="bg-purple-50"
              />
            </section>

            {/* ==================== SECTION 3: REVIEWS ANALYTICS ==================== */}
            <section className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Star className="h-5 w-5 mr-2 text-yellow-500" />
                Google Reviews Analytics
              </h2>
              
              {/* Review Status Cards */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
                <StatusCard 
                  label="🆕 New" 
                  value={data.reviews.new} 
                  color="blue" 
                  total={data.reviews.total}
                />
                <StatusCard 
                  label="🤖 AI Generated" 
                  value={data.reviews.aiGenerated} 
                  color="purple" 
                  total={data.reviews.total}
                />
                <StatusCard 
                  label="✅ Approved" 
                  value={data.reviews.approved} 
                  color="green" 
                  total={data.reviews.total}
                />
                <StatusCard 
                  label="📤 Posted" 
                  value={data.reviews.posted} 
                  color="gray" 
                  total={data.reviews.total}
                />
                <StatusCard 
                  label="❌ Failed" 
                  value={data.reviews.failed} 
                  color="red" 
                  total={data.reviews.total}
                />
              </div>

              {/* Rating Distribution */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                    <PieChart className="h-4 w-4 mr-2 text-gray-500" />
                    Rating Distribution
                  </h3>
                  <div className="space-y-3">
                    {[5,4,3,2,1].map(rating => {
                      const count = data.reviews.ratingBreakdown[rating as keyof typeof data.reviews.ratingBreakdown];
                      const percentage = data.reviews.total > 0 ? (count / data.reviews.total) * 100 : 0;
                      return (
                        <div key={rating} className="flex items-center">
                          <span className="w-10 text-sm font-medium">{rating} ★</span>
                          <div className="flex-1 mx-2">
                            <div className="w-full bg-gray-200 rounded-full h-2.5">
                              <div 
                                className={`h-2.5 rounded-full ${
                                  rating >= 4 ? 'bg-green-500' :
                                  rating === 3 ? 'bg-yellow-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                          </div>
                          <span className="w-10 text-sm text-gray-600">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Sentiment Analysis */}
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                    <ThumbsUp className="h-4 w-4 mr-2 text-gray-500" />
                    Customer Sentiment
                  </h3>
                  <div className="space-y-3">
                    <SentimentBar 
                      label="Positive (4-5★)" 
                      value={data.reviews.positive}
                      total={data.reviews.total}
                      color="green"
                      icon={<ThumbsUp className="h-4 w-4" />}
                    />
                    <SentimentBar 
                      label="Neutral (3★)" 
                      value={data.reviews.neutral}
                      total={data.reviews.total}
                      color="yellow"
                      icon={<MinusCircle className="h-4 w-4" />}
                    />
                    <SentimentBar 
                      label="Negative (1-2★)" 
                      value={data.reviews.negative}
                      total={data.reviews.total}
                      color="red"
                      icon={<ThumbsDown className="h-4 w-4" />}
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* ==================== SECTION 4: QUESTIONS ANALYTICS ==================== */}
            <section className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <HelpCircle className="h-5 w-5 mr-2 text-blue-500" />
                Q&A Analytics
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Question Status */}
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Question Status</h3>
                  <div className="space-y-3">
                    <StatusProgress 
                      label="Answered" 
                      value={data.questions.answered}
                      total={data.questions.total}
                      color="green"
                    />
                    <StatusProgress 
                      label="AI Generated" 
                      value={data.questions.aiGenerated}
                      total={data.questions.total}
                      color="purple"
                    />
                    <StatusProgress 
                      label="Approved" 
                      value={data.questions.approved}
                      total={data.questions.total}
                      color="blue"
                    />
                    <StatusProgress 
                      label="Pending" 
                      value={data.questions.unanswered}
                      total={data.questions.total}
                      color="yellow"
                    />
                    <StatusProgress 
                      label="Failed" 
                      value={data.questions.failed}
                      total={data.questions.total}
                      color="red"
                    />
                  </div>
                </div>

                {/* Response Time Analysis */}
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Response Time Analysis</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-center mb-4">
                      <p className="text-3xl font-bold text-gray-900">{data.questions.avgResponseTime}</p>
                      <p className="text-sm text-gray-600">Average Response Time (hours)</p>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Speed Rank</span>
                        <span className="font-medium">
                          {data.questions.responseSpeedRank >= 80 ? '🚀 Fast' :
                           data.questions.responseSpeedRank >= 50 ? '⚡ Average' : '🐢 Slow'}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            data.questions.responseSpeedRank >= 80 ? 'bg-green-600' :
                            data.questions.responseSpeedRank >= 50 ? 'bg-yellow-500' : 'bg-red-600'
                          }`}
                          style={{ width: `${data.questions.responseSpeedRank}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Faster than {data.questions.responseSpeedRank}% of businesses
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* ==================== SECTION 5: UPGRADE PROMPT ==================== */}
            {userPlan !== 'pro' && (
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-100 p-6">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-indigo-900 mb-2">
                      🚀 Unlock Advanced Analytics
                    </h3>
                    <p className="text-indigo-700">
                      Upgrade to Pro to get competitor tracking, weekly reports, and more!
                    </p>
                  </div>
                  <Link
                    href="/pricing"
                    className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors whitespace-nowrap"
                  >
                    Upgrade to Pro
                  </Link>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No data available</h3>
            <p className="text-gray-600">
              Connect your Google Business Profile to start seeing analytics.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ==================== HELPER COMPONENTS ====================

function QuickStatCard({ title, value, suffix = '', icon, bgColor }: any) {
  return (
    <div className={`${bgColor} rounded-xl p-6 border border-gray-200`}>
      <div className="flex items-center justify-between mb-2">
        <div className="p-2 bg-white rounded-lg shadow-sm">
          {icon}
        </div>
      </div>
      <p className="text-sm text-gray-600 mb-1">{title}</p>
      <p className="text-2xl font-bold text-gray-900">{value}{suffix}</p>
    </div>
  );
}

function StatusCard({ label, value, color, total }: any) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-800',
    purple: 'bg-purple-100 text-purple-800',
    green: 'bg-green-100 text-green-800',
    gray: 'bg-gray-100 text-gray-800',
    red: 'bg-red-100 text-red-800',
    yellow: 'bg-yellow-100 text-yellow-800'
  };
  
  const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
  
  return (
    <div className={`${colorClasses[color as keyof typeof colorClasses]} p-4 rounded-lg`}>
      <p className="text-xs font-medium mb-1">{label}</p>
      <p className="text-xl font-bold">{value}</p>
      <p className="text-xs mt-1">{percentage}% of total</p>
    </div>
  );
}

function StatusProgress({ label, value, total, color }: any) {
  const percentage = total > 0 ? (value / total) * 100 : 0;
  
  const colorClasses = {
    green: 'bg-green-600',
    purple: 'bg-purple-600',
    blue: 'bg-blue-600',
    yellow: 'bg-yellow-500',
    red: 'bg-red-600'
  };
  
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-600">{label}</span>
        <span className="font-medium">{value} / {total}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className={`${colorClasses[color as keyof typeof colorClasses]} h-2 rounded-full`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
}

function SentimentBar({ label, value, total, color, icon }: any) {
  const percentage = total > 0 ? (value / total) * 100 : 0;
  
  const colorClasses = {
    green: 'bg-green-600',
    yellow: 'bg-yellow-500',
    red: 'bg-red-600'
  };
  
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1">
        <div className="flex items-center">
          <span className="mr-2 text-gray-600">{icon}</span>
          <span className="text-gray-700">{label}</span>
        </div>
        <span className="font-medium">{value} ({Math.round(percentage)}%)</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className={`${colorClasses[color as keyof typeof colorClasses]} h-2 rounded-full`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
}