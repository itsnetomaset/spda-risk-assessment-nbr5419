<div align="center">

<img src="./assets/nemax-logo.png" width="180" alt="NEMAX Logo">

# ⚡ SPDA Risk Assessment Tool

### Automated lightning protection risk assessment per ABNT NBR 5419-2:2026

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

> _Add a screenshot or short GIF of the wizard here — this is the single highest-impact addition you can make. A 10-second screen recording converted to GIF works great._
> `![Preview](./assets/preview.gif)`

---

## 🎯 The Problem

Risk assessment under NBR 5419-2 requires combining dozens of normative tables and structural/environmental parameters into a multi-step probability calculation. Commercial software for this is expensive, generic, and not built around how Brazilian engineers actually move through the standard section by section. Most practitioners fall back on spreadsheets — error-prone and hard to audit.

## ✅ The Solution

A guided 9-module wizard that walks through the full NBR 5419-2 risk assessment process — from structure characterization to final risk comparison (R ≤ R_T):

| Feature | Description |
|---|---|
| 🗺️ **Automatic N_G lookup** | Lightning flash density for any of Brazil's ~5,570 municipalities, sourced from the standard's official Table F.1 (Annex F) |
| 🧮 **Full calculation engine** | Implements the standard's risk components (R1–R4) and loss factors |
| ✏️ **Auditable manual override** | Any auto-calculated value can be manually adjusted — the original normative value is always preserved |
| 💾 **Offline-first persistence** | Data saved locally via `localStorage`, with JSON export/import |
| 🖨️ **PDF report generation** | Native browser print engine, no server round-trip |

> **Note:** the tool's interface is in Portuguese, as it implements a Brazilian regulatory standard (NBR 5419) for the Brazilian engineering market.

## 🛠️ Tech Stack

Vanilla HTML/CSS/JavaScript — no framework, no build step, no dependencies. Single self-contained file (~7,300 lines), runs entirely client-side.

## 💡 What I Learned

Translating a dense regulatory standard into a deterministic calculation engine meant treating the normative tables as the actual source of truth in code — not paraphrasing them, but encoding them exactly, with traceability back to the specific clause/table they came from. That discipline — and the manual-override-with-audit-trail pattern — came directly from real inspection work in the field, where "what the norm says" vs. "what the engineer decided" has to stay auditable.

## 🚧 Roadmap

- [ ] Part 4 — internal electronic systems / SPD zoning
- [ ] Cross-module validation checks
- [ ] Interactive SVG schematic view
- [ ] Laudo (report) revision history

## 📌 Status

Actively used in real SPDA engineering work.

---

<div align="center">

Built by **[Giuseppe Maset Neto](https://nemaxengenharia.com.br)** — Electrical Engineer (CREA-PR 138473/D)

</div>
