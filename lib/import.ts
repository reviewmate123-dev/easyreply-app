// lib/import.ts
// CSV import functions (Pro only)

export interface ImportResult {
  success: boolean;
  imported: number;
  failed: number;
  errors: string[];
}

// Parse CSV string to array
export function parseCSV(csvText: string): any[] {
  const lines = csvText.split('\n');
  const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
  
  const results = [];
  
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    
    const values = lines[i].split(',').map(v => v.replace(/"/g, '').trim());
    const row: any = {};
    
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    
    results.push(row);
  }
  
  return results;
}

// Validate imported data
export function validateImportData(data: any[]): ImportResult {
  const errors: string[] = [];
  let validCount = 0;
  
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    
    // Check required fields
    if (!row.Question && !row.question) {
      errors.push(`Row ${i + 1}: Missing question text`);
      continue;
    }
    
    validCount++;
  }
  
  return {
    success: errors.length === 0,
    imported: validCount,
    failed: errors.length,
    errors
  };
}

// Import questions from CSV
export async function importQuestionsFromCSV(
  csvText: string,
  uid: string,
  locationId: string
): Promise<ImportResult> {
  
  const data = parseCSV(csvText);
  const validation = validateImportData(data);
  
  if (!validation.success) {
    return validation;
  }
  
  // Here you would save to Firestore
  console.log(`Importing ${data.length} questions for user ${uid}`);
  
  return {
    success: true,
    imported: data.length,
    failed: 0,
    errors: []
  };
}