# Third-Party Notices

This document lists the third-party software used by OpenSCAD Assistive Forge and the web applications it generates.

## OpenSCAD (GPL-2.0-or-later)

Generated web applications include OpenSCAD compiled to WebAssembly (WASM) for client-side STL generation.

**License**: GNU General Public License v2.0 or later
**Project**: https://openscad.org/
**Source Code**: https://github.com/openscad/openscad
**WASM Build**: Official OpenSCAD Playground build (includes Manifold support)
**Build Source**: https://files.openscad.org/playground/
**Build Date**: March 25, 2025 (OpenSCAD-2025.03.25.wasm24456-WebAssembly-web)
**Vendored Location**: `public/wasm/openscad-official/`

### Manifold Geometry Library

This build includes the Manifold geometry library for dramatically faster CSG operations:

**License**: Apache-2.0
**Project**: https://github.com/elalish/manifold
**Performance**: 5-30x faster boolean operations, 10-30x faster Minkowski operations

### GPL Compliance for Generated Web Apps

When you deploy a generated web application that includes OpenSCAD WASM:

1. **You must provide access to the OpenSCAD source code** — either by:
   - Linking to the official GitHub repository, or
   - Hosting the source code yourself, or
   - Offering to provide the source upon request

2. **You must include this notice** (or equivalent) in your deployed application's "About" or "Licenses" section

3. **The GPL applies to OpenSCAD and this tool**, which means:
   - Your `.scad` model files retain your license
   - The web application (including OpenSCAD WASM) is GPL-3.0-or-later
   - Your parameter configurations are not affected
   - Generated STL files (data output) are not GPL-licensed
   - The Manifold library (Apache-2.0) is compatible with GPL

### Obtaining OpenSCAD Source

The source code for OpenSCAD is available at:
- https://github.com/openscad/openscad
- https://github.com/openscad/openscad-wasm (WASM port)
- https://github.com/openscad/openscad-playground (playground build system)

To build OpenSCAD WASM from source, see:
- https://github.com/openscad/openscad-wasm

---

## Three.js (MIT)

Generated web applications use Three.js for 3D preview rendering.

**License**: MIT License
**Project**: https://threejs.org/
**Source Code**: https://github.com/mrdoob/three.js

```
MIT License

Copyright © 2010-2024 three.js authors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```

---

## JSON Schema (Various)

This tool uses JSON Schema (draft 2020-12) for parameter validation.

**Specification**: https://json-schema.org/
**License**: The JSON Schema specification is available under various open licenses

---

## Reference Projects

This tool was inspired by patterns from:

### openscad-web-gui (Reference Only)
- **License**: GPL-3.0
- **Source**: https://github.com/seasick/openscad-web-gui
- **Note**: Referenced for architecture patterns; code is not directly included

---

## Your Model Files

The `.scad` files you process with this tool retain their original license. This tool does not change the licensing of your parametric models.

If your model is licensed under a permissive license (MIT, Apache-2.0, CC0, etc.), the generated web app can be distributed freely (subject to OpenSCAD GPL compliance).

If your model is licensed under GPL or a similar copyleft license, the generated web app may have additional distribution requirements beyond OpenSCAD's.

---

## Trademarks / No Affiliation

Any third-party product names, company names, or logos mentioned in this repository (including in historical references) are the property of their respective owners.

- Such mentions are for **identification/informational purposes only**.
- This project is **not affiliated with, sponsored by, or endorsed by** any third parties unless explicitly stated.
- Do **not** use third-party logos or branding in this project without permission.

---

## Rendering Techniques & References

### Shape-Vector Character Rendering

Certain rendering techniques in this project were inspired by research and educational articles on advanced character-based rendering approaches.

**Reference**: Alex Harri, character-based rendering technique article  
**URL**: https://alexharri.com/blog/ascii-rendering  
**Usage**: Educational reference for technique concepts  
**Note**: Implementation is original/clean-room; no code was copied

### Three.js Examples Modules (MIT)

This project uses modules from the Three.js examples collection (e.g., controls and loaders).

**License**: MIT (covered by the Three.js license above)  
**Source**: https://github.com/mrdoob/three.js/tree/dev/examples

---

## Questions?

For licensing questions about:
- **This tool** → See [LICENSE](LICENSE) (GPL-3.0-or-later)
- **OpenSCAD** → See https://openscad.org/about.html
- **Your models** → Consult your own licensing terms
