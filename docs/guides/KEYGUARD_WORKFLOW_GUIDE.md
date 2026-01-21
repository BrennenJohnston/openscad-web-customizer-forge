# AAC Keyguard Customization Workflow Guide

This guide provides step-by-step instructions for clinicians, occupational therapists, speech-language pathologists, and caregivers who are customizing AAC (Augmentative and Alternative Communication) keyguards using OpenSCAD Assistive Forge.

## Table of Contents

- [What Are AAC Keyguards?](#what-are-aac-keyguards)
- [Why Use This Customizer?](#why-use-this-customizer)
- [Before You Begin](#before-you-begin)
- [Quick Start Workflow](#quick-start-workflow)
- [Detailed Parameter Guide](#detailed-parameter-guide)
- [Iteration and Trial Fitting](#iteration-and-trial-fitting)
- [Collaboration with Clients](#collaboration-with-clients)
- [3D Printing Considerations](#3d-printing-considerations)
- [Troubleshooting](#troubleshooting)

---

## What Are AAC Keyguards?

AAC keyguards are physical overlays placed on tablets or speech-generating devices (SGDs) that help users with motor challenges accurately select buttons on their communication apps. Keyguards feature raised edges around each target area, providing tactile feedback and preventing accidental touches on adjacent cells.

### Common Use Cases

- **Grid-based AAC apps** (e.g., TouchChat, Proloquo2Go, LAMP Words for Life)
- **Hybrid layouts** with combination of buttons and text
- **Custom layouts** for specific users' vocabularies

### Benefits of 3D-Printed Keyguards

- **Cost-effective**: No expensive commercial ordering required
- **Rapid iteration**: Adjust and reprint in hours, not weeks
- **Perfect customization**: Tailored to each client's exact needs
- **Client involvement**: Allow users to try different configurations

---

## Why Use This Customizer?

Traditional keyguard creation methods require:
- Installing OpenSCAD desktop software
- Learning CAD programming
- Manually editing code to change parameters

**This web customizer removes all those barriers:**

✅ No installation required—works in any browser  
✅ Visual parameter controls—no coding needed  
✅ Instant 3D preview—see changes immediately  
✅ Save presets—reuse configurations across clients  
✅ Share parameters—collaborate with colleagues  

---

## Before You Begin

### What You Need

1. **Device measurements**: Tablet dimensions, screen size, bezel width
2. **App grid info**: Number of rows and columns in AAC app
3. **User needs**: Motor challenges, hand size, preferred activation force
4. **Access to 3D printer**: Or a printing service

### Gather This Information

- **Device model** (e.g., iPad 10.2", Samsung Tab A 10.1")
- **AAC app grid** (e.g., 4×7, 8×6, custom layout)
- **Button size in app** (usually displayed in app settings)
- **Current keyguard issues** (if replacing existing):
  - Holes too big or too small?
  - Rails too high or too low?
  - Not enough spacing between holes?
  - Material too flexible or too rigid?

---

## Quick Start Workflow

### Step 1: Load a Keyguard Model

1. Visit the OpenSCAD Assistive Forge
2. Click **"Load Example"** (if available) or **"Upload .scad file"**
3. Popular keyguard models:
   - **Volksswitch Keyguard** (flexible, grid-based, well-documented)
   - Device-specific models from OpenAT library

💡 **Tip**: Start with Volksswitch if customizing for grid-based apps on tablets.

### Step 2: Set Basic Parameters

Adjust these key parameters first:

#### Grid Configuration
- `rows`: Number of button rows (e.g., 5)
- `columns`: Number of button columns (e.g., 8)
- `grid_spacing`: Distance between button centers (match app settings)

#### Hole Dimensions
- `hole_width`: Width of each button opening (typically 10-20mm)
- `hole_height`: Height of each button opening
- `hole_shape`: "rectangle" or "rounded" (rounded reduces catching)

#### Rail Height
- `rail_height`: How tall the raised edges are (typically 2-5mm)
  - Start with 3mm for most users
  - Increase to 4-5mm for users who need more guidance
  - Decrease to 2mm for users who find high rails restrictive

#### Base Plate
- `base_thickness`: Bottom plate thickness (1.5-3mm typical)
- `corner_radius`: Rounded corners for safety and comfort

### Step 3: Generate Preview

1. Click **"Generate Model"**
2. Wait for 3D preview to load (usually 10-30 seconds)
3. Use mouse or camera controls to inspect:
   - Hole alignment
   - Rail height consistency
   - Corner clearances
   - Overall fit

### Step 4: Download and Print

1. Select output format: **STL** (most common for 3D printing)
2. Click **"Download"**
3. Import STL into your slicer software (e.g., Cura, PrusaSlicer)
4. Print settings recommendations:
   - **Material**: PETG or PLA (PETG more flexible and durable)
   - **Layer height**: 0.2mm (balance speed and quality)
   - **Infill**: 20-30% (adequate strength, faster printing)
   - **Supports**: Usually not needed for keyguards
   - **Print time**: 2-6 hours depending on size

### Step 5: Test and Iterate

1. Place printed keyguard on device
2. Test with client:
   - Can they accurately hit targets?
   - Are holes too big (unintended activations) or too small (difficulty hitting)?
   - Are rails comfortable height?
3. Document needed adjustments
4. Return to Step 2 with refined parameters
5. Repeat until perfect fit

---

## Detailed Parameter Guide

### Essential Parameters

#### `grid_rows` and `grid_columns`
**What it controls**: Number of buttons in your AAC app layout

**How to find**: Open AAC app → Settings → Grid Size  
**Typical values**: 3×5 (beginner), 5×8 (intermediate), 8×12 (advanced)

**Example**: TouchChat with 40-location grid = 5 rows × 8 columns

---

#### `button_width` and `button_height`
**What it controls**: Size of each touchable button area

**How to find**:
1. Measure on-screen button in app (use ruler or calipers)
2. Or calculate: `screen_width ÷ number_of_columns`

**Typical values**: 15-25mm depending on device size

**Adjustment tips**:
- **Too small**: User misses targets → increase 1-2mm
- **Too large**: User hits adjacent buttons → decrease 1-2mm

---

#### `hole_width` and `hole_height`
**What it controls**: Opening size in keyguard for finger access

**Rule of thumb**: Make holes **2-4mm smaller** than button size
- Provides tactile guidance
- Prevents edge-of-button taps

**Example**: If button is 20mm wide, hole should be 16-18mm

**Special considerations**:
- **Small hands/children**: Smaller holes okay (more guidance)
- **Large hands/adult**: Larger holes (avoid finger catching)
- **Stylus users**: Can use smaller holes

---

#### `rail_height`
**What it controls**: How tall the raised edges are around holes

**Typical range**: 2-5mm

| Height | Best For |
|--------|----------|
| 2mm | Users with good fine motor control; reduced catching |
| 3mm | **Most common starting point**; good balance |
| 4mm | Users who need more tactile guidance |
| 5mm | Users with significant motor challenges or tremor |

**Signs of incorrect height**:
- **Too low**: User frequently hits adjacent buttons
- **Too high**: User reports fingers catching, frustration

---

#### `base_thickness`
**What it controls**: Thickness of bottom plate

**Typical range**: 1.5-3mm

**Recommendations**:
- **1.5mm**: Minimum for rigidity; keeps keyguard thin
- **2mm**: Standard; good balance of strength and weight
- **3mm**: Extra rigidity for users who press hard

**Trade-off**: Thicker = stronger but heavier and longer print time

---

### Advanced Parameters

#### `corner_radius`
Rounds the corners of holes and outer edges. Reduces sharp edges that can cause discomfort.

**Typical value**: 2-4mm

---

#### `border_width`
Extra space around the outer edge of the grid before device edge.

**Typical value**: 5-10mm

---

#### `color` (if available)
Some models support color parameters for multi-material or painting.

**Black keyguards** often recommended for CVI (Cortical Visual Impairment) users due to high contrast.

---

## Iteration and Trial Fitting

### The Trial-and-Error Approach

Keyguard fitting is **iterative**—expect 2-4 test prints before achieving perfect fit.

#### Iteration Cycle

1. **Print initial version** (use fastest print settings)
2. **Test with client** (document observations)
3. **Adjust 1-2 parameters**
4. **Print again**
5. **Compare versions side-by-side**

### What to Document

Keep notes for each version:

| Version | Rails | Hole Size | Observations |
|---------|-------|-----------|--------------|
| v1 | 3mm | 18mm | Rails too low, some misses |
| v2 | 4mm | 18mm | Better accuracy, holes slightly big |
| v3 | 4mm | 16mm | **Perfect fit!** |

### Time-Saving Tips

- **Print just one quadrant** for initial testing (modify model to reduce print time)
- **Use draft quality** for test prints (0.3mm layer height)
- **Test on paper first**: Print a 2D template to verify hole placement before 3D printing

---

## Collaboration with Clients

### Client-Centered Design

Involve users in the customization process:

1. **Show previews**: Rotate 3D model and explain changes
2. **Explain parameters**: "This makes the walls around buttons taller"
3. **Get feedback**: "Do you want the edges higher or lower?"
4. **Document preferences**: Save final settings with client name

### Sharing Configurations

#### Between Clinician and Client

1. Generate configuration
2. Advanced menu → "View Params JSON"
3. Copy to clipboard
4. Paste into email or shared document
5. Client's clinician can load JSON and regenerate exact model

#### Between Sites

- Share preset files with colleagues
- Document parameter values in therapy notes
- Include in client's assistive technology report

---

## 3D Printing Considerations

### Material Recommendations

| Material | Pros | Cons | Best For |
|----------|------|------|----------|
| **PETG** | Flexible, durable, food-safe | Slightly harder to print | Most keyguards |
| **PLA** | Easy to print, rigid | Brittle, less durable | Prototyping |
| **TPU** | Very flexible, soft | Requires special printer settings | Users who need cushioning |
| **ABS** | Strong, heat-resistant | Warping issues, fumes | High-wear environments |

**Recommendation**: **PETG** for production keyguards, **PLA** for test prints.

---

### Print Settings

#### Optimal Settings
- **Layer height**: 0.2mm (or 0.15mm for smoother finish)
- **Infill**: 20-30%
- **Wall thickness**: 3-4 perimeters
- **Top/bottom layers**: 4-5 layers
- **Support**: Usually none (keyguards print flat)
- **Bed adhesion**: Brim or raft if first layer issues

#### Quality vs. Speed
- **Draft** (0.3mm, 15% infill): 2 hours, good for testing
- **Standard** (0.2mm, 25% infill): 4 hours, everyday use
- **High** (0.15mm, 30% infill): 6+ hours, final version

---

### Post-Processing

1. **Remove brim/raft** carefully with flush cutters
2. **Sand edges** if needed (220-grit sandpaper)
3. **Test fit** on device before giving to client
4. **Clean** with isopropyl alcohol before first use

---

## Troubleshooting

### Common Issues and Solutions

#### "Holes don't line up with app buttons"

**Causes**:
- Incorrect `grid_spacing` or `button_width` parameters
- Device dimensions don't match model

**Solutions**:
1. Verify app's actual button spacing (measure with ruler)
2. Check device model matches keyguard design
3. Adjust `grid_spacing` in 0.5mm increments

---

#### "Keyguard doesn't fit on device"

**Causes**:
- Device dimensions parameter incorrect
- Camera/button cutouts not aligned
- Corners don't match device curves

**Solutions**:
1. Verify device model number
2. Check for device case (keyguards usually designed for bare devices)
3. Adjust `device_width` and `device_height` parameters

---

#### "Rails too high—user's fingers catch"

**Solutions**:
- Reduce `rail_height` by 0.5-1mm
- Consider `hole_shape: "rounded"` to reduce catching
- Increase `hole_width` slightly to give more clearance

---

#### "User still hits adjacent buttons"

**Solutions**:
- Increase `rail_height` by 0.5-1mm
- Decrease `hole_width` to provide more tactile boundary
- Check if app has "touch guard" settings to reduce accidental touches

---

#### "Print failed or warped"

**Causes**:
- Bed adhesion issues
- Temperature too low
- Cooling too aggressive

**Solutions**:
- Use brim or raft for first layer
- Increase bed temperature by 5°C
- Reduce cooling fan speed for first few layers

---

## Resources and References

### Example Keyguard Models

- **Volksswitch Keyguard**: [volksswitch.org](https://volksswitch.org)
- **Forbes AAC Master Keyguards**: [forbesaac.com](https://www.forbesaac.com/)
- **OpenAT Resources**: [Makers Making Change OpenAT](https://makersmakingchange.github.io/OpenAT-Resources/)

### AAC App Resources

- **TouchChat** (PRC-Saltillo)
- **Proloquo2Go** (AssistiveWare)
- **LAMP Words for Life** (PRC-Saltillo)
- **Grid 3** (Smartbox Assistive Technology)

### 3D Printing Guides

- [3D Printing for Accessibility](https://printdisability.org/about-us/accessible-graphics/3d-printing/)
- [AT Maker Community Forums](https://www.atmakers.org/forums/)

---

## Getting Help

If you encounter issues:

1. Review this guide
2. Check [ACCESSIBILITY_GUIDE.md](./ACCESSIBILITY_GUIDE.md) for interface help
3. Post on GitHub Issues with:
   - Device model
   - AAC app being used
   - Parameter values tried
   - Photos of failed prints/fits

---

**Last Updated**: 2026-01-18  
**Version**: 2.4.0+  
**Maintained by**: OpenSCAD Assistive Forge community
