// lib/openai.ts
// OpenAI setup - Sirf structure, actual call nahi

export interface GenerateOptions {
  businessName: string;
  category: string;
  tone: 'friendly' | 'formal' | 'confident';
  description: string;
  city: string;
  keywords: string[];
  language: string[];
  length: 'short' | 'medium' | 'detailed';
}

// 🔒 Safety function - word limit control
function trimToWords(text: string, maxWords: number) {
  return text.split(" ").slice(0, maxWords).join(" ");
}

// Dummy response generate karta hai - actual API call nahi
export async function generateAIReply(
  question: string,
  options: GenerateOptions
): Promise<{ text: string; error?: string }> {
  
  console.log('Generating AI reply for:', question);
  console.log('With options:', options);
  
  // Word limits (controlled length)
  const wordLimits = {
    short: 15,
    medium: 25,
    detailed: 35
  };

  // Dummy responses
  const responses = {
    short: {
      friendly: `Thanks for your question! Visit ${options.businessName} in ${options.city}. We're happy to help you anytime.`,
      formal: `Thank you for your inquiry. ${options.businessName} in ${options.city} welcomes you to visit for more information.`,
      confident: `${options.businessName} in ${options.city} is a trusted choice. Visit us today for the best experience.`
    },
    medium: {
      friendly: `Thanks for reaching out! At ${options.businessName} in ${options.city}, we always try to help our customers with the best service. Feel free to visit us anytime.`,
      formal: `Thank you for your question regarding ${options.businessName}. Located in ${options.city}, we are committed to providing reliable service to our customers.`,
      confident: `${options.businessName} is one of the most trusted places in ${options.city}. Our team focuses on quality service and customer satisfaction every day.`
    },
    detailed: {
      friendly: `Thank you for your interest in ${options.businessName}. We are located in ${options.city} and always try to provide friendly service to our customers. Feel free to visit us anytime.`,
      formal: `We appreciate your inquiry about ${options.businessName}. Our business in ${options.city} is committed to delivering dependable service and a positive customer experience.`,
      confident: `${options.businessName} continues to be a trusted choice in ${options.city}. Our focus on service quality and customer satisfaction makes us stand out locally.`
    }
  };

  // Default response
  let reply = `Thank you for your question about ${options.businessName} in ${options.city}. Please feel free to visit us for more information.`;

  try {

    const lengthResponses = responses[options.length] || responses.medium;
    const toneResponse = lengthResponses[options.tone] || lengthResponses.friendly;

    reply = toneResponse;

    // Add keywords
    if (options.keywords && options.keywords.length > 0) {
      reply += ` Known for ${options.keywords.slice(0, 2).join(', ')}.`;
    }

    // 🔒 Apply word limit
    const maxWords = wordLimits[options.length] || 25;
    reply = trimToWords(reply, maxWords);

  } catch (error) {
    console.error('AI generation error:', error);
    return {
      text: reply,
      error: 'Failed to generate AI reply'
    };
  }

  // Simulate delay
  await new Promise(resolve => setTimeout(resolve, 500));

  return { text: reply };
}