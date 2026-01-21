/**
 * OpenSCAD Customizer - React App
 * @license GPL-3.0-or-later
 */

import { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import ParametersPanel from './components/ParametersPanel';
import PreviewPanel from './components/PreviewPanel';
import './App.css';

function App() {
  const [schema, setSchema] = useState(null);
  const [scadSource, setScadSource] = useState('');
  const [parameters, setParameters] = useState({});
  const [previewState, setPreviewState] = useState('idle');
  const [stlData, setStlData] = useState(null);
  const [error, setError] = useState(null);
  const workerRef = useRef(null);

  // Load schema and SCAD source from embedded scripts
  useEffect(() => {
    try {
      const schemaElement = document.getElementById('param-schema');
      const scadElement = document.getElementById('scad-source');

      if (!schemaElement || !scadElement) {
        throw new Error('Missing embedded schema or SCAD source');
      }

      const loadedSchema = JSON.parse(schemaElement.textContent);
      const loadedScad = scadElement.textContent;

      setSchema(loadedSchema);
      setScadSource(loadedScad);

      // Initialize parameters with defaults
      const defaultParams = {};
      for (const [key, prop] of Object.entries(loadedSchema.properties || {})) {
        defaultParams[key] = prop.default;
      }
      setParameters(defaultParams);

      // Load parameters from URL hash if present
      if (window.location.hash) {
        const urlParams = parseUrlParams(window.location.hash.slice(1));
        setParameters({ ...defaultParams, ...urlParams });
      }
    } catch (err) {
      setError(`Failed to load schema: ${err.message}`);
    }
  }, []);

  // Parse URL parameters
  const parseUrlParams = (hash) => {
    const params = {};
    const pairs = hash.split('&');
    for (const pair of pairs) {
      const [key, value] = pair.split('=');
      if (key && value) {
        params[decodeURIComponent(key)] = JSON.parse(decodeURIComponent(value));
      }
    }
    return params;
  };

  // Update URL hash when parameters change
  useEffect(() => {
    if (!schema) return;
    
    const pairs = [];
    for (const [key, value] of Object.entries(parameters)) {
      pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(JSON.stringify(value))}`);
    }
    window.history.replaceState(null, '', `#${pairs.join('&')}`);
  }, [parameters, schema]);

  // Handle parameter changes
  const handleParameterChange = (name, value) => {
    setParameters((prev) => ({ ...prev, [name]: value }));
    setPreviewState('pending');
  };

  // Render STL
  const handleRender = async () => {
    if (!workerRef.current) {
      workerRef.current = new Worker(new URL('./worker/openscad-worker.js', import.meta.url), {
        type: 'module',
      });
    }

    setPreviewState('rendering');
    setError(null);

    const worker = workerRef.current;

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
      setStlData(stl);
      setPreviewState('current');
    } catch (err) {
      setError(err.message);
      setPreviewState('error');
    }
  };

  // Download STL
  const handleDownload = () => {
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
  };

  // Copy share link
  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    alert('Share link copied to clipboard!');
  };

  if (error && !schema) {
    return (
      <div className="error-container">
        <h2>Error</h2>
        <p>{error}</p>
      </div>
    );
  }

  if (!schema) {
    return (
      <div className="loading-container">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="app">
      <Header
        title={schema.title || 'OpenSCAD Customizer'}
        description={schema.description}
        onCopyLink={handleCopyLink}
      />
      
      <main className="container">
        <div className="layout">
          <ParametersPanel
            schema={schema}
            parameters={parameters}
            onChange={handleParameterChange}
          />
          
          <PreviewPanel
            stlData={stlData}
            previewState={previewState}
            error={error}
            onRender={handleRender}
            onDownload={handleDownload}
          />
        </div>
      </main>
      
      <footer className="footer">
        <p>
          Generated by OpenSCAD Assistive Forge •{' '}
          <a href="https://github.com/BrennenJohnston/openscad-assistive-forge">
            Source Code
          </a>
        </p>
      </footer>
    </div>
  );
}

export default App;
