'use client';

import { AlertTriangle, X } from 'lucide-react';
import { useState } from 'react';

interface RegenerateWarningProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  extraCredits: number;
  actionType: 'review' | 'qa';
}

export default function RegenerateWarning({
  isOpen,
  onClose,
  onConfirm,
  extraCredits,
  actionType
}: RegenerateWarningProps) {
  
  const [isConfirming, setIsConfirming] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      await onConfirm();
    } finally {
      setIsConfirming(false);
      onClose();
    }
  };

  const actionText = actionType === 'review' ? 'review reply' : 'Q&A reply';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-amber-500" />
            <h3 className="text-lg font-bold text-gray-900">
              Extra Credits Required
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="mb-6">
          <p className="text-sm text-gray-600 mb-2">
            You have used all your free regenerations for this month.
          </p>
          <p className="text-sm text-gray-600">
            This {actionText} will cost{' '}
            <span className="font-bold text-indigo-600">{extraCredits} credits</span>.
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Base cost: {actionType === 'review' ? '1' : '2'} credit + 1 extra for regenerate
          </p>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            disabled={isConfirming}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isConfirming}
            className="px-4 py-2 bg-indigo-600 border border-transparent rounded-lg text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 flex items-center"
          >
            {isConfirming ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Processing...
              </>
            ) : (
              'Proceed'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}