'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { CreditCard, AlertTriangle } from 'lucide-react';

interface CreditBalanceProps {
  showLowWarning?: boolean;
  className?: string;
}

export default function CreditBalance({ showLowWarning = true, className = '' }: CreditBalanceProps) {
  const { user } = useAuth();
  const [credits, setCredits] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (doc) => {
      if (doc.exists()) {
        setCredits(doc.data().credits || 0);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  if (!user || loading) return null;

  const isLow = credits !== null && credits < 10;

  return (
    <div className={`flex items-center ${className}`}>
      <CreditCard className="h-4 w-4 text-gray-500 mr-1" />
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {credits !== null ? credits : 0} credits
      </span>
      {showLowWarning && isLow && (
        <div className="ml-2 relative group">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
            Low credits! Buy more.
          </div>
        </div>
      )}
    </div>
  );
}