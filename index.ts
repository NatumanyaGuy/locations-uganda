import Fuse from "fuse.js";
import type { IFuseOptions } from "fuse.js";
import districts from "./data/districts.json";
import counties from "./data/counties.json";
import subCounties from "./data/sub_counties.json";
import parishes from "./data/parishes.json";
import villages from "./data/villages.json";

interface District {
  id: string;
  name: string;
}

interface County {
  id: string;
  name: string;
  district: string;
}

interface SubCounty {
  id: string;
  name: string;
  county: string;
}

interface Parish {
  id: string;
  name: string;
  subcounty: string;
}

interface Village {
  id: string;
  name: string;
  parish: string;
}

interface SearchResult {
  type: "district" | "county" | "subCounty" | "parish" | "village";
  id: string;
  name: string;
  score: number;
  matchedTerm?: string;
  [key: string]: any;
}

// Build lookup maps
const districtMap = new Map<string, District>();
const countyMap = new Map<string, County>();
const subCountyMap = new Map<string, SubCounty>();
const parishMap = new Map<string, Parish>();

districts.forEach((d) => districtMap.set(d.id, d));
counties.forEach((c) => countyMap.set(c.id, c));
subCounties.forEach((s) => subCountyMap.set(s.id, s));
parishes.forEach((p) => parishMap.set(p.id, p));

// Configure Fuse.js options for fuzzy matching
const fuseOptions: IFuseOptions<any> = {
  keys: ["name"],
  threshold: 0.4, // 0.0 = perfect match, 1.0 = match anything
  distance: 100,
  minMatchCharLength: 2,
  includeScore: true,
  ignoreLocation: true,
};

// Create Fuse instances for each administrative level
const districtFuse = new Fuse(districts, fuseOptions);
const countyFuse = new Fuse(counties, fuseOptions);
const subCountyFuse = new Fuse(subCounties, fuseOptions);
const parishFuse = new Fuse(parishes, fuseOptions);
const villageFuse = new Fuse(villages, fuseOptions);

function getDistrictHierarchy(districtId: string) {
  const district = districtMap.get(districtId);
  return district ? { district: district.name } : {};
}

function getCountyHierarchy(countyId: string) {
  const county = countyMap.get(countyId);
  if (!county) return {};

  const district = districtMap.get(county.district);
  return {
    county: county.name,
    district: district?.name,
  };
}

function getSubCountyHierarchy(subCountyId: string) {
  const subCounty = subCountyMap.get(subCountyId);
  if (!subCounty) return {};

  const county = countyMap.get(subCounty.county);
  const district = county ? districtMap.get(county.district) : null;

  return {
    subCounty: subCounty.name,
    county: county?.name,
    district: district?.name,
  };
}

function getParishHierarchy(parishId: string) {
  const parish = parishMap.get(parishId);
  if (!parish) return {};

  const subCounty = subCountyMap.get(parish.subcounty);
  const county = subCounty ? countyMap.get(subCounty.county) : null;
  const district = county ? districtMap.get(county.district) : null;

  return {
    parish: parish.name,
    subCounty: subCounty?.name,
    county: county?.name,
    district: district?.name,
  };
}

function getVillageHierarchy(village: Village) {
  const parish = parishMap.get(village.parish);
  const subCounty = parish ? subCountyMap.get(parish.subcounty) : null;
  const county = subCounty ? countyMap.get(subCounty.county) : null;
  const district = county ? districtMap.get(county.district) : null;

  return {
    village: village.name,
    parish: parish?.name,
    subCounty: subCounty?.name,
    county: county?.name,
    district: district?.name,
  };
}

// Get the full hierarchy chain for any administrative unit
function getHierarchyChain(
  type: string,
  id: string
): {
  districtId?: string;
  countyId?: string;
  subCountyId?: string;
  parishId?: string;
  villageId?: string;
} {
  switch (type) {
    case "district":
      return { districtId: id };

    case "county": {
      const county = countyMap.get(id);
      return county
        ? {
            districtId: county.district,
            countyId: id,
          }
        : {};
    }

    case "subCounty": {
      const subCounty = subCountyMap.get(id);
      if (!subCounty) return {};
      const county = countyMap.get(subCounty.county);
      return {
        districtId: county?.district,
        countyId: subCounty.county,
        subCountyId: id,
      };
    }

    case "parish": {
      const parish = parishMap.get(id);
      if (!parish) return {};
      const subCounty = subCountyMap.get(parish.subcounty);
      const county = subCounty ? countyMap.get(subCounty.county) : null;
      return {
        districtId: county?.district,
        countyId: subCounty?.county,
        subCountyId: parish.subcounty,
        parishId: id,
      };
    }

    case "village": {
      const village = villages.find((v) => v.id === id);
      if (!village) return {};
      const parish = parishMap.get(village.parish);
      const subCounty = parish ? subCountyMap.get(parish.subcounty) : null;
      const county = subCounty ? countyMap.get(subCounty.county) : null;
      return {
        districtId: county?.district,
        countyId: subCounty?.county,
        subCountyId: parish?.subcounty,
        parishId: village.parish,
        villageId: id,
      };
    }

    default:
      return {};
  }
}

// Check if two administrative units are hierarchically related
function areRelated(result1: SearchResult, result2: SearchResult): boolean {
  const chain1 = getHierarchyChain(result1.type, result1.id);
  const chain2 = getHierarchyChain(result2.type, result2.id);

  // Check if one is a parent/ancestor of the other
  return Boolean(
    (chain1.districtId && chain1.districtId === chain2.districtId) ||
    (chain1.countyId && chain1.countyId === chain2.countyId) ||
    (chain1.subCountyId && chain1.subCountyId === chain2.subCountyId) ||
    (chain1.parishId && chain1.parishId === chain2.parishId)
  );
}

// Fuzzy search a single term across all administrative levels
function fuzzySearchSingleTerm(
  term: string,
  maxResults: number = 50
): SearchResult[] {
  const results: SearchResult[] = [];

  // Search districts
  districtFuse.search(term, { limit: maxResults }).forEach((result) => {
    results.push({
      type: "district",
      id: result.item.id,
      name: result.item.name,
      score: 1 - (result.score || 0), // Convert to similarity score
      matchedTerm: term,
      ...getDistrictHierarchy(result.item.id),
    });
  });

  // Search counties
  countyFuse.search(term, { limit: maxResults }).forEach((result) => {
    results.push({
      type: "county",
      id: result.item.id,
      name: result.item.name,
      score: 1 - (result.score || 0),
      matchedTerm: term,
      ...getCountyHierarchy(result.item.id),
    });
  });

  // Search sub-counties
  subCountyFuse.search(term, { limit: maxResults }).forEach((result) => {
    results.push({
      type: "subCounty",
      id: result.item.id,
      name: result.item.name,
      score: 1 - (result.score || 0),
      matchedTerm: term,
      ...getSubCountyHierarchy(result.item.id),
    });
  });

  // Search parishes
  parishFuse.search(term, { limit: maxResults }).forEach((result) => {
    results.push({
      type: "parish",
      id: result.item.id,
      name: result.item.name,
      score: 1 - (result.score || 0),
      matchedTerm: term,
      ...getParishHierarchy(result.item.id),
    });
  });

  // Search villages
  villageFuse.search(term, { limit: maxResults }).forEach((result) => {
    results.push({
      type: "village",
      id: result.item.id,
      name: result.item.name,
      score: 1 - (result.score || 0),
      matchedTerm: term,
      ...getVillageHierarchy(result.item),
    });
  });

  return results;
}

// Parse query into multiple location terms
function parseQuery(query: string): string[] {
  // Split by common separators: comma, semicolon, "in", "at"
  const separators = /[,;]|\s+in\s+|\s+at\s+/i;
  return query
    .split(separators)
    .map((term) => term.trim())
    .filter((term) => term.length > 0);
}

// Multi-location search with hierarchical filtering
function searchAdministrativeUnits(query: string, maxResults: number = 100) {
  const terms = parseQuery(query);

  // If single term, use simple fuzzy search
  if (terms.length === 1) {
    return fuzzySearchSingleTerm(terms[0], maxResults)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults);
  }

  // Multi-term search: find matches for each term
  const termResults = terms.map((term) => ({
    term,
    matches: fuzzySearchSingleTerm(term, 30),
  }));

  const combinedResults: Array<
    SearchResult & {
      matchCount: number;
      hierarchyBonus: number;
      combinedScore: number;
    }
  > = [];

  // For each result in the first term
  termResults[0].matches.forEach((firstResult) => {
    let matchCount = 1;
    let totalScore = firstResult.score;
    let hierarchyBonus = 1.0;

    // Check if it matches with results from other terms
    const relatedMatches = [firstResult];

    for (let i = 1; i < termResults.length; i++) {
      const otherTermMatches = termResults[i].matches;
      const relatedMatch = otherTermMatches.find((r) =>
        areRelated(firstResult, r)
      );

      if (relatedMatch) {
        matchCount++;
        totalScore += relatedMatch.score;
        hierarchyBonus = 1.5; // Boost score for hierarchically related matches
        relatedMatches.push(relatedMatch);
      }
    }

    // Calculate combined score
    const avgScore = totalScore / terms.length;
    const combinedScore =
      avgScore * hierarchyBonus * (matchCount / terms.length);

    combinedResults.push({
      ...firstResult,
      matchCount,
      hierarchyBonus,
      combinedScore,
    });
  });

  // Sort by combined score and match count
  return combinedResults
    .sort((a, b) => {
      // Prioritize results that match more terms
      if (a.matchCount !== b.matchCount) {
        return b.matchCount - a.matchCount;
      }
      // Then sort by combined score
      return b.combinedScore - a.combinedScore;
    })
    .slice(0, maxResults)
    .map(
      ({
        matchCount,
        hierarchyBonus,
        combinedScore,
        matchedTerm,
        ...result
      }) => ({
        ...result,
        matchInfo: {
          matchedTerms: matchCount,
          totalTerms: terms.length,
          confidence: combinedScore.toFixed(3),
        },
      })
    );
}

// Legacy exact search function (kept for backward compatibility)
function exactSearchAdministrativeUnits(query: string) {
  const lowerQuery = query.toLowerCase().trim();
  if (!lowerQuery) return [];

  const results: any[] = [];

  districts.forEach((d) => {
    if (d.name.toLowerCase().includes(lowerQuery)) {
      results.push({
        type: "district",
        id: d.id,
        name: d.name,
        ...getDistrictHierarchy(d.id),
      });
    }
  });

  counties.forEach((c) => {
    if (c.name.toLowerCase().includes(lowerQuery)) {
      results.push({
        type: "county",
        id: c.id,
        name: c.name,
        ...getCountyHierarchy(c.id),
      });
    }
  });

  subCounties.forEach((s) => {
    if (s.name.toLowerCase().includes(lowerQuery)) {
      results.push({
        type: "subCounty",
        id: s.id,
        name: s.name,
        ...getSubCountyHierarchy(s.id),
      });
    }
  });

  parishes.forEach((p) => {
    if (p.name.toLowerCase().includes(lowerQuery)) {
      results.push({
        type: "parish",
        id: p.id,
        name: p.name,
        ...getParishHierarchy(p.id),
      });
    }
  });

  villages.forEach((v) => {
    if (v.name.toLowerCase().includes(lowerQuery)) {
      results.push({
        type: "village",
        id: v.id,
        name: v.name,
        ...getVillageHierarchy(v),
      });
    }
  });

  return results;
}

// Export all data
export { districts, counties, subCounties, parishes, villages };

// Export types
export type {
  District,
  County,
  SubCounty,
  Parish,
  Village,
  SearchResult,
};

// Export main search functions
export { searchAdministrativeUnits, exactSearchAdministrativeUnits };

// Export utility functions for getting hierarchies
export {
  getDistrictHierarchy,
  getCountyHierarchy,
  getSubCountyHierarchy,
  getParishHierarchy,
  getVillageHierarchy,
  getHierarchyChain,
};
