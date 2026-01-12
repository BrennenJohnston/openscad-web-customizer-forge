/**
 * UI Generator - Renders form controls from schema
 * @license GPL-3.0-or-later
 */

/**
 * Create a range slider control
 * @param {Object} param - Parameter definition
 * @param {Function} onChange - Change handler
 * @returns {HTMLElement} Control element
 */
function createSliderControl(param, onChange) {
  const container = document.createElement('div');
  container.className = 'param-control';

  const label = document.createElement('label');
  label.htmlFor = `param-${param.name}`;
  const paramLabel = param.name.replace(/_/g, ' ');
  label.innerHTML = `${paramLabel}`;
  
  if (param.description) {
    const desc = document.createElement('span');
    desc.className = 'param-unit';
    desc.textContent = param.description;
    label.appendChild(desc);
  }

  const sliderContainer = document.createElement('div');
  sliderContainer.className = 'slider-container';

  const input = document.createElement('input');
  input.type = 'range';
  input.id = `param-${param.name}`;
  input.min = param.minimum;
  input.max = param.maximum;
  input.step = param.step || 1;
  input.value = param.default;
  input.setAttribute('aria-valuemin', param.minimum);
  input.setAttribute('aria-valuemax', param.maximum);
  input.setAttribute('aria-valuenow', param.default);
  input.setAttribute('aria-label', `${param.name.replace(/_/g, ' ')}: ${param.default}`);

  const output = document.createElement('output');
  output.htmlFor = `param-${param.name}`;
  output.className = 'slider-value';
  output.textContent = param.default;

  input.addEventListener('input', (e) => {
    const value = param.type === 'integer' ? parseInt(e.target.value) : parseFloat(e.target.value);
    output.textContent = value;
    input.setAttribute('aria-valuenow', value);
    input.setAttribute('aria-label', `${param.name.replace(/_/g, ' ')}: ${value}`);
    onChange(param.name, value);
  });

  sliderContainer.appendChild(input);
  sliderContainer.appendChild(output);

  container.appendChild(label);
  container.appendChild(sliderContainer);

  return container;
}

/**
 * Create a number input control
 * @param {Object} param - Parameter definition
 * @param {Function} onChange - Change handler
 * @returns {HTMLElement} Control element
 */
function createNumberInput(param, onChange) {
  const container = document.createElement('div');
  container.className = 'param-control';

  const label = document.createElement('label');
  label.htmlFor = `param-${param.name}`;
  label.textContent = param.name.replace(/_/g, ' ');

  const input = document.createElement('input');
  input.type = 'number';
  input.id = `param-${param.name}`;
  input.value = param.default;
  input.setAttribute('aria-label', `Enter ${param.name.replace(/_/g, ' ')}`);
  
  if (param.minimum !== undefined) {
    input.min = param.minimum;
    input.setAttribute('aria-valuemin', param.minimum);
  }
  if (param.maximum !== undefined) {
    input.max = param.maximum;
    input.setAttribute('aria-valuemax', param.maximum);
  }
  if (param.step !== undefined) input.step = param.step;

  input.addEventListener('change', (e) => {
    const value = param.type === 'integer' ? parseInt(e.target.value) : parseFloat(e.target.value);
    onChange(param.name, value);
  });

  container.appendChild(label);
  container.appendChild(input);

  if (param.description) {
    const desc = document.createElement('small');
    desc.className = 'param-description';
    desc.textContent = param.description;
    container.appendChild(desc);
  }

  return container;
}

/**
 * Create a select dropdown control
 * @param {Object} param - Parameter definition
 * @param {Function} onChange - Change handler
 * @returns {HTMLElement} Control element
 */
function createSelectControl(param, onChange) {
  const container = document.createElement('div');
  container.className = 'param-control';

  const label = document.createElement('label');
  label.htmlFor = `param-${param.name}`;
  label.textContent = param.name.replace(/_/g, ' ');

  const select = document.createElement('select');
  select.id = `param-${param.name}`;
  select.setAttribute('aria-label', `Select ${param.name.replace(/_/g, ' ')}`);

  param.enum.forEach((value) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value;
    if (value === param.default) {
      option.selected = true;
    }
    select.appendChild(option);
  });

  select.addEventListener('change', (e) => {
    onChange(param.name, e.target.value);
  });

  container.appendChild(label);
  container.appendChild(select);

  if (param.description) {
    const desc = document.createElement('small');
    desc.className = 'param-description';
    desc.textContent = param.description;
    container.appendChild(desc);
  }

  return container;
}

/**
 * Create a toggle switch control
 * @param {Object} param - Parameter definition
 * @param {Function} onChange - Change handler
 * @returns {HTMLElement} Control element
 */
function createToggleControl(param, onChange) {
  const container = document.createElement('div');
  container.className = 'param-control';

  const toggleContainer = document.createElement('div');
  toggleContainer.className = 'toggle-switch';

  const input = document.createElement('input');
  input.type = 'checkbox';
  input.id = `param-${param.name}`;
  input.setAttribute('role', 'switch');
  input.checked = param.default.toLowerCase() === 'yes';
  input.setAttribute('aria-label', `Toggle ${param.name.replace(/_/g, ' ')}`);
  input.setAttribute('aria-checked', param.default.toLowerCase() === 'yes');

  const label = document.createElement('label');
  label.htmlFor = `param-${param.name}`;
  label.className = 'toggle-label';
  label.textContent = param.name.replace(/_/g, ' ');

  input.addEventListener('change', (e) => {
    const value = e.target.checked ? 'yes' : 'no';
    input.setAttribute('aria-checked', e.target.checked);
    onChange(param.name, value);
  });

  toggleContainer.appendChild(input);
  toggleContainer.appendChild(label);

  container.appendChild(toggleContainer);

  if (param.description) {
    const desc = document.createElement('small');
    desc.className = 'param-description';
    desc.textContent = param.description;
    container.appendChild(desc);
  }

  return container;
}

/**
 * Create a text input control
 * @param {Object} param - Parameter definition
 * @param {Function} onChange - Change handler
 * @returns {HTMLElement} Control element
 */
function createTextInput(param, onChange) {
  const container = document.createElement('div');
  container.className = 'param-control';

  const label = document.createElement('label');
  label.htmlFor = `param-${param.name}`;
  label.textContent = param.name.replace(/_/g, ' ');

  const input = document.createElement('input');
  input.type = 'text';
  input.id = `param-${param.name}`;
  input.value = param.default;
  input.setAttribute('aria-label', `Enter ${param.name.replace(/_/g, ' ')}`);

  input.addEventListener('change', (e) => {
    onChange(param.name, e.target.value);
  });

  container.appendChild(label);
  container.appendChild(input);

  if (param.description) {
    const desc = document.createElement('small');
    desc.className = 'param-description';
    desc.textContent = param.description;
    container.appendChild(desc);
  }

  return container;
}

/**
 * Render parameter UI from extracted parameters
 * @param {Object} extractedParams - Output from extractParameters()
 * @param {HTMLElement} container - Container to render into
 * @param {Function} onChange - Called when parameter changes
 * @returns {Object} Current parameter values
 */
export function renderParameterUI(extractedParams, container, onChange) {
  container.innerHTML = '';

  const { groups, parameters } = extractedParams;
  const currentValues = {};

  // Group parameters by group
  const paramsByGroup = {};
  Object.values(parameters).forEach((param) => {
    if (!paramsByGroup[param.group]) {
      paramsByGroup[param.group] = [];
    }
    paramsByGroup[param.group].push(param);
    currentValues[param.name] = param.default;
  });

  // Sort groups by order
  const sortedGroups = [...groups].sort((a, b) => a.order - b.order);

  // Render each group
  sortedGroups.forEach((group) => {
    const groupParams = paramsByGroup[group.id] || [];
    if (groupParams.length === 0) return;

    // Sort parameters by order
    groupParams.sort((a, b) => a.order - b.order);

    const details = document.createElement('details');
    details.className = 'param-group';
    details.open = true;

    const summary = document.createElement('summary');
    summary.textContent = group.label;
    details.appendChild(summary);

    groupParams.forEach((param) => {
      let control;

      switch (param.uiType) {
        case 'slider':
          control = createSliderControl(param, (name, value) => {
            currentValues[name] = value;
            onChange(currentValues);
          });
          break;

        case 'select':
          control = createSelectControl(param, (name, value) => {
            currentValues[name] = value;
            onChange(currentValues);
          });
          break;

        case 'toggle':
          control = createToggleControl(param, (name, value) => {
            currentValues[name] = value;
            onChange(currentValues);
          });
          break;

        case 'input':
        default:
          if (param.type === 'integer' || param.type === 'number') {
            control = createNumberInput(param, (name, value) => {
              currentValues[name] = value;
              onChange(currentValues);
            });
          } else {
            control = createTextInput(param, (name, value) => {
              currentValues[name] = value;
              onChange(currentValues);
            });
          }
          break;
      }

      details.appendChild(control);
    });

    container.appendChild(details);
  });

  return currentValues;
}
