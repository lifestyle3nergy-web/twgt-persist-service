import neo4j, { Driver } from 'neo4j-driver';

export interface Relationship {
  id: string;
  kind: string;
  from: { type: string; id: string };
  to: { type: string; id: string };
  createdAt: string;
  validUntil?: string | null;
  source: { repo: string; commit: string; author: string };
  attributes: Record<string, unknown>;
  schemaVersion: string;
}

export class GraphDatabase {
  private driver: Driver;

  constructor(uri: string, user: string, password: string) {
    this.driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
  }

  async verifyConnectivity(): Promise<void> {
    await this.driver.verifyConnectivity();
  }

  async persistRelationship(rel: Relationship): Promise<void> {
    const session = this.driver.session();
    try {
      const query = `
        MERGE (fromNode { id: $fromId, type: $fromType })
        MERGE (toNode { id: $toId, type: $toType })
        MERGE (fromNode)-[r:RELATIONSHIP { id: $relId }]->(toNode)
        SET r.kind = $kind,
            r.createdAt = $createdAt,
            r.source = $source,
            r.attributes = $attributes,
            r.schemaVersion = $schemaVersion
      `;

      const params = {
        fromId: rel.from.id,
        fromType: rel.from.type,
        toId: rel.to.id,
        toType: rel.to.type,
        relId: rel.id,
        kind: rel.kind,
        createdAt: rel.createdAt,
        source: JSON.stringify(rel.source),
        attributes: JSON.stringify(rel.attributes),
        schemaVersion: rel.schemaVersion
      };

      await session.run(query, params);
      console.log(`✅ Persisted relationship ${rel.id}`);
    } finally {
      await session.close();
    }
  }

  async close(): Promise<void> {
    await this.driver.close();
  }
}
