'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ChevronDown, Plus, Building2, Check } from 'lucide-react';
import { getMaxProfiles, canAddProfile } from '@/lib/plan-rules';

interface Profile {
  locationId: string;
  name: string;
  address?: string;
  isActive?: boolean;
}

interface ProfileSwitcherProps {
  onProfileChange?: (profile: Profile) => void;
}

export default function ProfileSwitcher({ onProfileChange }: ProfileSwitcherProps) {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeProfile, setActiveProfile] = useState<Profile | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userPlan, setUserPlan] = useState('basic');

  useEffect(() => {
    if (!user) return;

    const fetchProfiles = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const userProfiles = userData.profiles || [];
          const activeLocationId = userData.activeLocationId || (userProfiles[0]?.locationId);
          
          setProfiles(userProfiles);
          setUserPlan(userData.plan || 'basic');
          
          const active = userProfiles.find((p: Profile) => p.locationId === activeLocationId) || userProfiles[0] || null;
          setActiveProfile(active);
          
          if (onProfileChange && active) {
            onProfileChange(active);
          }
        }
      } catch (error) {
        console.error('Error fetching profiles:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfiles();
  }, [user, onProfileChange]);

  const switchProfile = async (profile: Profile) => {
    if (!user) return;
    
    setActiveProfile(profile);
    setIsOpen(false);
    
    // Save active profile to Firestore
    await updateDoc(doc(db, 'users', user.uid), {
      activeLocationId: profile.locationId
    });
    
    if (onProfileChange) {
      onProfileChange(profile);
    }
    
    // Refresh the page data (will be handled by parent component)
    window.dispatchEvent(new CustomEvent('profile-changed', { detail: profile }));
  };

  const addNewProfile = () => {
    // This will be handled by the parent component or redirect to settings
    alert('Add new profile feature coming soon! Please connect a new Google Business Profile from settings.');
  };

  if (loading) {
    return (
      <div className="animate-pulse bg-gray-200 h-10 w-48 rounded-lg"></div>
    );
  }

  if (profiles.length === 0) {
    return null; // No profiles to show
  }

  const maxProfiles = getMaxProfiles(userPlan);
  const canAdd = canAddProfile(userPlan, profiles.length);

  return (
    <div className="relative">
      {/* Profile Switcher Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-all"
      >
        <Building2 className="h-4 w-4 text-gray-500" />
        <span className="text-sm font-medium text-gray-700 truncate max-w-[150px]">
          {activeProfile?.name || 'Select Profile'}
        </span>
        <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop for closing on click outside */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          ></div>
          
          <div className="absolute left-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
            <div className="p-2">
              <p className="text-xs font-medium text-gray-500 px-3 py-2">
                Your Profiles ({profiles.length}/{maxProfiles})
              </p>
              
              {/* Profile List */}
              {profiles.map((profile) => (
                <button
                  key={profile.locationId}
                  onClick={() => switchProfile(profile)}
                  className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-50 flex items-center justify-between group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-700 truncate">
                      {profile.name}
                    </p>
                    {profile.address && (
                      <p className="text-xs text-gray-500 truncate">{profile.address}</p>
                    )}
                  </div>
                  {activeProfile?.locationId === profile.locationId && (
                    <Check className="h-4 w-4 text-indigo-600 ml-2 flex-shrink-0" />
                  )}
                </button>
              ))}

              {/* Add Profile Button (if allowed) */}
              {canAdd ? (
                <button
                  onClick={addNewProfile}
                  className="w-full mt-2 px-3 py-2 border-t border-gray-100 text-left flex items-center text-indigo-600 hover:bg-indigo-50 rounded-md"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  <span className="text-sm font-medium">Add New Profile</span>
                </button>
              ) : (
                <div className="mt-2 px-3 py-2 border-t border-gray-100">
                  <p className="text-xs text-gray-500 mb-2">You've reached the maximum number of profiles for your plan</p>
                  {userPlan !== 'pro' && (
                    <button
                      onClick={() => window.location.href = '/pricing'}
                      className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                    >
                      Upgrade to add more
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}