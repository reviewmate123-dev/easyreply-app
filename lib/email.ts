// lib/email.ts
// Email service setup - actual send nahi hoga abhi, sirf structure

export interface EmailData {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface AlertData {
  userId: string;
  userEmail: string;
  businessName: string;
  type: 'new_review' | 'new_question' | 'no_reply_24h' | 'missed_revenue' | 'high_risk' | 'competitor_alert';
  data: any;
}

// Email templates
const emailTemplates = {
  new_review: {
    subject: (businessName: string) => `📝 New Review Received for ${businessName}`,
    text: (data: any) => `
You have received a new ${data.rating}-star review on Google.

Review: "${data.reviewText}"

Click here to view and reply: ${data.replyLink}

- EasyReply Team
    `,
    html: (data: any) => `
<h2>📝 New Review Received</h2>
<p>You have received a new <strong>${data.rating}-star</strong> review on Google.</p>
<div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 15px 0;">
  <p style="font-style: italic;">"${data.reviewText}"</p>
</div>
<p>
  <a href="${data.replyLink}" style="background: #4f46e5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
    View & Reply
  </a>
</p>
<p style="color: #6b7280; font-size: 12px; margin-top: 20px;">- EasyReply Team</p>
    `
  },
  
  new_question: {
    subject: (businessName: string) => `❓ New Question on Google for ${businessName}`,
    text: (data: any) => `
A customer just asked a question on your Google Business Profile.

Question: "${data.questionText}"
Asked by: ${data.askerName}

Reply quickly to avoid losing this customer: ${data.replyLink}

- EasyReply Team
    `,
    html: (data: any) => `
<h2>❓ New Customer Question</h2>
<p>A customer just asked a question on your Google Business Profile.</p>
<div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 15px 0;">
  <p style="font-weight: bold;">Question:</p>
  <p style="font-style: italic;">"${data.questionText}"</p>
  <p style="color: #6b7280; font-size: 14px;">- ${data.askerName}</p>
</div>
<p>
  <a href="${data.replyLink}" style="background: #4f46e5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
    Reply Now
  </a>
</p>
<p style="color: #6b7280; font-size: 12px;">Quick replies help convert customers!</p>
    `
  },
  
  no_reply_24h: {
    subject: (businessName: string) => `⚠️ 24 Hours - No Reply to Customer Question`,
    text: (data: any) => `
A question on your Google profile has been unanswered for 24 hours.

Question: "${data.questionText}"
Asked by: ${data.askerName}

Customers expect quick responses. Reply now: ${data.replyLink}

- EasyReply Team
    `,
    html: (data: any) => `
<h2>⚠️ 24 Hours Without Reply</h2>
<p>A question on your Google profile has been unanswered for 24 hours.</p>
<div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 15px 0;">
  <p style="font-style: italic;">"${data.questionText}"</p>
  <p style="color: #6b7280;">- ${data.askerName}</p>
</div>
<p>Customers expect quick responses. Don't lose this potential customer.</p>
<p>
  <a href="${data.replyLink}" style="background: #4f46e5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
    Reply Now
  </a>
</p>
    `
  },
  
  missed_revenue: {
    subject: (businessName: string, data: any) => `💰 ${data.lostCustomers} Potential Customers Lost?`,
    text: (data: any) => `
We detected ${data.unansweredCount} unanswered questions on your Google profile.

Estimated impact: ${data.lostCustomers} potential customers lost.

Reply to these questions to recover lost business: ${data.dashboardLink}

- EasyReply Team
    `,
    html: (data: any) => `
<h2>💰 Potential Revenue Alert</h2>
<p>We detected <strong>${data.unansweredCount} unanswered questions</strong> on your Google profile.</p>
<div style="background: #fee2e2; padding: 15px; border-radius: 8px; margin: 15px 0;">
  <p style="font-size: 18px; font-weight: bold; color: #dc2626;">
    Estimated impact: ${data.lostCustomers} potential customers lost
  </p>
</div>
<p>
  <a href="${data.dashboardLink}" style="background: #4f46e5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
    View & Reply
  </a>
</p>
    `
  },
  
  high_risk: {
    subject: (businessName: string) => `🚨 High-Risk Question Detected`,
    text: (data: any) => `
We detected a high-risk question that may affect your conversions.

Question: "${data.questionText}"
Detected keywords: ${data.riskKeywords.join(', ')}

Suggested calming reply: 
"${data.suggestedReply}"

Reply carefully: ${data.replyLink}

- EasyReply Team
    `,
    html: (data: any) => `
<h2 style="color: #dc2626;">🚨 High-Risk Question Detected</h2>
<p>We detected a high-risk question that may affect your conversions.</p>
<div style="background: #fee2e2; padding: 15px; border-radius: 8px; margin: 15px 0;">
  <p style="font-style: italic;">"${data.questionText}"</p>
  <p style="color: #dc2626; font-size: 14px;">Detected keywords: ${data.riskKeywords.join(', ')}</p>
</div>
<div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 15px 0;">
  <p style="font-weight: bold;">Suggested calming reply:</p>
  <p style="font-style: italic;">"${data.suggestedReply}"</p>
</div>
<p>
  <a href="${data.replyLink}" style="background: #4f46e5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
    Reply Now
  </a>
</p>
    `
  },

  // ✅ NEW: Competitor Alert Template
  competitor_alert: {
    subject: (businessName: string) => `🎯 Competitor Alert: Similar Question Answered`,
    text: (data: any) => `
Your competitor ${data.competitorName} just answered a question similar to yours.

Competitor's Question: "${data.competitorQuestion}"
Their Answer: "${data.competitorAnswer}"
Time: ${data.time}

Your similar unanswered question: "${data.yourQuestion}"

Don't let them get ahead. Reply now: ${data.replyLink}

- EasyReply Team
    `,
    html: (data: any) => `
<h2 style="color: #4f46e5;">🎯 Competitor Alert</h2>
<p>Your competitor <strong>${data.competitorName}</strong> just answered a question similar to yours.</p>

<div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 15px 0;">
  <p style="font-weight: bold;">Competitor's Question:</p>
  <p style="font-style: italic;">"${data.competitorQuestion}"</p>
  <p style="font-weight: bold; margin-top: 10px;">Their Answer:</p>
  <p style="font-style: italic;">"${data.competitorAnswer}"</p>
  <p style="color: #6b7280; font-size: 12px; margin-top: 10px;">${data.time}</p>
</div>

<div style="background: #fee2e2; padding: 15px; border-radius: 8px; margin: 15px 0;">
  <p style="font-weight: bold;">Your Unanswered Question:</p>
  <p style="font-style: italic;">"${data.yourQuestion}"</p>
</div>

<p>
  <a href="${data.replyLink}" style="background: #4f46e5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
    Reply Now
  </a>
</p>
    `
  }
};

// Send email - dummy function abhi, actual send nahi hoga
export async function sendEmail(emailData: EmailData): Promise<{ success: boolean; messageId?: string; error?: string }> {
  console.log('📧 Email would be sent:', {
    to: emailData.to,
    subject: emailData.subject,
    textLength: emailData.text.length
  });
  
  // Dummy response - actual email nahi jayega
  return {
    success: true,
    messageId: `dummy-${Date.now()}`
  };
}

// Send alert based on type
export async function sendAlert(alertData: AlertData): Promise<boolean> {
  const template = emailTemplates[alertData.type];
  
  if (!template) {
    console.error('Unknown alert type:', alertData.type);
    return false;
  }

  let subject: string;
  if (alertData.type === 'missed_revenue') {
    subject = template.subject(alertData.businessName, alertData.data);
  } else {
    subject = template.subject(alertData.businessName || 'Your Business', alertData.data);
  }
  
  const text = template.text(alertData.data);
  const html = template.html(alertData.data);

  const result = await sendEmail({
    to: alertData.userEmail,
    subject,
    text,
    html
  });

  if (result.success) {
    console.log(`✅ Alert sent: ${alertData.type} to ${alertData.userEmail}`);
  } else {
    console.error(`❌ Alert failed: ${alertData.type}`, result.error);
  }

  return result.success;
}

// New Review Alert (All Plans)
export async function sendNewReviewAlert(
  userEmail: string,
  businessName: string,
  reviewData: {
    rating: number;
    reviewText: string;
    replyLink: string;
  }
): Promise<boolean> {
  return sendAlert({
    userId: 'temp',
    userEmail,
    businessName,
    type: 'new_review',
    data: reviewData
  });
}

// New Q&A Alert (Growth & Pro)
export async function sendNewQuestionAlert(
  userEmail: string,
  businessName: string,
  questionData: {
    questionText: string;
    askerName: string;
    replyLink: string;
  }
): Promise<boolean> {
  return sendAlert({
    userId: 'temp',
    userEmail,
    businessName,
    type: 'new_question',
    data: questionData
  });
}

// 24hr No Reply Warning
export async function sendNoReplyAlert(
  userEmail: string,
  businessName: string,
  questionData: {
    questionText: string;
    askerName: string;
    replyLink: string;
  }
): Promise<boolean> {
  return sendAlert({
    userId: 'temp',
    userEmail,
    businessName,
    type: 'no_reply_24h',
    data: questionData
  });
}

// Missed Revenue Alert
export async function sendMissedRevenueAlert(
  userEmail: string,
  businessName: string,
  data: {
    unansweredCount: number;
    lostCustomers: string;
    dashboardLink: string;
  }
): Promise<boolean> {
  return sendAlert({
    userId: 'temp',
    userEmail,
    businessName,
    type: 'missed_revenue',
    data
  });
}

// High Risk Alert
export async function sendHighRiskAlert(
  userEmail: string,
  businessName: string,
  data: {
    questionText: string;
    riskKeywords: string[];
    suggestedReply: string;
    replyLink: string;
  }
): Promise<boolean> {
  return sendAlert({
    userId: 'temp',
    userEmail,
    businessName,
    type: 'high_risk',
    data
  });
}

// ✅ NEW: Competitor Alert (Pro only)
export async function sendCompetitorAlert(
  userEmail: string,
  businessName: string,
  data: {
    competitorName: string;
    competitorQuestion: string;
    competitorAnswer: string;
    time: string;
    yourQuestion: string;
    replyLink: string;
  }
): Promise<boolean> {
  return sendAlert({
    userId: 'temp',
    userEmail,
    businessName,
    type: 'competitor_alert',
    data
  });
}