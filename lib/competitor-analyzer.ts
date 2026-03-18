// lib/competitor-analyzer.ts
// Competitor analysis functions

import { adminDb } from './firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export interface CompetitorData {
  name: string;
  placeId: string;
  url: string;
  addedAt: string;
  lastFetched: string | null;
  stats: {
    totalQuestions: number;
    avgResponseTime: number;
    recentReplies: Array<{
      question: string;
      answer: string;
      time: string;
      date: Date;
    }>;
  };
}

export interface ComparisonResult {
  yourAvgResponseTime: number;
  competitorAvgResponseTime: number;
  difference: number; // in hours
  youAreFaster: boolean;
  percentile: number; // 0-100
}

// Dummy function to fetch competitor data (would use Google Places API in production)
export async function fetchCompetitorData(placeId: string): Promise<Partial<CompetitorData['stats']>> {
  console.log(`Fetching competitor data for placeId: ${placeId}`);
  
  // Dummy data for now
  return {
    totalQuestions: Math.floor(Math.random() * 50) + 10,
    avgResponseTime: Math.floor(Math.random() * 24) + 2, // 2-26 hours
    recentReplies: [
      {
        question: "Do you offer home delivery?",
        answer: "Yes, we offer fast delivery in your area.",
        time: "2 hours ago",
        date: new Date()
      },
      {
        question: "What are your opening hours?",
        answer: "We're open 9am to 9pm daily.",
        time: "1 day ago",
        date: new Date(Date.now() - 86400000)
      }
    ]
  };
}

// Update competitor stats
export async function updateCompetitorStats(uid: string, placeId: string): Promise<void> {
  const userRef = adminDb.collection('users').doc(uid);
  const userDoc = await userRef.get();
  const userData = userDoc.data();
  
  const competitors = userData?.competitors || [];
  const competitorIndex = competitors.findIndex((c: any) => c.placeId === placeId);
  
  if (competitorIndex === -1) return;
  
  const competitor = competitors[competitorIndex];
  const newStats = await fetchCompetitorData(placeId);
  
  competitor.stats = {
    ...competitor.stats,
    ...newStats,
    lastUpdated: new Date().toISOString()
  };
  
  competitor.lastFetched = new Date().toISOString();
  
  competitors[competitorIndex] = competitor;
  
  await userRef.update({
    competitors
  });
}

// Compare your response time with competitor
export function compareResponseTime(
  yourTime: number,
  competitorTime: number
): ComparisonResult {
  const diff = competitorTime - yourTime;
  
  return {
    yourAvgResponseTime: yourTime,
    competitorAvgResponseTime: competitorTime,
    difference: Math.abs(diff),
    youAreFaster: diff > 0,
    percentile: calculatePercentile(yourTime, competitorTime)
  };
}

// Calculate percentile (simplified)
function calculatePercentile(yourTime: number, competitorTime: number): number {
  if (yourTime < competitorTime) {
    // You're faster
    return Math.min(95, Math.floor(70 + (competitorTime - yourTime) * 2));
  } else {
    // You're slower
    return Math.max(20, Math.floor(50 - (yourTime - competitorTime) * 2));
  }
}

// Get fastest competitor
export function getFastestCompetitor(competitors: CompetitorData[]): CompetitorData | null {
  if (competitors.length === 0) return null;
  
  return competitors.reduce((fastest, current) => {
    if (!fastest) return current;
    return (current.stats.avgResponseTime < fastest.stats.avgResponseTime) ? current : fastest;
  }, competitors[0]);
}

// Get response speed rank message
export function getSpeedRankMessage(
  yourTime: number,
  competitors: CompetitorData[]
): string {
  if (competitors.length === 0) {
    return "Add competitors to compare your response speed";
  }
  
  const fastest = getFastestCompetitor(competitors);
  if (!fastest) return "Unable to compare";
  
  const comparison = compareResponseTime(yourTime, fastest.stats.avgResponseTime);
  
  if (comparison.youAreFaster) {
    return `You're faster than your fastest competitor by ${comparison.difference.toFixed(1)} hours`;
  } else {
    return `${fastest.name} responds ${comparison.difference.toFixed(1)} hours faster than you`;
  }
}