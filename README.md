# uganda-locations

A fast, intelligent npm package for searching Uganda's administrative units with **fuzzy matching** and **multi-location filtering**. Perfect for handling misspellings and hierarchical location queries.

## Administrative Hierarchy

Uganda's administrative structure follows this hierarchy:

```
Districts → Counties → Sub-Counties → Parishes → Villages
```

## Features

- **Fuzzy Search**: Handles misspellings and typos automatically (e.g., "Kampla" finds "Kampala")
- **Multi-Location Search**: Search with hierarchical constraints (e.g., "Nakawa in Kampala")
- **Smart Ranking**: Results ranked by relevance and hierarchical relationships
- **Fast Performance**: In-memory lookups with optimized search algorithms
- **Full Hierarchy**: Every result includes complete hierarchical information
- **TypeScript Support**: Full type definitions included
- **Lightweight**: Minified data files for optimal package size

## Installation

```bash
npm install uganda-locations
```

or

```bash
yarn add uganda-locations
```

or

```bash
pnpm add uganda-locations
```

## Usage

### Basic Fuzzy Search

```typescript
import { searchAdministrativeUnits } from 'uganda-locations';

// Search for locations (handles typos automatically)
const results = searchAdministrativeUnits('Kampla', 10);

console.log(results);
// Returns matches for "Kampala" despite the typo
```

### Multi-Location Search

```typescript
import { searchAdministrativeUnits } from 'uganda-locations';

// Find "Nakawa" within "Kampala"
const results = searchAdministrativeUnits('Nakawa in Kampala');

// Also works with other separators
const results2 = searchAdministrativeUnits('Nakawa, Kampala');
const results3 = searchAdministrativeUnits('Nakawa at Kampala');
```

### Exact Search (Legacy)

```typescript
import { exactSearchAdministrativeUnits } from 'uganda-locations';

// Exact substring matching
const results = exactSearchAdministrativeUnits('Kampala');
```

### Access Raw Data

```typescript
import {
  districts,
  counties,
  subCounties,
  parishes,
  villages
} from 'uganda-locations';

// Access all districts
console.log(districts);

// Access all counties
console.log(counties);

// etc...
```

### Get Hierarchy Information

```typescript
import {
  getDistrictHierarchy,
  getCountyHierarchy,
  getSubCountyHierarchy,
  getParishHierarchy,
  getVillageHierarchy,
  getHierarchyChain
} from 'uganda-locations';

// Get hierarchy for a specific administrative unit
const hierarchy = getDistrictHierarchy('32'); // Kampala district ID
console.log(hierarchy);
// { district: "Kampala" }

// Get full hierarchy chain
const chain = getHierarchyChain('village', 'some-village-id');
console.log(chain);
// { districtId: "...", countyId: "...", subCountyId: "...", parishId: "...", villageId: "..." }
```

## API Reference

### `searchAdministrativeUnits(query: string, maxResults?: number)`

Performs fuzzy search across all administrative levels with multi-location support.

**Parameters:**
- `query` (string): Search query (can include multiple locations separated by `,`, `in`, or `at`)
- `maxResults` (number, optional): Maximum number of results to return (default: 100)

**Returns:** Array of search results with:
```typescript
{
  type: "district" | "county" | "subCounty" | "parish" | "village";
  id: string;
  name: string;
  score: number;
  matchInfo?: {
    matchedTerms: number;
    totalTerms: number;
    confidence: string;
  };
  // ... hierarchical data (district, county, etc.)
}
```

### `exactSearchAdministrativeUnits(query: string)`

Performs exact substring search (case-insensitive).

**Parameters:**
- `query` (string): Search query

**Returns:** Array of exact matches

### Data Arrays

- `districts`: Array of all districts
- `counties`: Array of all counties
- `subCounties`: Array of all sub-counties
- `parishes`: Array of all parishes
- `villages`: Array of all villages

### Hierarchy Functions

- `getDistrictHierarchy(districtId: string)`
- `getCountyHierarchy(countyId: string)`
- `getSubCountyHierarchy(subCountyId: string)`
- `getParishHierarchy(parishId: string)`
- `getVillageHierarchy(village: Village)`
- `getHierarchyChain(type: string, id: string)`

## TypeScript Support

Full TypeScript support with exported types:

```typescript
import type {
  District,
  County,
  SubCounty,
  Parish,
  Village,
  SearchResult
} from 'uganda-locations';
```

## Examples

### Example 1: Autocomplete Search

```typescript
import { searchAdministrativeUnits } from 'uganda-locations';

function autocomplete(userInput: string) {
  // Get top 5 results
  const results = searchAdministrativeUnits(userInput, 5);

  return results.map(r => ({
    label: r.name,
    type: r.type,
    fullPath: [r.village, r.parish, r.subCounty, r.county, r.district]
      .filter(Boolean)
      .join(', ')
  }));
}

console.log(autocomplete('Kam'));
// Returns top 5 matches for "Kam" (e.g., Kampala, Kamuli, etc.)
```

### Example 2: Hierarchical Filter

```typescript
import { searchAdministrativeUnits } from 'uganda-locations';

function findVillagesInDistrict(villageName: string, districtName: string) {
  const results = searchAdministrativeUnits(`${villageName} in ${districtName}`);

  // Filter to only villages
  return results.filter(r => r.type === 'village');
}

const villages = findVillagesInDistrict('Nakawa', 'Kampala');
console.log(villages);
```

### Example 3: Get All Units in a District

```typescript
import { counties, subCounties, parishes, villages } from 'uganda-locations';

function getAllUnitsInDistrict(districtId: string) {
  const districtCounties = counties.filter(c => c.district === districtId);
  const countyIds = districtCounties.map(c => c.id);

  const districtSubCounties = subCounties.filter(s =>
    countyIds.includes(s.county)
  );

  // ... and so on for parishes and villages

  return {
    counties: districtCounties,
    subCounties: districtSubCounties,
    // ...
  };
}
```

## Search Algorithm

### Fuzzy Matching

- Uses **Fuse.js** library for intelligent fuzzy string matching
- **Threshold**: 0.4 (balances precision and recall)
- Handles:
  - Typos and misspellings
  - Missing characters
  - Extra characters
  - Transposed characters

### Multi-Location Filtering

1. **Parse**: Splits query by separators (comma, "in", "at")
2. **Search**: Fuzzy search each term independently
3. **Filter**: Check hierarchical relationships
4. **Rank**:
   - Results matching more terms rank higher
   - Hierarchically related results get 1.5x score boost
   - Final score = (average fuzzy score) × (hierarchy bonus) × (term match ratio)

### Match Confidence Scores

- `> 1.0`: Excellent match with hierarchical relationship
- `0.7 - 1.0`: Good fuzzy match
- `0.5 - 0.7`: Fair match (may have typos)
- `< 0.5`: Weak match

## Data Structure

The package includes minified JSON data files:

- `data/districts.json` - All districts in Uganda (~4KB)
- `data/counties.json` - Counties with parent districts (~17KB)
- `data/sub_counties.json` - Sub-counties with parent counties (~101KB)
- `data/parishes.json` - Parishes with parent sub-counties (~516KB)
- `data/villages.json` - Villages with parent parishes (~3.4MB)

Total package size: ~4MB (minified)

## Performance

- **In-memory Maps**: O(1) lookups for hierarchical data
- **Fuzzy Search**: Optimized with Fuse.js indexing
- **Suitable for**: Datasets with 100k+ records
- **No database required**: All data loaded in memory

## Use Cases

- Location autocomplete in forms
- Address validation
- Geographic data filtering
- Location-based search
- Administrative unit lookups
- Hierarchical location selection

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

For issues and questions, please use the GitHub issue tracker.
