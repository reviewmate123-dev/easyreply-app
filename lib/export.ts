// lib/export.ts
// CSV/PDF export functions

export interface ExportData {
  questions: any[];
  reviews: any[];
  dateRange: {
    start: Date;
    end: Date;
  };
}

// Export to CSV
export function exportToCSV(data: any[], filename: string): void {
  if (data.length === 0) {
    alert('No data to export');
    return;
  }

  // Get headers from first object
  const headers = Object.keys(data[0]).filter(key => 
    !key.includes('timestamp') && 
    !key.includes('id') &&
    typeof data[0][key] !== 'object'
  );

  // Create CSV rows
  const csvRows = [];
  csvRows.push(headers.join(','));

  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header] || '';
      // Escape commas and quotes
      return `"${String(value).replace(/"/g, '""')}"`;
    });
    csvRows.push(values.join(','));
  }

  // Download CSV
  const csvString = csvRows.join('\n');
  const blob = new Blob([csvString], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.setAttribute('href', url);
  a.setAttribute('download', `${filename}.csv`);
  a.click();
}

// Export to PDF (dummy - will need library)
export function exportToPDF(data: any[], filename: string): void {
  alert('PDF export will be available with Pro plan');
}

// Format data for export
export function formatQuestionsForExport(questions: any[]): any[] {
  return questions.map(q => ({
    'Question': q.text,
    'Asked By': q.askerName,
    'Status': q.status,
    'AI Reply': q.aiReply || '',
    'Created At': q.createdAt?.toDate?.().toLocaleString() || new Date(q.createdAt).toLocaleString(),
    'Answered At': q.answeredAt?.toDate?.().toLocaleString() || '',
    'Risk Level': q.riskLevel || 'low'
  }));
}

// Generate weekly report data
export function generateWeeklyReport(analytics: any): string {
  return `
    Weekly Reputation Report
    =======================
    
    Period: Last 7 days
    
    Overview:
    - Total Questions: ${analytics.totalQuestions}
    - Answered: ${analytics.answeredQuestions}
    - Unanswered: ${analytics.unansweredQuestions}
    
    Response Time:
    - Average: ${analytics.avgResponseTime} hours
    - Rank: Top ${analytics.responseSpeedRank}%
    
    Revenue Impact:
    - Lost Customers Estimate: ${analytics.lostCustomers}
    - Estimated Loss: ${analytics.estimatedRevenue}
    
    Sentiment:
    - Positive: ${analytics.sentimentBreakdown.positive}%
    - Neutral: ${analytics.sentimentBreakdown.neutral}%
    - Negative: ${analytics.sentimentBreakdown.negative}%
    
    Health Score: ${analytics.healthScore}/100
    
    Generated on: ${new Date().toLocaleString()}
  `;
}