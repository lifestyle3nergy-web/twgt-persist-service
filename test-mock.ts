import { GraphDatabase } from './src/db';
import { Validator } from './src/validator';
import fs from 'fs';
import path from 'path';

async function mockTest() {
  console.log("🧪 Running mock persistence test...");

  const testRelPath = path.join(__dirname, 'test-rel.json');
  fs.writeFileSync(testRelPath, JSON.stringify({
    id: "rel:01HX7ZK2M3N4P5Q6R7S8T9V0W1",
    kind: "ownership",
    from: { type: "team", id: "platform" },
    to: { type: "repo", id: "TWGT-" },
    createdAt: new Date().toISOString(),
    source: { repo: "lifestyle3nergy-web/TWGT-", commit: "a1b2c3d", author: "test@test.com" },
    attributes: { role: "owner" },
    schemaVersion: "1.0.0"
  }));

  const rawData = JSON.parse(fs.readFileSync(testRelPath, 'utf8'));
  const validator = new Validator();
  const { valid, errors } = validator.validate(rawData);
  
  if (!valid) {
    console.error("❌ Validation failed:", errors);
    process.exit(1);
  }
  console.log("✅ Validation passed.");
  
  const mockDb = new GraphDatabase('bolt://mock', 'user', 'pass');
  
  // Override the actual DB call
  (mockDb as any).persistRelationship = async (rel: any) => {
    console.log(`   [Mock DB] Would execute MERGE for relationship: ${rel.id}`);
    console.log(`   [Mock DB] From: ${rel.from.id} (${rel.from.type})`);
    console.log(`   [Mock DB] To: ${rel.to.id} (${rel.to.type})`);
  };

  await mockDb.persistRelationship(rawData);
  console.log("✅ Mock test passed.");
}

mockTest();
