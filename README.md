<div align="center">

<img src="./assets/nemax-logo-v2.png" width="180" alt="NEMAX Logo">

# ⚡ SPDA Risk Assessment Tool

### Lightning protection risk assessment, SPDA sizing and SPD zoning per ABNT NBR 5419:2026 (Parts 2, 3 and 4)

[![Live Demo](https://img.shields.io/badge/demo-live-brightgreen?style=for-the-badge)](https://itsnetomaset.github.io/spda-risk-assessment-nbr5419/)
![HTML](https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white)
![CSS](https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black)
![No Framework](https://img.shields.io/badge/dependencies-zero-blue?style=flat-square)
![Status](https://img.shields.io/badge/status-active-success?style=flat-square)

**[▶ Try the live demo](https://itsnetomaset.github.io/spda-risk-assessment-nbr5419/)**

</div>

---

## 📸 Preview

<p align="center">
  <img src="./assets/preview-wizard.png" alt="Analysis wizard, module 1 of 11" width="90%">
</p>
<p align="center">
  <img src="./assets/preview-dashboard.png" alt="Dashboard" width="90%">
</p>

---

## 🎯 The Problem

Risk assessment under NBR 5419-2 requires combining dozens of normative tables and structural/environmental parameters into a multi-step probability calculation. Commercial software for this is expensive, generic, and not built around how Brazilian engineers actually move through the standard section by section. Most practitioners fall back on spreadsheets that are error-prone and hard to audit.

## ✅ The Solution

A guided 11-module wizard that walks through the full NBR 5419 workflow: risk assessment per Part 2 (structure characterization through final risk comparison, R ≤ R_T), physical SPDA sizing per Part 3, surge protection measures (MPS) per Part 4, calculation memory and the final PDF report:

| Feature | Description |
|---|---|
| 🗺️ **Automatic N_G lookup** | Lightning flash density for any of Brazil's ~5,570 municipalities, sourced from the standard's official Table F.1 (Annex F) |
| 🧮 **Full calculation engine** | Implements the standard's risk components (R1 to R4) and loss factors |
| 🏗️ **SPDA sizing (Part 3)** | Physical dimensioning of the lightning protection system based on the selected protection level |
| 🔌 **Surge protection (Part 4)** | Lightning protection zones (ZPR 0A, 0B, 1, 2) and SPD (DPS) specification |
| 📑 **Calculation memory** | Step-by-step record of every input, table lookup and intermediate result |
| ✏️ **Auditable manual override** | Any auto-calculated value can be manually adjusted. The original normative value is always preserved |
| 💾 **Offline-first persistence** | Data saved locally via `localStorage`, with JSON export/import |
| 🖨️ **PDF report generation** | Native browser print engine, no server round-trip |

> **Note:** the tool's interface is in Portuguese, as it implements a Brazilian regulatory standard (NBR 5419) for the Brazilian engineering market.

## 🛠️ Tech Stack

Vanilla HTML, CSS and JavaScript. No framework, no build step, no dependencies. Single self-contained `index.html` (about 7,300 lines), runs entirely client-side.

## 💡 What I Learned

Translating a dense regulatory standard into a deterministic calculation engine meant treating the normative tables as the actual source of truth in code, not paraphrasing them, but encoding them exactly, with traceability back to the specific clause or table they came from. That discipline, and the manual-override-with-audit-trail pattern, came directly from real inspection work in the field, where what the norm says and what the engineer decided both have to stay auditable.

## 🚧 Roadmap

- [x] Part 3: physical SPDA sizing
- [x] Part 4: surge protection measures and SPD zoning
- [ ] Cross-module validation checks
- [ ] Interactive SVG schematic view
- [ ] Laudo (report) revision history

## 📌 Status

Actively used in real SPDA engineering work.

---

<div align="center">

Built by **[Giuseppe Maset Neto](https://nemaxengenharia.com.br)**, Electrical Engineer (CREA-PR 138473/D)

</div>
