'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import Link from 'next/link';
import { 
  Settings, 
  History, 
  RefreshCw, 
  Check, 
  X, 
  Send,
  MessageSquare,
  User,
  Clock,
  AlertCircle,
  Bot,
  AlertTriangle,
  ChevronDown
} from 'lucide-react';
import RiskIndicator from '@/app/components/RiskIndicator';
import ProfileSwitcher from '@/app/components/ProfileSwitcher';
import { getRiskLevel } from '@/lib/sensitive-keywords';

interface Question {
  id: string;
  text: string;
  askerName: string;
  status: 'pending' | 'ai_generated' | 'approved' | 'posted' | 'external_replied';
  aiReply?: string;
  createdAt: any;
  riskLevel?: 'low' | 'medium' | 'high';
}

export default function ReputationPage() {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);
  const [posting, setPosting] = useState<string | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [editedReply, setEditedReply] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  // Regenerate warning states
  const [showRegenerateWarning, setShowRegenerateWarning] = useState(false);
  const [currentQuestionForRegenerate, setCurrentQuestionForRegenerate] = useState<Question | null>(null);
  const [extraCreditCost, setExtraCreditCost] = useState(0);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  // Listen for profile changes
  useEffect(() => {
    const handleProfileChange = (event: CustomEvent) => {
      const profile = event.detail;
      console.log('Profile changed to:', profile);
    };

    window.addEventListener('profile-changed', handleProfileChange as EventListener);
    
    return () => {
      window.removeEventListener('profile-changed', handleProfileChange as EventListener);
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;

    setLoading(true);
    setError(null);
    
    const q = query(
      collection(db, 'questions'),
      where('uid', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const questionsList = snapshot.docs.map(doc => {
          const data = doc.data();
          const riskLevel = getRiskLevel(data.text || '');
          return {
            id: doc.id,
            ...data,
            riskLevel
          } as Question;
        });
        
        setQuestions(questionsList);
        setLoading(false);
      },
      (error) => {
        console.error('Firestore error:', error);
        setError('Failed to load questions. Please try again.');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const handleSync = async () => {
    if (!user) return;
    
    setSyncing(true);
    setError(null);
    
    try {
      const response = await fetch('/api/fetch-questions', {
        method: 'POST'
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Sync failed');
      }
      
      alert(`${data.newQuestions} new questions found!`);
    } catch (error: any) {
      console.error('Sync error:', error);
      setError(error.message || 'Failed to sync questions');
    } finally {
      setSyncing(false);
    }
  };

  const handleGenerateClick = async (question: Question, isRegenerate: boolean = false) => {
    if (isRegenerate) {
      const freeUsed = 1;
      const planFree = 1;
      
      if (freeUsed >= planFree) {
        const isQnA = question.text.length > 100;
        const extraCost = isQnA ? 3 : 2;
        setExtraCreditCost(extraCost);
        setCurrentQuestionForRegenerate(question);
        setShowRegenerateWarning(true);
        return;
      }
    }
    
    await generateAIReply(question);
  };

  const generateAIReply = async (question: Question) => {
    setGenerating(question.id);
    setError(null);
    
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          review: question.text,
          tone: 'professional',
          businessContext: {
            businessName: 'Demo Business',
            category: 'Local Business',
            tone: 'friendly',
            description: '',
            city: 'Mumbai',
            keywords: ['quality service'],
            language: ['english'],
            length: 'medium'
          }
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        if (response.status === 403) {
          if (data.error?.includes('credits')) {
            alert('Insufficient credits! Please buy more.');
            return;
          }
          if (data.error?.includes('blocked')) {
            alert('Account blocked. Contact support.');
            return;
          }
          if (data.error?.includes('expired')) {
            alert('Plan expired. Please upgrade.');
            return;
          }
        }
        throw new Error(data.error || 'Generation failed');
      }
      
      alert(`✅ AI Reply Generated:\n\n${data.reply}`);
      
    } catch (error: any) {
      console.error('Generation error:', error);
      setError(error.message || 'Failed to generate reply');
    } finally {
      setGenerating(null);
    }
  };

  const postAnswer = async (questionId: string, answer: string) => {
    setPosting(questionId);
    setError(null);
    
    try {
      const response = await fetch('/api/post-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId, answer })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        if (response.status === 402) {
          alert('Insufficient credits! Please buy more.');
          return;
        }
        throw new Error(data.error || 'Failed to post');
      }
      
      alert('Answer posted successfully!');
      setSelectedQuestion(null);
      
    } catch (error: any) {
      console.error('Post error:', error);
      setError(error.message || 'Failed to post answer');
    } finally {
      setPosting(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const config = {
      pending: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', label: 'Pending' },
      ai_generated: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', label: 'AI Generated' },
      approved: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', label: 'Approved' },
      posted: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200', label: 'Posted' },
      external_replied: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', label: 'External Reply' }
    };
    
    const style = config[status as keyof typeof config] || config.pending;
    
    return (
      <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${style.bg} ${style.text} border ${style.border} shadow-sm`}>
        {style.label}
      </span>
    );
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <div className="text-center bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
          <MessageSquare className="h-16 w-16 text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">Please login to continue</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
                <MessageSquare className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  Q&A Reputation Manager
                </h1>
                <p className="text-sm text-gray-500">Manage and respond to Google Q&A</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <ProfileSwitcher />
              
              <Link
                href="/reputation/settings"
                className="group inline-flex items-center px-4 py-2 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 hover:border-indigo-300 hover:shadow-md transition-all duration-200"
              >
                <Settings className="h-4 w-4 mr-2 group-hover:rotate-90 transition-transform duration-300" />
                Settings
              </Link>
              
              <Link
                href="/reputation/history"
                className="group inline-flex items-center px-4 py-2 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 hover:border-indigo-300 hover:shadow-md transition-all duration-200"
              >
                <History className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform duration-200" />
                History
              </Link>
              
              <button
                onClick={handleSync}
                disabled={syncing}
                className="group inline-flex items-center px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 border border-transparent rounded-xl text-sm font-medium text-white hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
                {syncing ? 'Syncing...' : 'Sync Now'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start shadow-sm">
            <AlertCircle className="h-5 w-5 text-red-600 mr-3 shrink-0 mt-0.5" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg hover:border-indigo-300 transition-all duration-300 group cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 group-hover:text-indigo-600 transition-colors">Total Questions</p>
                <p className="text-3xl font-bold text-gray-900 mt-1 group-hover:text-indigo-600 transition-colors">{questions.length}</p>
              </div>
              <div className="w-14 h-14 bg-indigo-50 rounded-xl flex items-center justify-center group-hover:bg-indigo-100 group-hover:scale-110 transition-all duration-300">
                <MessageSquare className="h-7 w-7 text-indigo-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg hover:border-yellow-300 transition-all duration-300 group cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 group-hover:text-yellow-600 transition-colors">Pending</p>
                <p className="text-3xl font-bold text-yellow-600 mt-1">
                  {questions.filter(q => q.status === 'pending').length}
                </p>
              </div>
              <div className="w-14 h-14 bg-yellow-50 rounded-xl flex items-center justify-center group-hover:bg-yellow-100 group-hover:scale-110 transition-all duration-300">
                <Clock className="h-7 w-7 text-yellow-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg hover:border-blue-300 transition-all duration-300 group cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 group-hover:text-blue-600 transition-colors">AI Generated</p>
                <p className="text-3xl font-bold text-blue-600 mt-1">
                  {questions.filter(q => q.status === 'ai_generated').length}
                </p>
              </div>
              <div className="w-14 h-14 bg-blue-50 rounded-xl flex items-center justify-center group-hover:bg-blue-100 group-hover:scale-110 transition-all duration-300">
                <Bot className="h-7 w-7 text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg hover:border-green-300 transition-all duration-300 group cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 group-hover:text-green-600 transition-colors">Posted</p>
                <p className="text-3xl font-bold text-green-600 mt-1">
                  {questions.filter(q => q.status === 'posted').length}
                </p>
              </div>
              <div className="w-14 h-14 bg-green-50 rounded-xl flex items-center justify-center group-hover:bg-green-100 group-hover:scale-110 transition-all duration-300">
                <Check className="h-7 w-7 text-green-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Questions List */}
        {loading ? (
          <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-200 border-t-indigo-600 mx-auto"></div>
            <p className="mt-6 text-gray-600 font-medium">Loading questions...</p>
          </div>
        ) : questions.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-16 text-center hover:shadow-xl transition-all duration-300">
            <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <MessageSquare className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">No questions found</h3>
            <p className="text-gray-500 mb-8">Click "Sync Now" to fetch questions from Google Business Profile.</p>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="inline-flex items-center px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 border border-transparent rounded-xl text-sm font-medium text-white hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 transition-all duration-200 shadow-md hover:shadow-lg"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync Now'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {questions.map((question) => (
              <div
                key={question.id}
                onMouseEnter={() => setHoveredCard(question.id)}
                onMouseLeave={() => setHoveredCard(null)}
                className={`bg-white rounded-xl border-2 transition-all duration-300 ${
                  hoveredCard === question.id 
                    ? 'border-indigo-400 shadow-xl scale-[1.02]' 
                    : 'border-gray-200 shadow-md hover:shadow-lg'
                }`}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start space-x-3">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 ${
                        hoveredCard === question.id 
                          ? 'bg-indigo-100' 
                          : 'bg-gray-100'
                      }`}>
                        <User className={`h-6 w-6 transition-colors duration-300 ${
                          hoveredCard === question.id ? 'text-indigo-600' : 'text-gray-600'
                        }`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className={`font-semibold text-gray-900 transition-colors duration-300 ${
                            hoveredCard === question.id ? 'text-indigo-600' : ''
                          }`}>
                            {question.askerName}
                          </h3>
                          {question.riskLevel && (
                            <RiskIndicator level={question.riskLevel} showLabel={false} />
                          )}
                        </div>
                        <p className="text-sm text-gray-500">
                          {question.createdAt?.toDate?.().toLocaleString() || 'Just now'}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(question.status)}
                  </div>
                  
                  <div className="ml-15 mb-4">
                    <div className={`bg-gray-50 rounded-xl p-5 border transition-all duration-300 ${
                      hoveredCard === question.id ? 'border-indigo-200' : 'border-gray-100'
                    }`}>
                      <p className="text-gray-700">{question.text}</p>
                    </div>
                  </div>
                  
                  {question.aiReply && (
                    <div className="ml-15 mb-4">
                      <div className={`bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-5 border transition-all duration-300 ${
                        hoveredCard === question.id ? 'border-indigo-200' : 'border-indigo-100'
                      }`}>
                        <div className="flex items-center mb-2">
                          <Bot className="h-5 w-5 text-indigo-600 mr-2" />
                          <p className="text-sm font-semibold text-indigo-900">AI Generated Reply</p>
                        </div>
                        <p className="text-gray-700">{question.aiReply}</p>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex space-x-3 ml-15">
                    {question.status === 'pending' && (
                      <button
                        onClick={() => handleGenerateClick(question, false)}
                        disabled={generating === question.id}
                        className="group inline-flex items-center px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 border border-transparent rounded-xl text-sm font-medium text-white hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 transition-all duration-200 shadow-md hover:shadow-lg"
                      >
                        {generating === question.id ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                            Generating...
                          </>
                        ) : (
                          <>
                            <Bot className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform" />
                            Generate AI Reply
                          </>
                        )}
                      </button>
                    )}
                    
                    {question.status === 'ai_generated' && (
                      <button
                        onClick={() => handleGenerateClick(question, true)}
                        disabled={generating === question.id}
                        className="group inline-flex items-center px-5 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 hover:border-indigo-300 hover:shadow-md transition-all duration-200"
                      >
                        {generating === question.id ? 'Regenerating...' : 'Regenerate'}
                      </button>
                    )}
                    
                    {(question.status === 'ai_generated' || question.status === 'approved') && (
                      <>
                        <button
                          onClick={() => {
                            setSelectedQuestion(question);
                            setEditedReply(question.aiReply || '');
                          }}
                          className="group inline-flex items-center px-5 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 hover:border-indigo-300 hover:shadow-md transition-all duration-200"
                        >
                          Edit & Approve
                        </button>
                        <button
                          onClick={() => postAnswer(question.id, question.aiReply!)}
                          disabled={posting === question.id}
                          className="group inline-flex items-center px-5 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 border border-transparent rounded-xl text-sm font-medium text-white hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 transition-all duration-200 shadow-md hover:shadow-lg"
                        >
                          {posting === question.id ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                              Posting...
                            </>
                          ) : (
                            <>
                              <Send className="h-4 w-4 mr-2 group-hover:translate-x-1 transition-transform" />
                              Post to Google
                            </>
                          )}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Regenerate Warning Modal */}
      {showRegenerateWarning && currentQuestionForRegenerate && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-8 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-amber-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">
                Extra Credits Required
              </h3>
            </div>
            <p className="text-gray-600 mb-6">
              You have used all your free regenerations for this month.
              This regenerate will cost <span className="font-bold text-indigo-600 text-lg">{extraCreditCost} credits</span>.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowRegenerateWarning(false)}
                className="px-5 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 hover:border-indigo-300 transition-all duration-200"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setShowRegenerateWarning(false);
                  await generateAIReply(currentQuestionForRegenerate);
                }}
                className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 border border-transparent rounded-xl text-sm font-medium text-white hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-md hover:shadow-lg"
              >
                Proceed
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {selectedQuestion && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-8 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Edit Reply</h2>
              <button
                onClick={() => setSelectedQuestion(null)}
                className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-all duration-200"
              >
                <X className="h-5 w-5 text-gray-600" />
              </button>
            </div>
            
            <div className="mb-6">
              <p className="text-sm font-medium text-gray-700 mb-2">Question:</p>
              <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                <p className="text-gray-700">{selectedQuestion.text}</p>
              </div>
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Reply:
              </label>
              <textarea
                value={editedReply}
                onChange={(e) => setEditedReply(e.target.value)}
                rows={6}
                className="w-full px-5 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                placeholder="Edit your reply..."
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setSelectedQuestion(null)}
                className="px-5 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 hover:border-indigo-300 transition-all duration-200"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  postAnswer(selectedQuestion.id, editedReply);
                  setSelectedQuestion(null);
                }}
                disabled={posting === selectedQuestion.id}
                className="px-5 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 border border-transparent rounded-xl text-sm font-medium text-white hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 transition-all duration-200 shadow-md hover:shadow-lg"
              >
                {posting === selectedQuestion.id ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                    Posting...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Post Reply
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}