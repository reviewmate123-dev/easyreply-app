'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import Link from 'next/link';

interface LowCreditAlertProps {
  threshold?: number; // Default 10
}

export default function LowCreditAlert({ threshold = 10 }: LowCreditAlertProps) {
  const { user } = useAuth();
  const [credits, setCredits] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!user) return;

    const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (doc) => {
      if (doc.exists()) {
        setCredits(doc.data().credits || 0);
      }
    });

    return () => unsubscribe();
  }, [user]);

  if (!user || !credits || credits > threshold || dismissed) return null;

  return (
    <div className="fixed bottom-4 right-4 max-w-sm w-full bg-white rounded-lg shadow-lg border border-amber-200 p-4 z-50">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
        </div>
        <div className="ml-3 flex-1">
          <p className="text-sm font-medium text-gray-900">
            Low Credits Warning
          </p>
          <p className="mt-1 text-sm text-gray-600">
            You only have <span className="font-bold text-amber-600">{credits} credits</span> left.
            {credits === 0 && " You cannot generate new replies."}
          </p>
          <div className="mt-3 flex gap-2">
            <Link
              href="/pricing"
              className="inline-flex items-center px-3 py-1.5 bg-indigo-600 border border-transparent rounded-md text-xs font-medium text-white hover:bg-indigo-700"
            >
              Buy Credits
            </Link>
            <button
              onClick={() => setDismissed(true)}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-xs font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Dismiss
            </button>
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="ml-2 flex-shrink-0 text-gray-400 hover:text-gray-600"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}