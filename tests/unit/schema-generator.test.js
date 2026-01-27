/**
 * Tests for schema-generator.js
 */

import { describe, it, expect } from 'vitest';
import {
  toJsonSchema,
  fromJsonSchema,
  validateSchema,
  mergeSchemas,
  getSchemaDefaults,
  getSchemaMetadata,
  SCHEMA_VERSION,
  JSON_SCHEMA_DRAFT,
} from '../../src/js/schema-generator.js';

describe('schema-generator', () => {
  describe('toJsonSchema', () => {
    it('should convert empty parameters to valid schema', () => {
      const extracted = { groups: [], parameters: {} };
      const schema = toJsonSchema(extracted);

      expect(schema.$schema).toBe(JSON_SCHEMA_DRAFT);
      expect(schema.type).toBe('object');
      expect(schema.properties).toEqual({});
      expect(schema['x-schema-version']).toBe(SCHEMA_VERSION);
    });

    it('should convert integer parameters', () => {
      const extracted = {
        groups: [{ id: 'General', label: 'General', order: 0 }],
        parameters: {
          width: {
            name: 'width',
            type: 'integer',
            default: 10,
            minimum: 1,
            maximum: 100,
            step: 1,
            uiType: 'slider',
            group: 'General',
            order: 0,
          },
        },
      };

      const schema = toJsonSchema(extracted);

      expect(schema.properties.width).toEqual({
        type: 'integer',
        default: 10,
        minimum: 1,
        maximum: 100,
        multipleOf: 1,
        'x-ui-type': 'slider',
        'x-group': 'General',
        'x-order': 0,
      });
    });

    it('should convert number parameters with units', () => {
      const extracted = {
        groups: [],
        parameters: {
          angle: {
            name: 'angle',
            type: 'number',
            default: 45.0,
            minimum: 0,
            maximum: 360,
            step: 0.1,
            unit: '°',
            uiType: 'slider',
            description: 'Rotation angle',
          },
        },
      };

      const schema = toJsonSchema(extracted);

      expect(schema.properties.angle.type).toBe('number');
      expect(schema.properties.angle['x-unit']).toBe('°');
      expect(schema.properties.angle.description).toBe('Rotation angle');
    });

    it('should convert enum parameters', () => {
      const extracted = {
        groups: [],
        parameters: {
          shape: {
            name: 'shape',
            type: 'string',
            default: 'circle',
            enum: ['circle', 'square', 'triangle'],
            uiType: 'select',
          },
        },
      };

      const schema = toJsonSchema(extracted);

      expect(schema.properties.shape.enum).toEqual([
        'circle',
        'square',
        'triangle',
      ]);
      expect(schema.properties.shape['x-ui-type']).toBe('select');
    });

    it('should convert color parameters', () => {
      const extracted = {
        groups: [],
        parameters: {
          color: {
            name: 'color',
            type: 'color',
            default: 'FF0000',
            uiType: 'color',
          },
        },
      };

      const schema = toJsonSchema(extracted);

      expect(schema.properties.color.type).toBe('string');
      expect(schema.properties.color.format).toBe('color');
      expect(schema.properties.color.pattern).toBe('^#?[0-9A-Fa-f]{6}$');
    });

    it('should convert boolean/toggle parameters', () => {
      const extracted = {
        groups: [],
        parameters: {
          enabled: {
            name: 'enabled',
            type: 'boolean',
            default: true,
            uiType: 'toggle',
          },
        },
      };

      const schema = toJsonSchema(extracted);

      expect(schema.properties.enabled.type).toBe('boolean');
      expect(schema.properties.enabled.default).toBe(true);
    });

    it('should include groups as x-groups', () => {
      const extracted = {
        groups: [
          { id: 'Dimensions', label: 'Dimensions', order: 0 },
          { id: 'Options', label: 'Options', order: 1 },
        ],
        parameters: {},
      };

      const schema = toJsonSchema(extracted);

      expect(schema['x-groups']).toHaveLength(2);
      expect(schema['x-groups'][0].id).toBe('Dimensions');
      expect(schema['x-groups'][1].order).toBe(1);
    });

    it('should include dependencies', () => {
      const extracted = {
        groups: [],
        parameters: {
          advanced_option: {
            name: 'advanced_option',
            type: 'integer',
            default: 5,
            dependency: {
              parameter: 'show_advanced',
              operator: '==',
              value: 'yes',
            },
          },
        },
      };

      const schema = toJsonSchema(extracted);

      expect(schema.properties.advanced_option['x-dependency']).toEqual({
        parameter: 'show_advanced',
        operator: '==',
        value: 'yes',
      });
    });

    it('should include libraries', () => {
      const extracted = {
        groups: [],
        parameters: {},
        libraries: ['MCAD', 'BOSL2'],
      };

      const schema = toJsonSchema(extracted);

      expect(schema['x-libraries']).toEqual(['MCAD', 'BOSL2']);
    });

    it('should apply custom options', () => {
      const schema = toJsonSchema(
        { groups: [], parameters: {} },
        {
          title: 'My Model Parameters',
          description: 'Custom description',
          id: 'my-model-v1',
        }
      );

      expect(schema.$id).toBe('my-model-v1');
      expect(schema.title).toBe('My Model Parameters');
      expect(schema.description).toBe('Custom description');
    });
  });

  describe('fromJsonSchema', () => {
    it('should convert schema back to internal format', () => {
      const schema = {
        $schema: JSON_SCHEMA_DRAFT,
        type: 'object',
        properties: {
          width: {
            type: 'integer',
            default: 10,
            minimum: 1,
            maximum: 100,
            'x-ui-type': 'slider',
            'x-group': 'Dimensions',
            'x-order': 0,
          },
        },
        'x-groups': [{ id: 'Dimensions', label: 'Dimensions', order: 0 }],
      };

      const result = fromJsonSchema(schema);

      expect(result.parameters.width).toMatchObject({
        name: 'width',
        type: 'integer',
        default: 10,
        minimum: 1,
        maximum: 100,
        uiType: 'slider',
        group: 'Dimensions',
      });
      expect(result.groups[0].id).toBe('Dimensions');
    });

    it('should handle color format', () => {
      const schema = {
        type: 'object',
        properties: {
          color: {
            type: 'string',
            format: 'color',
            default: 'FF0000',
          },
        },
      };

      const result = fromJsonSchema(schema);

      expect(result.parameters.color.type).toBe('color');
      expect(result.parameters.color.uiType).toBe('color');
    });

    it('should handle enum properties', () => {
      const schema = {
        type: 'object',
        properties: {
          option: {
            type: 'string',
            enum: ['a', 'b', 'c'],
            default: 'a',
          },
        },
      };

      const result = fromJsonSchema(schema);

      expect(result.parameters.option.enum).toEqual(['a', 'b', 'c']);
      expect(result.parameters.option.uiType).toBe('select');
    });

    it('should detect yes/no toggles', () => {
      const schema = {
        type: 'object',
        properties: {
          enabled: {
            type: 'string',
            enum: ['yes', 'no'],
            default: 'yes',
          },
        },
      };

      const result = fromJsonSchema(schema);

      expect(result.parameters.enabled.uiType).toBe('toggle');
    });

    it('should create default group if none specified', () => {
      const schema = {
        type: 'object',
        properties: {
          param1: { type: 'integer', default: 5 },
        },
      };

      const result = fromJsonSchema(schema);

      expect(result.groups).toHaveLength(1);
      expect(result.groups[0].id).toBe('General');
    });

    it('should extract libraries', () => {
      const schema = {
        type: 'object',
        properties: {},
        'x-libraries': ['MCAD'],
      };

      const result = fromJsonSchema(schema);

      expect(result.libraries).toEqual(['MCAD']);
    });
  });

  describe('roundtrip conversion', () => {
    it('should preserve data through toJsonSchema → fromJsonSchema', () => {
      const original = {
        groups: [
          { id: 'Main', label: 'Main Settings', order: 0 },
          { id: 'Advanced', label: 'Advanced', order: 1 },
        ],
        parameters: {
          width: {
            name: 'width',
            type: 'integer',
            default: 50,
            minimum: 10,
            maximum: 200,
            step: 5,
            uiType: 'slider',
            unit: 'mm',
            group: 'Main',
            order: 0,
            description: 'Width in mm',
          },
          style: {
            name: 'style',
            type: 'string',
            default: 'modern',
            enum: ['classic', 'modern', 'minimal'],
            uiType: 'select',
            group: 'Main',
            order: 1,
          },
        },
        libraries: ['BOSL2'],
      };

      const schema = toJsonSchema(original);
      const restored = fromJsonSchema(schema);

      expect(restored.groups).toHaveLength(2);
      expect(restored.parameters.width.minimum).toBe(10);
      expect(restored.parameters.width.unit).toBe('mm');
      expect(restored.parameters.style.enum).toEqual([
        'classic',
        'modern',
        'minimal',
      ]);
      expect(restored.libraries).toEqual(['BOSL2']);
    });
  });

  describe('validateSchema', () => {
    it('should accept valid schema', () => {
      const schema = {
        type: 'object',
        properties: {
          test: { type: 'integer' },
        },
      };

      const result = validateSchema(schema);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject null schema', () => {
      const result = validateSchema(null);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Schema is null or undefined');
    });

    it('should reject non-object schema', () => {
      const result = validateSchema('not an object');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Schema must be an object');
    });

    it('should require object type', () => {
      const result = validateSchema({ type: 'array', properties: {} });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Schema type must be "object"');
    });

    it('should require properties object', () => {
      const result = validateSchema({ type: 'object' });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Schema must have a "properties" object');
    });

    it('should validate property definitions', () => {
      const result = validateSchema({
        type: 'object',
        properties: {
          invalid: {}, // Missing type
        },
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Property "invalid" must have a type or enum'
      );
    });
  });

  describe('mergeSchemas', () => {
    it('should merge properties', () => {
      const base = {
        type: 'object',
        properties: {
          width: { type: 'integer', default: 10 },
        },
      };

      const extension = {
        properties: {
          height: { type: 'integer', default: 20 },
        },
      };

      const merged = mergeSchemas(base, extension);

      expect(merged.properties.width).toBeDefined();
      expect(merged.properties.height).toBeDefined();
    });

    it('should override properties from extension', () => {
      const base = {
        type: 'object',
        properties: {
          width: { type: 'integer', default: 10 },
        },
      };

      const extension = {
        properties: {
          width: { type: 'integer', default: 50 },
        },
      };

      const merged = mergeSchemas(base, extension);

      expect(merged.properties.width.default).toBe(50);
    });

    it('should merge groups', () => {
      const base = {
        type: 'object',
        properties: {},
        'x-groups': [{ id: 'A', label: 'A', order: 0 }],
      };

      const extension = {
        properties: {},
        'x-groups': [{ id: 'B', label: 'B', order: 1 }],
      };

      const merged = mergeSchemas(base, extension);

      expect(merged['x-groups']).toHaveLength(2);
    });

    it('should merge libraries', () => {
      const base = {
        type: 'object',
        properties: {},
        'x-libraries': ['MCAD'],
      };

      const extension = {
        properties: {},
        'x-libraries': ['BOSL2'],
      };

      const merged = mergeSchemas(base, extension);

      expect(merged['x-libraries']).toContain('MCAD');
      expect(merged['x-libraries']).toContain('BOSL2');
    });
  });

  describe('getSchemaDefaults', () => {
    it('should extract default values', () => {
      const schema = {
        type: 'object',
        properties: {
          width: { type: 'integer', default: 10 },
          height: { type: 'integer', default: 20 },
          label: { type: 'string' }, // No default
        },
      };

      const defaults = getSchemaDefaults(schema);

      expect(defaults).toEqual({
        width: 10,
        height: 20,
      });
    });

    it('should handle empty properties', () => {
      const schema = { type: 'object', properties: {} };
      const defaults = getSchemaDefaults(schema);

      expect(defaults).toEqual({});
    });
  });

  describe('getSchemaMetadata', () => {
    it('should extract metadata', () => {
      const schema = {
        title: 'Test Schema',
        description: 'A test schema',
        type: 'object',
        properties: {
          a: { type: 'integer' },
          b: { type: 'string' },
        },
        'x-schema-version': SCHEMA_VERSION,
        'x-generator': 'openscad-assistive-forge',
        'x-groups': [{ id: 'Main', label: 'Main', order: 0 }],
        'x-libraries': ['MCAD'],
      };

      const metadata = getSchemaMetadata(schema);

      expect(metadata.title).toBe('Test Schema');
      expect(metadata.description).toBe('A test schema');
      expect(metadata.version).toBe(SCHEMA_VERSION);
      expect(metadata.generator).toBe('openscad-assistive-forge');
      expect(metadata.groups).toHaveLength(1);
      expect(metadata.libraries).toEqual(['MCAD']);
      expect(metadata.propertyCount).toBe(2);
    });
  });
});
