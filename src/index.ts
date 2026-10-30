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
    process.exit(1);
  }

  // 1. Read and validate structure
  const rawData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const validator = new Validator();
  const { valid, errors } = validator.validate(rawData);
  
  if (!valid) {
    console.error("❌ Validation failed:", errors);
    process.exit(1);
  }

  // 2. Authorize (Fail-Closed)
  const opaUrl = process.env.OPA_URL || 'http://localhost:8181';
  try {
    console.log(`Querying OPA at ${opaUrl}...`);
    const { allow, reason } = await authorizeWithOpa(rawData, opaUrl);
    if (!allow) {
      console.error(`❌ Authorization failed: ${reason}`);
      process.exit(1);
    }
    console.log("✅ Authorization passed.");
  } catch (error: any) {
    console.error(`❌ Authorization check failed: ${error.message}`);
    process.exit(2); // Exit code 2 for OPA unavailable
  }

  // 3. Connect to DB and initialize constraints
  const db = new GraphDatabase(
    process.env.NEO4J_URI || 'bolt://localhost:7687',
    process.env.NEO4J_USER || 'neo4j',
    process.env.NEO4J_PASSWORD || 'password'
  );

  try {
    console.log("Connecting to Neo4j...");
    await db.verifyConnectivity();
    
    // Ensure graph integrity constraints exist
    await db.initializeConstraints();
    
    // 4. Persist
    await db.persistRelationship(rawData as Relationship);
  } catch (error) {
    console.error("❌ Database error:", error);
    process.exit(1);
  } finally {
    await db.close();
  }
}

main();
