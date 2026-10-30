import fs from 'fs';
import { GraphDatabase, Relationship } from './db';
import { Validator } from './validator';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error("Usage: node dist/src/index.js <relationship.json>");
    process.exit(1);
  }

  // 1. Read and validate
  const rawData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const validator = new Validator();
  const { valid, errors } = validator.validate(rawData);
  
  if (!valid) {
    console.error("❌ Validation failed:", errors);
    process.exit(1);
  }

  // 2. Connect to DB
  const db = new GraphDatabase(
    process.env.NEO4J_URI || 'bolt://localhost:7687',
    process.env.NEO4J_USER || 'neo4j',
    process.env.NEO4J_PASSWORD || 'password'
  );

  try {
    console.log("Connecting to Neo4j...");
    await db.verifyConnectivity();
    
    // 3. Persist
    await db.persistRelationship(rawData as Relationship);
  } catch (error) {
    console.error("❌ Database error:", error);
    process.exit(1);
  } finally {
    await db.close();
  }
}

main();
