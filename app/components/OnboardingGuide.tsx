// components/OnboardingGuide.tsx
'use client';

import { useState, useEffect } from 'react';
import { auth } from '@/lib/firebase'; // ✅ Import auth

export default function OnboardingGuide() {
  const [showGuide, setShowGuide] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  // Check if user has seen onboarding before - USER SPECIFIC
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    // User-specific key
    const key = `onboardingSeen_${user.uid}`;
    const hasSeen = localStorage.getItem(key);
    
    if (!hasSeen) {
      setShowGuide(true);
    }
  }, []);

  const closeGuide = () => {
    const user = auth.currentUser;
    if (!user) return;

    setIsClosing(true);
    setTimeout(() => {
      // User-specific key
      const key = `onboardingSeen_${user.uid}`;
      localStorage.setItem(key, 'true');
      setShowGuide(false);
      setIsClosing(false);
    }, 200);
  };

  if (!showGuide) return null;

  return (
    <div style={styles.overlay}>
      <div style={{
        ...styles.modal,
        opacity: isClosing ? 0 : 1,
        transform: isClosing ? 'scale(0.95)' : 'scale(1)',
      }}>
        <button 
          style={styles.closeBtn}
          onClick={closeGuide}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#f1f5f9';
            e.currentTarget.style.transform = 'scale(1.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.transform = 'scale(1)';
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = 'scale(0.95)';
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = 'scale(1.1)';
          }}
        >
          ✕
        </button>
        
        <h2 style={styles.title}>Welcome to EasyReply! 🚀</h2>
        <p style={styles.subtitle}>Generate professional replies to Google Reviews in seconds</p>
        
        <div style={styles.stepsContainer}>
          {/* Step 1 */}
          <div style={styles.step}>
            <div style={styles.stepNumber}>1</div>
            <div style={styles.stepContent}>
              <h3 style={styles.stepTitle}>Paste Review</h3>
              <p style={styles.stepDesc}>Copy any Google Review and paste it in the input box</p>
            </div>
          </div>
          
          {/* Step 2 */}
          <div style={styles.step}>
            <div style={styles.stepNumber}>2</div>
            <div style={styles.stepContent}>
              <h3 style={styles.stepTitle}>Choose Tone</h3>
              <p style={styles.stepDesc}>Select Professional, Friendly, Apology, Short, or Long tone</p>
            </div>
          </div>
          
          {/* Step 3 */}
          <div style={styles.step}>
            <div style={styles.stepNumber}>3</div>
            <div style={styles.stepContent}>
              <h3 style={styles.stepTitle}>Generate & Copy</h3>
              <p style={styles.stepDesc}>Click Generate, then copy the reply and paste it on Google</p>
            </div>
          </div>
        </div>
        
        <button 
          style={styles.gotItBtn}
          onClick={closeGuide}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#1d4ed8';
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 20px 40px rgba(37,99,235,0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#2563eb';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 10px 30px rgba(37,99,235,0.3)';
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = 'translateY(2px)';
            e.currentTarget.style.boxShadow = '0 5px 15px rgba(37,99,235,0.3)';
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 20px 40px rgba(37,99,235,0.4)';
          }}
        >
          Got it! Start Generating →
        </button>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    animation: 'fadeIn 0.2s ease',
  },
  modal: {
    backgroundColor: 'white',
    padding: '40px',
    borderRadius: '20px',
    maxWidth: '500px',
    width: '90%',
    position: 'relative' as const,
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
    transition: 'all 0.2s ease',
  },
  closeBtn: {
    position: 'absolute' as const,
    top: '15px',
    right: '15px',
    background: 'transparent',
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer',
    color: '#64748b',
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    marginBottom: '8px',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: '16px',
    color: '#64748b',
    marginBottom: '32px',
  },
  stepsContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '24px',
    marginBottom: '32px',
  },
  step: {
    display: 'flex',
    gap: '16px',
    alignItems: 'flex-start',
    transition: 'transform 0.2s ease',
  },
  stepNumber: {
    width: '32px',
    height: '32px',
    backgroundColor: '#2563eb',
    color: 'white',
    borderRadius: '50%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontWeight: '600',
    fontSize: '16px',
    flexShrink: 0,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: '18px',
    fontWeight: '600',
    marginBottom: '4px',
    color: '#0f172a',
  },
  stepDesc: {
    fontSize: '14px',
    color: '#64748b',
    margin: 0,
  },
  gotItBtn: {
    width: '100%',
    padding: '14px',
    backgroundColor: '#2563eb',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 10px 30px rgba(37,99,235,0.3)',
  },
};

// Add global styles for animations
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
  `;
  document.head.appendChild(style);
}