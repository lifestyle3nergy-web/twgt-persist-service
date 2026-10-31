import fs from 'fs';
import { GraphDatabase, Relationship } from './db';
import { Validator } from './validator';
import { authorizeWithOpa } from './opa';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error("Usage: node dist/src/index.js <relationship.json>");
    process.exitCode = 1;
    return;
  }

  // 1. Fail-closed config validation BEFORE any network I/O
  const opaUrl    = process.env.OPA_URL;
  const neo4jUri  = process.env.NEO4J_URI;
  const neo4jUser = process.env.NEO4J_USER;
  const neo4jPass = process.env.NEO4J_PASSWORD;
  const missing: string[] = [];
  if (!opaUrl)    missing.push('OPA_URL');
  if (!neo4jUri)  missing.push('NEO4J_URI');
  if (!neo4jUser) missing.push('NEO4J_USER');
  if (!neo4jPass) missing.push('NEO4J_PASSWORD');
  if (missing.length > 0) {
    console.error(`❌ FATAL: missing required environment variables: ${missing.join(', ')}`);
    process.exitCode = 1;
    return;
  }

  // 2. Read and validate structure
  let rawData: any;
  try {
    rawData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err: any) {
    console.error(`❌ Failed to read/parse ${filePath}: ${err.message}`);
    process.exitCode = 1;
    return;
  }
  const validator = new Validator();
  const { valid, errors } = validator.validate(rawData);
  if (!valid) {
    console.error("❌ Validation failed:", errors);
    process.exitCode = 1;
    return;
  }

  // 3. Authorize (fail-closed)
  try {
    console.log(`Querying OPA at ${opaUrl}...`);
    const { allow, reason } = await authorizeWithOpa(rawData, opaUrl!);
    if (!allow) {
      console.error(`❌ Authorization failed: ${reason}`);
      process.exitCode = 1;
      return;
    }
    console.log("✅ Authorization passed.");
  } catch (error: any) {
    console.error(`❌ Authorization check failed: ${error.message}`);
    process.exitCode = 2;
    return;
  }

  // 4. Persist
  const db = new GraphDatabase(neo4jUri!, neo4jUser!, neo4jPass!);
  try {
    console.log("Connecting to Neo4j...");
    await db.verifyConnectivity();
    await db.initializeConstraints();
    await db.persistRelationship(rawData as Relationship);
    console.log("✅ Relationship persisted.");
  } catch (error) {
    console.error("❌ Database error:", error);
    process.exitCode = 1;
  } finally {
    await db.close();
  }
}

main().catch((err) => {
  console.error("❌ Unhandled error:", err);
  process.exitCode = 1;
});
