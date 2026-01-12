/**
 * OpenSCAD Customizer Parameter Parser
 * @license GPL-3.0-or-later
 */

/**
 * Parse default value from OpenSCAD code
 * @param {string} valueStr - Value string from assignment
 * @returns {Object} Parsed value with type
 */
function parseDefaultValue(valueStr) {
  const trimmed = valueStr.trim();

  // Check if it's a quoted string
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return { type: 'string', value: trimmed.slice(1, -1) };
  }

  // Check if it's a number
  const num = parseFloat(trimmed);
  if (!isNaN(num) && trimmed !== '') {
    return {
      type: Number.isInteger(num) && !trimmed.includes('.')? 'integer' : 'number',
      value: num,
    };
  }

  // Check for boolean
  if (trimmed === 'true' || trimmed === 'false') {
    return { type: 'boolean', value: trimmed === 'true' };
  }

  // Unquoted string
  return { type: 'string', value: trimmed };
}

/**
 * Parse enum values from bracket hint
 * Handles: [opt1, opt2], [opt1,opt2], ["opt 1", "opt 2"], [0,2,4,6]
 * @param {string} enumStr - Enum string from bracket hint
 * @returns {Array} Array of enum values
 */
function parseEnumValues(enumStr) {
  const values = [];
  let current = '';
  let inQuotes = false;
  let quoteChar = null;

  for (let i = 0; i < enumStr.length; i++) {
    const char = enumStr[i];

    if ((char === '"' || char === "'") && (i === 0 || enumStr[i - 1] !== '\\')) {
      if (!inQuotes) {
        inQuotes = true;
        quoteChar = char;
      } else if (char === quoteChar) {
        inQuotes = false;
        quoteChar = null;
      } else {
        current += char;
      }
    } else if (char === ',' && !inQuotes) {
      const trimmed = current.trim();
      if (trimmed) values.push(trimmed);
      current = '';
    } else {
      current += char;
    }
  }

  const trimmed = current.trim();
  if (trimmed) values.push(trimmed);

  return values;
}

/**
 * Extract parameters from OpenSCAD Customizer annotations
 * @param {string} scadContent - .scad file content
 * @returns {Object} Extracted parameters structure
 */
export function extractParameters(scadContent) {
  const lines = scadContent.split('\n');
  const groups = [];
  const parameters = {};

  let currentGroup = 'General';
  let groupOrder = 0;
  let paramOrder = 0;

  // Regex patterns
  const groupPattern = /\/\*\s*\[\s*([^\]]+)\s*\]\s*\*\//;
  const assignmentPattern = /^([$]?[A-Za-z_][A-Za-z0-9_]*)\s*=\s*([^;]+);/;
  const bracketHintPattern = /\/\/\s*\[([^\]]+)\]/;
  const commentPattern = /\/\/\s*(.+)$/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Check for group
    const groupMatch = line.match(groupPattern);
    if (groupMatch) {
      currentGroup = groupMatch[1].trim();
      
      // Skip Hidden group
      if (currentGroup.toLowerCase() !== 'hidden') {
        if (!groups.find((g) => g.id === currentGroup)) {
          groups.push({
            id: currentGroup,
            label: currentGroup,
            order: groupOrder++,
          });
        }
      }
      continue;
    }

    // Check for parameter assignment
    const assignMatch = line.match(assignmentPattern);
    if (assignMatch) {
      const paramName = assignMatch[1];
      const valueStr = assignMatch[2].trim();

      // Skip if in Hidden group
      if (currentGroup.toLowerCase() === 'hidden') {
        continue;
      }

      // Parse default value
      const defaultVal = parseDefaultValue(valueStr);

      // Check for bracket hint and comment
      const afterAssignment = line.substring(line.indexOf(';') + 1);
      const bracketMatch = afterAssignment.match(bracketHintPattern);
      const commentMatch = afterAssignment.match(commentPattern);

      let param = {
        name: paramName,
        type: defaultVal.type,
        default: defaultVal.value,
        group: currentGroup,
        order: paramOrder++,
        description: '',
      };

      if (bracketMatch) {
        const hint = bracketMatch[1].trim();

        // Check if it's a range: [min:max] or [min:step:max]
        const rangeParts = hint.split(':');
        if (rangeParts.length >= 2 && rangeParts.every(p => !isNaN(parseFloat(p.trim())))) {
          const nums = rangeParts.map(p => parseFloat(p.trim()));
          
          if (nums.length === 2) {
            // [min:max]
            param.minimum = nums[0];
            param.maximum = nums[1];
            param.uiType = 'slider';
          } else if (nums.length === 3) {
            // [min:step:max]
            param.minimum = nums[0];
            param.step = nums[1];
            param.maximum = nums[2];
            param.uiType = 'slider';
            
            // Determine if integer or float based on step
            if (Number.isInteger(nums[1]) && !hint.includes('.')) {
              param.type = 'integer';
            } else {
              param.type = 'number';
            }
          }

          // Extract comment after bracket hint
          const afterBracket = afterAssignment.substring(
            afterAssignment.indexOf(']') + 1
          ).trim();
          if (afterBracket) {
            param.description = afterBracket;
          }
        } else {
          // It's an enum: [opt1, opt2, opt3]
          const enumValues = parseEnumValues(hint);
          param.enum = enumValues;
          param.type = 'string'; // Enums are typically strings
          
          // Check if it's a yes/no toggle
          const lowerVals = enumValues.map(v => v.toLowerCase());
          if (
            enumValues.length === 2 &&
            lowerVals.includes('yes') &&
            lowerVals.includes('no')
          ) {
            param.uiType = 'toggle';
          } else {
            param.uiType = 'select';
          }

          // Extract comment after bracket hint (if any)
          const afterBracket = afterAssignment.substring(
            afterAssignment.indexOf(']') + 1
          ).trim();
          if (afterBracket) {
            param.description = afterBracket;
          }
        }
      } else if (commentMatch) {
        // Comment without bracket hint
        param.description = commentMatch[1].trim();
        param.uiType = 'input';
      } else {
        // Bare parameter
        param.uiType = 'input';
      }

      parameters[paramName] = param;
    }
  }

  // If no groups were found, create a default group
  if (groups.length === 0) {
    groups.push({
      id: 'General',
      label: 'General',
      order: 0,
    });
  }

  return {
    groups,
    parameters,
  };
}
