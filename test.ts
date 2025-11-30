import {
  searchAdministrativeUnits,
  exactSearchAdministrativeUnits,
  districts,
  counties,
  getDistrictHierarchy,
  getCountyHierarchy,
  getSubCountyHierarchy,
  type SearchResult,
} from "./index.js";

console.log("=== Uganda Locations Package Tests ===\n");

// Test 1: Basic single location search
console.log("Test 1: Search for 'Kampala'");
const kampalaResults = searchAdministrativeUnits("Kampala", 5);
console.log(`Found ${kampalaResults.length} results:`);
kampalaResults.forEach((result, i) => {
  console.log(
    `  ${i + 1}. ${result.name} (${result.type}) - Score: ${result.score.toFixed(3)}`
  );
  if (result.district) console.log(`     District: ${result.district}`);
  if (result.county) console.log(`     County: ${result.county}`);
});
console.log();

// Test 2: Fuzzy search with typo
console.log("Test 2: Fuzzy search for 'Mbale' (testing fuzzy matching)");
const mbaleResults = searchAdministrativeUnits("Mbalw", 3);
console.log(`Found ${mbaleResults.length} results:`);
mbaleResults.forEach((result, i) => {
  console.log(
    `  ${i + 1}. ${result.name} (${result.type}) - Score: ${result.score.toFixed(3)}`
  );
});
console.log();

// Test 3: Multi-location search
console.log("Test 3: Multi-location search for 'Nakawa, Kampala'");
const multiResults = searchAdministrativeUnits("Nakawa, Kampala", 5);
console.log(`Found ${multiResults.length} results:`);
multiResults.forEach((result, i) => {
  console.log(
    `  ${i + 1}. ${result.name} (${result.type}) - Score: ${result.score.toFixed(3)}`
  );
  if (result.matchInfo) {
    console.log(
      `     Match info: ${result.matchInfo.matchedTerms}/${result.matchInfo.totalTerms} terms, confidence: ${result.matchInfo.confidence}`
    );
  }
  if (result.district) console.log(`     District: ${result.district}`);
  if (result.county) console.log(`     County: ${result.county}`);
});
console.log();

// Test 4: Exact search
console.log("Test 4: Exact search for 'Gulu'");
const guluResults = exactSearchAdministrativeUnits("Gulu");
console.log(`Found ${guluResults.length} results:`);
guluResults.slice(0, 5).forEach((result, i) => {
  console.log(`  ${i + 1}. ${result.name} (${result.type})`);
});
console.log();

// Test 5: Test data exports
console.log("Test 5: Data exports verification");
console.log(`  Total districts: ${districts.length}`);
console.log(`  Total counties: ${counties.length}`);
console.log(`  First district: ${districts[0]?.name}`);
console.log(`  First county: ${counties[0]?.name}`);
console.log();

// Test 6: Hierarchy functions
console.log("Test 6: Testing hierarchy functions");
if (districts.length > 0) {
  const firstDistrict = districts[0];
  console.log(`  District: ${firstDistrict.name}`);
  const hierarchy = getDistrictHierarchy(firstDistrict.id);
  console.log(`  Hierarchy:`, hierarchy);
}
if (counties.length > 0) {
  const firstCounty = counties[0];
  console.log(`  County: ${firstCounty.name}`);
  const hierarchy = getCountyHierarchy(firstCounty.id);
  console.log(`  Hierarchy:`, hierarchy);
}
console.log();

// Test 7: Edge cases
console.log("Test 7: Edge cases");
console.log("  Empty query:", searchAdministrativeUnits("").length);
console.log("  Non-existent location:", searchAdministrativeUnits("XYZ123").length);
console.log("  Single character:", searchAdministrativeUnits("K", 3).length);
console.log();

// Test 8: Performance test
console.log("Test 8: Performance test");
const start = performance.now();
for (let i = 0; i < 100; i++) {
  searchAdministrativeUnits("Kampala", 10);
}
const end = performance.now();
console.log(`  100 searches completed in ${(end - start).toFixed(2)}ms`);
console.log(`  Average: ${((end - start) / 100).toFixed(2)}ms per search`);
console.log();

console.log("=== All tests completed successfully! ===");
