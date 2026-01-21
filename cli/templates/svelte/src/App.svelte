<script>
  import { onMount } from 'svelte';
  import Header from './lib/Header.svelte';
  import ParametersPanel from './lib/ParametersPanel.svelte';
  import PreviewPanel from './lib/PreviewPanel.svelte';

  let schema = null;
  let scadSource = '';
  let parameters = {};
  let previewState = 'idle';
  let stlData = null;
  let error = null;
  let loadingError = null;
  let worker = null;

  // Load schema and SCAD source from embedded scripts
  onMount(() => {
    try {
      const schemaElement = document.getElementById('param-schema');
      const scadElement = document.getElementById('scad-source');

      if (!schemaElement || !scadElement) {
        throw new Error('Missing embedded schema or SCAD source');
      }

      const loadedSchema = JSON.parse(schemaElement.textContent);
      const loadedScad = scadElement.textContent;

      schema = loadedSchema;
      scadSource = loadedScad;

      // Initialize parameters with defaults
      const defaultParams = {};
      for (const [key, prop] of Object.entries(loadedSchema.properties || {})) {
        defaultParams[key] = prop.default;
      }

      // Load parameters from URL hash if present
      if (window.location.hash) {
        const urlParams = parseUrlParams(window.location.hash.slice(1));
        parameters = { ...defaultParams, ...urlParams };
      } else {
        parameters = defaultParams;
      }
    } catch (err) {
      loadingError = `Failed to load schema: ${err.message}`;
    }
  });

  // Parse URL parameters
  function parseUrlParams(hash) {
    const params = {};
    const pairs = hash.split('&');
    for (const pair of pairs) {
      const [key, value] = pair.split('=');
      if (key && value) {
        params[decodeURIComponent(key)] = JSON.parse(decodeURIComponent(value));
      }
    }
    return params;
  }

  // Update URL hash when parameters change
  $: if (schema) {
    const pairs = [];
    for (const [key, value] of Object.entries(parameters)) {
      pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(JSON.stringify(value))}`);
    }
    window.history.replaceState(null, '', `#${pairs.join('&')}`);
  }

  // Handle parameter changes
  function handleParameterChange(event) {
    const { name, value } = event.detail;
    parameters = { ...parameters, [name]: value };
    previewState = 'pending';
  }

  // Render STL
  async function handleRender() {
    if (!worker) {
      worker = new Worker(new URL('./worker/openscad-worker.js', import.meta.url), {
        type: 'module',
      });
    }

    previewState = 'rendering';
    error = null;

    // Create promise to handle worker response
    const renderPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Render timeout (60s)'));
      }, 60000);

      const handleMessage = (e) => {
        clearTimeout(timeout);
        worker.removeEventListener('message', handleMessage);

        if (e.data.type === 'render-complete') {
          resolve(e.data.stl);
        } else if (e.data.type === 'render-error') {
          reject(new Error(e.data.error));
        }
      };

      worker.addEventListener('message', handleMessage);
    });

    try {
      // Convert parameters to OpenSCAD format
      const scadParams = Object.entries(parameters).map(([key, value]) => {
        if (typeof value === 'string') {
          return `${key}="${value}";`;
        }
        return `${key}=${JSON.stringify(value)};`;
      });

      const paramString = scadParams.join('\n');
      const fullSource = `${paramString}\n\n${scadSource}`;

      worker.postMessage({
        type: 'render',
        source: fullSource,
      });

      const stl = await renderPromise;
      stlData = stl;
      previewState = 'current';
    } catch (err) {
      error = err.message;
      previewState = 'error';
    }
  }

  // Download STL
  function handleDownload() {
    if (!stlData) return;

    const blob = new Blob([stlData], { type: 'model/stl' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `model_${Date.now()}.stl`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Copy share link
  function handleCopyLink() {
    navigator.clipboard.writeText(window.location.href);
    alert('Share link copied to clipboard!');
  }
</script>

{#if loadingError}
  <div class="error-container">
    <h2>Error</h2>
    <p>{loadingError}</p>
  </div>
{:else if !schema}
  <div class="loading-container">
    <p>Loading...</p>
  </div>
{:else}
  <div class="app">
    <Header
      title={schema.title || 'OpenSCAD Customizer'}
      description={schema.description}
      on:copy-link={handleCopyLink}
    />
    
    <main class="container">
      <div class="layout">
        <ParametersPanel
          {schema}
          {parameters}
          on:change={handleParameterChange}
        />
        
        <PreviewPanel
          {stlData}
          {previewState}
          {error}
          on:render={handleRender}
          on:download={handleDownload}
        />
      </div>
    </main>
    
    <footer class="footer">
      <p>
        Generated by OpenSCAD Assistive Forge •
        <a href="https://github.com/BrennenJohnston/openscad-assistive-forge">
          Source Code
        </a>
      </p>
    </footer>
  </div>
{/if}
