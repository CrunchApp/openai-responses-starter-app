/**
 * Helper module to fetch accurate program page links using Google Custom Search API
 */

export async function fetchProgramPageLink(programName: string, institutionName: string): Promise<string> {
  const apiKey = process.env.GOOGLE_API_KEY;
  const cx = process.env.GOOGLE_CX;
  if (!apiKey || !cx) {
    console.warn('Missing Google Custom Search credentials (GOOGLE_API_KEY or GOOGLE_CX)');
    return '';
  }

  // Construct query combining program name and institution
  const query = `${programName} ${institutionName}`;
  const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(query)}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`Google Custom Search API error: ${res.status} ${res.statusText}`);
      return '';
    }
    const data = await res.json();
    const items = data.items as Array<{ link: string; title: string; displayLink: string }>;
    if (!items || items.length === 0) {
      console.warn(`No search results found for query: ${query}`);
      return '';
    }

    // Heuristic: prioritize results whose title or link includes the program name
    const lowerProgram = programName.toLowerCase();
    const filtered = items.filter(item =>
      item.title.toLowerCase().includes(lowerProgram) ||
      item.link.toLowerCase().includes(lowerProgram)
    );

    const chosen = filtered.length > 0 ? filtered[0] : items[0];
    return chosen.link;
  } catch (error) {
    console.error('Error fetching Google Custom Search results:', error);
    return '';
  }
} 