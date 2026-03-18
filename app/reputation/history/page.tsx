'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import Link from 'next/link';
import { ArrowLeft, Clock, CheckCircle, XCircle, MessageSquare } from 'lucide-react';

interface HistoryItem {
  id: string;
  questionId: string;
  actionType: string;
  timestamp: any;
  metadata?: any;
  question?: {
    text: string;
    askerName: string;
  };
}

export default function ReputationHistory() {
  const { user } = useAuth();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchHistory = async () => {
      try {
        // ✅ FIXED: Email se filter karo (UID ki jagah)
        // Ye future mein bhi kaam karega kyunki email unique hota hai
        const historyQuery = query(
          collection(db, 'questionHistory'),
          where('userEmail', '==', user.email),  // Email se filter
          orderBy('timestamp', 'desc'),
          limit(100)
        );
        
        const historySnapshot = await getDocs(historyQuery);
        const historyList = await Promise.all(
          historySnapshot.docs.map(async (doc) => {
            const data = doc.data();
            
            // Fetch question details
            let questionData = null;
            if (data.questionId) {
              const questionDoc = await getDocs(
                query(collection(db, 'questions'), where('__name__', '==', data.questionId))
              );
              if (!questionDoc.empty) {
                questionData = questionDoc.docs[0].data();
              }
            }
            
            return {
              id: doc.id,
              ...data,
              question: questionData
            };
          })
        );
        
        setHistory(historyList as HistoryItem[]);
      } catch (error) {
        console.error('Error fetching history:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [user]);

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'question_fetched':
        return <MessageSquare className="h-5 w-5 text-blue-500" />;
      case 'answer_posted':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'answer_failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getActionText = (item: HistoryItem) => {
    switch (item.actionType) {
      case 'question_fetched':
        return `New question fetched from Google${item.metadata?.hasAnswer ? ' (already answered)' : ''}`;
      case 'answer_posted':
        return `Reply posted to Google (${item.metadata?.answerLength || 0} characters)`;
      case 'answer_failed':
        return `Failed to post reply: ${item.metadata?.error || 'Unknown error'}`;
      default:
        return item.actionType;
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Please login to continue</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center">
            <Link
              href="/reputation"
              className="mr-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Q&A History
            </h1>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading history...</p>
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
            <p className="text-gray-600 dark:text-gray-400">No history found.</p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
              Start syncing questions to see activity here.
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {history.map((item) => (
                <li key={item.id} className="p-6">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 mt-1">
                      {getActionIcon(item.actionType)}
                    </div>
                    <div className="ml-4 flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {getActionText(item)}
                      </p>
                      {item.question && (
                        <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Question from {item.question.askerName}:
                          </p>
                          <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                            {item.question.text}
                          </p>
                        </div>
                      )}
                      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        {item.timestamp?.toDate?.().toLocaleString() || 'Just now'}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}