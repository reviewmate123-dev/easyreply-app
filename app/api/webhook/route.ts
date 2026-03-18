// app/api/webhook/route.ts - FIXED VERSION
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    // =============================
    // 1. GET WEBHOOK SIGNATURE
    // =============================
    const body = await request.text();
    const signature = request.headers.get('x-razorpay-signature');

    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    // =============================
    // 2. VERIFY WEBHOOK SIGNATURE
    // =============================
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    
    if (!secret) {
      console.error('❌ Webhook secret not configured');
      return NextResponse.json({ error: 'Webhook secret missing' }, { status: 500 });
    }

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');

    if (signature !== expectedSignature) {
      console.error('❌ Invalid webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    console.log('✅ Webhook signature verified');

    // =============================
    // 3. PARSE WEBHOOK EVENT
    // =============================
    const event = JSON.parse(body);
    
    console.log('📨 Webhook event:', event.event);

    // =============================
    // 4. HANDLE DIFFERENT EVENTS
    // =============================
    switch (event.event) {
      case 'payment.captured':
        await handlePaymentCaptured(event.payload.payment.entity);
        break;
        
      case 'payment.failed':
        await handlePaymentFailed(event.payload.payment.entity);
        break;
        
      case 'order.paid':
        await handleOrderPaid(event.payload.order.entity);
        break;
        
      default:
        console.log('Unhandled event type:', event.event);
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('❌ Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

// =============================
// EVENT HANDLERS
// =============================

async function handlePaymentCaptured(payment: any) {
  try {
    const orderId = payment.order_id;
    const paymentId = payment.id;
    
    console.log(`💰 Payment captured: ${paymentId} for order: ${orderId}`);

    // Check if already processed
    const existingTxn = await adminDb.collection('creditTransactions')
      .where('paymentId', '==', paymentId)
      .get();

    if (!existingTxn.empty) {
      console.log('Payment already processed');
      return;
    }

    // Get order details
    const orderRef = adminDb.collection('paymentOrders').doc(orderId);
    const orderDoc = await orderRef.get();

    if (!orderDoc.exists) {
      console.error('Order not found:', orderId);
      return;
    }

    const orderData = orderDoc.data();
    
    // ✅ FIX: Check if orderData exists
    if (!orderData) {
      console.error('Order data is empty for:', orderId);
      return;
    }

    // Process in transaction
    await adminDb.runTransaction(async (transaction) => {
      // Update order
      transaction.update(orderRef, {
        status: 'completed',
        paymentId,
        completedAt: FieldValue.serverTimestamp(),
      });

      // Add credits to user
      const userRef = adminDb.collection('users').doc(orderData.uid);
      transaction.update(userRef, {
        credits: FieldValue.increment(orderData.credits || 0),
      });

      // Log transaction
      const txnRef = adminDb.collection('creditTransactions').doc();
      transaction.set(txnRef, {
        uid: orderData.uid,
        amount: orderData.credits || 0,
        type: 'purchase',
        action: 'bulk',
        paymentId,
        orderId,
        timestamp: FieldValue.serverTimestamp(),
        source: 'webhook',
      });
    });

    console.log(`✅ Credits added for user: ${orderData.uid}`);

  } catch (error) {
    console.error('Error in handlePaymentCaptured:', error);
  }
}

async function handlePaymentFailed(payment: any) {
  try {
    const orderId = payment.order_id;
    
    console.log(`❌ Payment failed for order: ${orderId}`);

    await adminDb.collection('paymentOrders').doc(orderId).update({
      status: 'failed',
      error: payment.error_description || 'Payment failed',
      failedAt: FieldValue.serverTimestamp(),
    });

  } catch (error) {
    console.error('Error in handlePaymentFailed:', error);
  }
}

async function handleOrderPaid(order: any) {
  try {
    console.log(`✅ Order paid: ${order.id}`);
    
    // Order paid event - can be used for additional processing
    // Credits will be added in payment.captured handler

  } catch (error) {
    console.error('Error in handleOrderPaid:', error);
  }
}