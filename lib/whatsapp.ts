// lib/whatsapp.ts
// WhatsApp setup - Future feature, abhi sirf structure

export interface WhatsAppMessage {
  to: string;
  text: string;
}

// WhatsApp config - abhi dummy
const whatsappConfig = {
  apiKey: process.env.WHATSAPP_API_KEY || 'dummy',
  phoneNumberId: process.env.WHATSAPP_PHONE_ID || 'dummy',
  apiUrl: 'https://graph.facebook.com/v17.0'
};

// Send WhatsApp message - dummy function, actual send nahi hoga
export async function sendWhatsAppMessage(message: WhatsAppMessage): Promise<boolean> {
  console.log('📱 WhatsApp message would be sent:', {
    to: message.to,
    textLength: message.text.length
  });
  
  // Dummy response
  return true;
}

// Send new question alert on WhatsApp (Pro only)
export async function sendWhatsAppQuestionAlert(
  phoneNumber: string,
  businessName: string,
  questionText: string,
  askerName: string
): Promise<boolean> {
  
  const text = `
🔔 *New Question on Google*
🏢 *${businessName}*
👤 *${askerName}* asked:
_"${questionText}"_

Reply quickly to convert this customer!
  `;
  
  return sendWhatsAppMessage({
    to: phoneNumber,
    text
  });
}

// Send high-risk alert on WhatsApp (Pro only)
export async function sendWhatsAppHighRiskAlert(
  phoneNumber: string,
  businessName: string,
  questionText: string,
  riskKeywords: string[]
): Promise<boolean> {
  
  const text = `
🚨 *HIGH RISK QUESTION DETECTED*
🏢 *${businessName}*
⚠️ *Keywords:* ${riskKeywords.join(', ')}

Question: "${questionText}"

This needs immediate attention!
  `;
  
  return sendWhatsAppMessage({
    to: phoneNumber,
    text
  });
}

// Send missed revenue alert on WhatsApp
export async function sendWhatsAppRevenueAlert(
  phoneNumber: string,
  businessName: string,
  unansweredCount: number,
  lostCustomers: string
): Promise<boolean> {
  
  const text = `
💰 *Potential Revenue Alert*
🏢 *${businessName}*
📊 *${unansweredCount} unanswered questions*
👥 *Estimated lost customers: ${lostCustomers}*

Reply to these questions to recover lost business!
  `;
  
  return sendWhatsAppMessage({
    to: phoneNumber,
    text
  });
}

// Check if WhatsApp is enabled for plan
export function isWhatsAppEnabled(plan: string): boolean {
  return plan === 'pro';
}