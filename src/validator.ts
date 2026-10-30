import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import fs from 'fs';
import path from 'path';
import draft7MetaSchema from 'ajv/dist/refs/json-schema-draft-07.json';

export class Validator {
  private ajv: Ajv2020;
  private relationshipSchemaPath: string;

  constructor() {
    this.ajv = new Ajv2020({ allErrors: true, strict: false });
    addFormats(this.ajv);
    this.ajv.addMetaSchema(draft7MetaSchema);
    
    this.relationshipSchemaPath = path.dirname(require.resolve('@twgt/relationship-types/package.json'));
    this.loadSchemas();
  }

  private loadSchemas() {
    const relSchemasDir = path.join(this.relationshipSchemaPath, 'src/schemas');
    if (fs.existsSync(relSchemasDir)) {
      for (const file of fs.readdirSync(relSchemasDir)) {
        if (file.endsWith('.json')) {
          const schemaData = JSON.parse(fs.readFileSync(path.join(relSchemasDir, file), 'utf8'));
          this.ajv.addSchema(schemaData);
        }
      }
    }
  }

  public validate(relationship: any): { valid: boolean; errors: any[] | null } {
    let schemaId = 'https://twgt.lifestyle3nergy.com/schemas/relationship.base.schema.json';
    if (relationship.kind === 'ownership') {
      schemaId = 'https://twgt.lifestyle3nergy.com/schemas/ownership.schema.json';
    }

    const validateFn = this.ajv.getSchema(schemaId);
    if (!validateFn) {
      return { valid: false, errors: [{ message: `Schema not found for kind: ${relationship.kind}` }] };
    }

    const valid = validateFn(relationship) as boolean;
    return { valid, errors: validateFn.errors || null };
  }
}
