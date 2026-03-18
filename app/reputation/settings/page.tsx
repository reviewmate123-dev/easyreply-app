'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import Link from 'next/link';
import { ArrowLeft, Save, AlertCircle, RefreshCw } from 'lucide-react';
import { businessCategories, toneOptions, languageOptions, defaultBusinessContext, BusinessContext, Profile } from '@/lib/business-context';

export default function ReputationSettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [connected, setConnected] = useState(false);
  const [locationId, setLocationId] = useState('');
  const [autoReply, setAutoReply] = useState(false);
  const [businessContext, setBusinessContext] = useState<BusinessContext>(defaultBusinessContext);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeProfile, setActiveProfile] = useState<Profile | null>(null);
  const [error, setError] = useState('');

  // Listen for profile changes from switcher
  useEffect(() => {
    const handleProfileChange = (event: CustomEvent) => {
      const profile = event.detail;
      setActiveProfile(profile);
      if (profile?.businessContext) {
        setBusinessContext(profile.businessContext);
        setLocationId(profile.locationId);
      }
    };

    window.addEventListener('profile-changed', handleProfileChange as EventListener);
    
    return () => {
      window.removeEventListener('profile-changed', handleProfileChange as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!user) return;

    const fetchSettings = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          
          // Set profiles
          const userProfiles = data.profiles || [];
          setProfiles(userProfiles);
          
          // Get active profile
          const activeLocationId = data.activeLocationId || (userProfiles[0]?.locationId);
          const active = userProfiles.find((p: Profile) => p.locationId === activeLocationId) || userProfiles[0] || null;
          setActiveProfile(active);
          
          // Set connection status
          setConnected(data.googleConnected || false);
          setLocationId(active?.locationId || data.googleLocationId || '');
          setAutoReply(data.autoReplyEnabled || false);
          
          // Load business context for active profile
          if (active?.businessContext) {
            setBusinessContext(active.businessContext);
          } else if (data.businessContext) {
            // Fallback to old structure
            setBusinessContext(data.businessContext);
          }
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
        setError('Failed to load settings');
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [user]);

  const handleConnectGoogle = () => {
    window.location.href = '/api/google-auth';
  };

  // ✅ IMPROVED DISCONNECT FUNCTION
  const handleDisconnectGoogle = async () => {
    if (!user || !confirm('Are you sure you want to disconnect Google Business Profile?')) return;
    
    try {
      setSaving(true);
      setError('');
      
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        throw new Error('User document not found');
      }
      
      const userData = userDoc.data();
      
      await updateDoc(userRef, {
        googleConnected: false,
        accessToken: null,
        refreshToken: null,
        tokenExpiry: null,
        googleLocationId: null,
        googleAccountId: null,
        autoReplyEnabled: false,
        lastQuestionSync: null,
        profiles: userData.profiles || []
      });
      
      setConnected(false);
      setLocationId('');
      setAutoReply(false);
      
      alert('✅ Disconnected successfully!');
      
    } catch (error: any) {
      console.error('Disconnect error:', error);
      
      if (error.code === 'permission-denied') {
        setError('❌ Permission denied. Please check Firestore rules.');
      } else if (error.code === 'unavailable' || error.code === 'network-error') {
        setError('❌ Network error. Please check your internet connection and try again.');
      } else if (error.code === 'not-found') {
        setError('❌ User document not found. Please refresh and try again.');
      } else {
        setError(`❌ Failed to disconnect: ${error.message || 'Unknown error'}`);
      }
      
    } finally {
      setSaving(false);
    }
  };

  const handleBusinessContextChange = (field: keyof BusinessContext, value: any) => {
    setBusinessContext(prev => ({
      ...prev,
      [field]: value,
      updatedAt: new Date()
    }));
  };

  const handleSaveSettings = async () => {
    if (!user) return;
    
    setSaving(true);
    setError('');
    
    try {
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);
      const userData = userDoc.data() || {};
      
      let updatedProfiles = userData.profiles || [];
      
      if (activeProfile) {
        updatedProfiles = updatedProfiles.map((p: Profile) => {
          if (p.locationId === activeProfile.locationId) {
            return {
              ...p,
              businessContext: businessContext
            };
          }
          return p;
        });
      } else if (locationId) {
        const newProfile: Profile = {
          locationId: locationId,
          name: businessContext.businessName || 'My Business',
          businessContext: businessContext
        };
        updatedProfiles = [...updatedProfiles, newProfile];
      }
      
      await updateDoc(userRef, {
        autoReplyEnabled: autoReply,
        profiles: updatedProfiles,
        businessContext: businessContext
      });
      
      alert('✅ Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      setError('❌ Failed to save settings');
    } finally {
      setSaving(false);
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
              Reputation Settings
            </h1>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading settings...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Error Message */}
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mr-3 mt-0.5" />
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            {/* Profile Info */}
            {activeProfile && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-sm text-blue-800 dark:text-blue-400">
                  Editing: <span className="font-bold">{activeProfile.name}</span>
                </p>
              </div>
            )}

            {/* Google Connection Card */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Google Business Profile Connection
              </h2>
              
              {connected ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-green-800 dark:text-green-400">
                        ✓ Connected Successfully
                      </p>
                      {locationId ? (
                        <p className="text-xs text-green-600 dark:text-green-500 mt-1">
                          Location ID: {locationId}
                        </p>
                      ) : (
                        <div className="mt-2">
                          <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center">
                            <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                            ⏳ Location ID not auto-fetched
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Go to Q&A page and click "Sync Now" to fetch automatically.
                          </p>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={handleDisconnectGoogle}
                      disabled={saving}
                      className="px-4 py-2 border border-red-300 dark:border-red-600 rounded-md text-sm font-medium text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {saving ? 'Disconnecting...' : 'Disconnect'}
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Connect your Google Business Profile to start managing Q&A automatically.
                  </p>
                  <button
                    onClick={handleConnectGoogle}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Connect Google Business Profile
                  </button>
                </div>
              )}
            </div>

            {/* Business Context Form */}
            {connected && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Your Business Profile
                </h2>
                
                <div className="space-y-4">
                  {/* Business Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Business Name *
                    </label>
                    <input
                      type="text"
                      value={businessContext.businessName}
                      onChange={(e) => handleBusinessContextChange('businessName', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                      placeholder="e.g. Sharma's Restaurant"
                      required
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Business Category *
                    </label>
                    <select
                      value={businessContext.category}
                      onChange={(e) => handleBusinessContextChange('category', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                      required
                    >
                      <option value="">Select category</option>
                      {businessCategories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                    {businessContext.category === 'Pharmacy' || businessContext.category === 'Clinic' ? (
                      <p className="mt-1 text-xs text-amber-600">
                        ⚠️ This category requires manual review for all replies
                      </p>
                    ) : null}
                  </div>

                  {/* City */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      City *
                    </label>
                    <input
                      type="text"
                      value={businessContext.city}
                      onChange={(e) => handleBusinessContextChange('city', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                      placeholder="e.g. Mumbai, Delhi, Bangalore"
                      required
                    />
                  </div>

                  {/* Brand Tone */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Brand Tone *
                    </label>
                    <select
                      value={businessContext.tone}
                      onChange={(e) => handleBusinessContextChange('tone', e.target.value as any)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                    >
                      {toneOptions.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Brand Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Brand Description (Optional)
                    </label>
                    <textarea
                      value={businessContext.description}
                      onChange={(e) => handleBusinessContextChange('description', e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                      placeholder="Describe your business in 1-2 lines..."
                    />
                  </div>

                  {/* Language Support */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Language Support
                    </label>
                    <select
                      value={businessContext.language[0]}
                      onChange={(e) => handleBusinessContextChange('language', [e.target.value])}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                    >
                      {languageOptions.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Keywords (comma separated) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      SEO Keywords (comma separated)
                    </label>
                    <input
                      type="text"
                      value={businessContext.keywords.join(', ')}
                      onChange={(e) => handleBusinessContextChange('keywords', 
                        e.target.value.split(',').map(k => k.trim()).filter(k => k)
                      )}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                      placeholder="e.g. best restaurant, quality food, dine-in"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Auto Reply Settings */}
            {connected && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Auto-Reply Settings
                </h2>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Enable Auto-Reply Mode
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        When enabled, AI will automatically post replies to new questions
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoReply}
                        onChange={(e) => setAutoReply(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>
                  
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                    <p className="text-sm text-yellow-800 dark:text-yellow-400">
                      ⚠️ Auto-reply will use 3 credits per question (1 extra for Q&A). Make sure you have sufficient credits.
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={handleSaveSettings}
                    disabled={saving}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? 'Saving...' : 'Save Settings'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}