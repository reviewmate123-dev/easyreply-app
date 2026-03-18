// lib/credit-transactions.ts
// Atomic transactions ke liye helper functions

import { db } from './firebase';
import { doc, runTransaction } from 'firebase/firestore';

export async function deductCredits(
  uid: string,
  amount: number,
  action: 'review' | 'qa' | 'regenerate' | 'bulk',
  questionId?: string
): Promise<boolean> {
  
  try {
    await runTransaction(db, async (transaction) => {
      const userRef = doc(db, 'users', uid);
      const userDoc = await transaction.get(userRef);
      
      if (!userDoc.exists()) {
        throw new Error('User not found');
      }
      
      const currentCredits = userDoc.data().credits || 0;
      
      if (currentCredits < amount) {
        throw new Error('Insufficient credits');
      }
      
      transaction.update(userRef, {
        credits: currentCredits - amount
      });
      
      // Log transaction
      const txnRef = doc(db, 'creditTransactions', `${uid}_${Date.now()}`);
      transaction.set(txnRef, {
        uid,
        amount: -amount,
        type: 'usage',
        action,
        questionId,
        timestamp: new Date()
      });
    });
    
    return true;
  } catch (error) {
    console.error('Credit deduction failed:', error);
    return false;
  }
}

export async function addCredits(
  uid: string,
  amount: number,
  paymentId?: string
): Promise<boolean> {
  
  try {
    await runTransaction(db, async (transaction) => {
      const userRef = doc(db, 'users', uid);
      const userDoc = await transaction.get(userRef);
      
      const currentCredits = userDoc.exists() ? (userDoc.data().credits || 0) : 0;
      
      transaction.set(userRef, {
        credits: currentCredits + amount
      }, { merge: true });
      
      // Log transaction
      const txnRef = doc(db, 'creditTransactions', `${uid}_${Date.now()}`);
      transaction.set(txnRef, {
        uid,
        amount,
        type: 'purchase',
        paymentId,
        timestamp: new Date()
      });
    });
    
    return true;
  } catch (error) {
    console.error('Credit addition failed:', error);
    return false;
  }
}