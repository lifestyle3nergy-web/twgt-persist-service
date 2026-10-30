import { GraphDatabase, Relationship } from './src/db';
import { Validator } from './src/validator';
import fs from 'fs';
import path from 'path';
import assert from 'assert';

async function runTest() {
  console.log("🧪 Running P04.1 Integration Test...");

  const testRel: Relationship = {
    id: "rel:01HX7ZK2M3N4P5Q6R7S8T9V0W1",
    kind: "ownership",
    from: { type: "team", id: "platform" },
    to: { type: "repo", id: "TWGT-" },
    createdAt: new Date().toISOString(),
    validUntil: null,
    source: { repo: "lifestyle3nergy-web/TWGT-", commit: "a1b2c3d", author: "test@test.com" },
    attributes: { role: "owner" },
    schemaVersion: "1.0.0"
  };

  // 1. Validate Schema
  const validator = new Validator();
  const { valid, errors } = validator.validate(testRel);
  assert.strictEqual(valid, true, `Schema validation failed: ${JSON.stringify(errors)}`);
  console.log("✅ Schema validation passed.");

  // 2. Test Cypher Generation
  const db = new GraphDatabase('bolt://mock', 'user', 'pass');
  const { query, params } = db.buildQuery(testRel);

  // Assert the query contains proper MERGE and SET statements
  assert.ok(query.includes("MERGE (fromNode:Node"), "Query missing node MERGE");
  assert.ok(query.includes("MERGE (fromNode)-[r:RELATIONSHIP"), "Query missing rel MERGE");
  assert.ok(query.includes("r.validUntil = $validUntil"), "Query missing validUntil persistence");

  // Assert parameters match exactly
  assert.strictEqual(params.fromId, "platform");
  assert.strictEqual(params.relId, "rel:01HX7ZK2M3N4P5Q6R7S8T9V0W1");
  assert.strictEqual(params.validUntil, null);

  console.log("✅ Cypher query construction and parameters verified.");
  console.log("🎉 P04.1 Integration Test PASSED.");
}

runTest().catch(err => {
  console.error("❌ Test FAILED:", err.message);
  process.exit(1);
});
