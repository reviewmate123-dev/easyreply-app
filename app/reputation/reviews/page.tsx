'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Star, 
  MessageSquare, 
  CheckCircle, 
  XCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  Filter
} from 'lucide-react';
import { getStatusColor, getStatusLabel, type ReviewStatus } from '@/lib/review-status-shared';

interface Review {
  id: string;
  reviewerName: string;
  rating: number;
  comment: string;
  reply?: string;
  status: ReviewStatus;
  createdAt: { toDate?: () => Date } | Date | string;
  locationId: string;
  aiConfidence?: number;
}

function formatDate(date: any): string {
  if (!date) return 'N/A';
  
  try {
    if (date?.toDate && typeof date.toDate === 'function') {
      date = date.toDate();
    }
    
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'N/A';
    
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch {
    return 'N/A';
  }
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-4 w-4 ${
            star <= rating
              ? 'text-yellow-400 fill-yellow-400'
              : 'text-gray-300'
          }`}
        />
      ))}
      <span className="ml-2 text-sm text-gray-600">{rating}/5</span>
    </div>
  );
}

export default function ReviewsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [filter, setFilter] = useState<ReviewStatus | 'all'>('all');
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    new: 0,
    ai_generated: 0,
    approved: 0,
    posted: 0,
    failed: 0
  });

  useEffect(() => {
    if (!user) return;

    const fetchReviews = async () => {
      try {
        setLoading(true);
        
        let q = query(
          collection(db, 'reviews'),
          where('userId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
        
        const snapshot = await getDocs(q);
        
        const reviewsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Review[];
        
        setReviews(reviewsData);
        
        // Calculate stats
        const newStats = {
          total: reviewsData.length,
          new: reviewsData.filter(r => r.status === 'new').length,
          ai_generated: reviewsData.filter(r => r.status === 'ai_generated').length,
          approved: reviewsData.filter(r => r.status === 'approved').length,
          posted: reviewsData.filter(r => r.status === 'posted').length,
          failed: reviewsData.filter(r => r.status === 'failed').length
        };
        setStats(newStats);
        
      } catch (err: any) {
        console.error('Error fetching reviews:', err);
        setError(err.message || 'Failed to load reviews');
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, [user]);

  const filteredReviews = filter === 'all' 
    ? reviews 
    : reviews.filter(r => r.status === filter);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Please login to continue</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Link
                href="/reputation"
                className="mr-4 text-gray-500 hover:text-gray-700"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">
                Google Reviews
              </h1>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <StatCard 
            label="Total" 
            value={stats.total} 
            color="bg-gray-100 text-gray-800"
          />
          <StatCard 
            label="New" 
            value={stats.new} 
            color="bg-blue-100 text-blue-800"
          />
          <StatCard 
            label="AI Ready" 
            value={stats.ai_generated} 
            color="bg-purple-100 text-purple-800"
          />
          <StatCard 
            label="Approved" 
            value={stats.approved} 
            color="bg-green-100 text-green-800"
          />
          <StatCard 
            label="Posted" 
            value={stats.posted} 
            color="bg-gray-100 text-gray-800"
          />
          <StatCard 
            label="Failed" 
            value={stats.failed} 
            color="bg-red-100 text-red-800"
          />
        </div>
      </div>

      {/* Filter Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center space-x-2 overflow-x-auto">
            <Filter className="h-5 w-5 text-gray-400" />
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap ${
                filter === 'all'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All Reviews
            </button>
            <button
              onClick={() => setFilter('new')}
              className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap ${
                filter === 'new'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              New
            </button>
            <button
              onClick={() => setFilter('ai_generated')}
              className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap ${
                filter === 'ai_generated'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              AI Generated
            </button>
            <button
              onClick={() => setFilter('approved')}
              className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap ${
                filter === 'approved'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Approved
            </button>
            <button
              onClick={() => setFilter('posted')}
              className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap ${
                filter === 'posted'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Posted
            </button>
          </div>
        </div>
      </div>

      {/* Reviews List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading reviews...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600">{error}</p>
          </div>
        ) : filteredReviews.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No reviews found</h3>
            <p className="text-gray-600">
              {filter === 'all' 
                ? 'Connect your Google Business Profile to fetch reviews'
                : `No reviews with status "${filter}"`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredReviews.map((review) => (
              <div
                key={review.id}
                className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-medium text-gray-900">
                      {review.reviewerName || 'Anonymous'}
                    </h3>
                    <StarRating rating={review.rating} />
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(review.status)}`}>
                      {getStatusLabel(review.status)}
                    </span>
                    {review.aiConfidence && (
                      <span className="text-xs text-gray-500">
                        Confidence: {review.aiConfidence}%
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-gray-700 mb-4">{review.comment}</p>

                {review.reply && (
                  <div className="mt-4 pl-4 border-l-4 border-indigo-200 bg-indigo-50 p-3 rounded">
                    <p className="text-sm text-indigo-900 font-medium mb-1">Reply:</p>
                    <p className="text-sm text-indigo-800">{review.reply}</p>
                  </div>
                )}

                <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-1" />
                    {formatDate(review.createdAt)}
                  </div>
                  
                  <div className="flex space-x-2">
                    {review.status === 'new' && (
                      <button className="px-3 py-1 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700">
                        Generate Reply
                      </button>
                    )}
                    {review.status === 'ai_generated' && (
                      <button className="px-3 py-1 bg-green-600 text-white rounded-md text-sm hover:bg-green-700">
                        Approve & Post
                      </button>
                    )}
                    {review.status === 'approved' && (
                      <button className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700">
                        Post to Google
                      </button>
                    )}
                    {review.status === 'failed' && (
                      <button className="px-3 py-1 bg-amber-600 text-white rounded-md text-sm hover:bg-amber-700">
                        Retry
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <p className="text-sm text-gray-600 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color.split(' ')[1]}`}>{value}</p>
    </div>
  );
}
