# Characterization baseline

`baseline.json` records what the original single-file app (commit `9aac33e`, one `index.html` of about 7,300 lines) calculated before the engine was split into modules.

It was produced by running `scenarios.js` inside that `index.html` in headless Chromium, calling the app's own globals (`Calculo.executar`, `calcularR4`, `M_MPS.calcularPontoDPS`, `M_MPS.calcularAvaliacaoCampo`, `calcularQuantitativoMateriais` and the `NEMAX_CALC*` engines). Two consecutive runs produced byte-identical output.

The scenarios cover:

- 9 complete analyses (residential, commercial, industrial with explosion risk, hospital, school, public area, edge cases such as missing N_G or a withstand voltage outside Table B.8), each with the risk result and its full calculation memory, the Annex D economic risk (R4) and the Part 3 material estimate;
- 12 surge protective device points (Part 4, Annex C);
- 16 magnetic field and induced voltage evaluations (Part 4, Annex A);
- direct sweeps over every exported function and table of the Part 2, 3 and 4 engines;
- a hash of the 5,572-row N_G municipality table (Part 2, Annex F).

`test/characterization.test.js` runs the same scenarios against the ES modules in `src/` under Node. Texts, flags and structure must match exactly; numbers are compared with a relative tolerance of 1e-12, because Node and Chromium ship different V8 versions whose transcendental functions (`Math.tan`, `Math.cbrt`, `Math.pow`) can differ in the last bit (38 of the recorded values differ, by at most 4e-16 relative). In Chromium, the refactored app reproduces the baseline bit for bit, including the HTML of all 11 wizard modules and of the printed report. The only field excluded is the `calculadoEm` timestamp.

The baseline must not be regenerated to make a test pass. A difference means behavior changed: either fix the code or, if the change is an intentional correction, update the baseline in its own commit that explains why.

## Intentional changes since the original baseline

Each correction below changed the expected results on purpose. The baseline was recaptured in Chromium in the same commit, and the diff was checked to contain only the entries listed.

- **NBR 5419-4, C.2.1.9 c), critical systems.** The original marked an SPD as protecting a critical system when condition b) (U_p/f ≤ 0.8 · U_W) was met. For a critical system with a circuit of up to 10 m only condition c) (U_p/f ≤ 0.5 · U_W) applies, so a) and b) are now reported as not applicable. Changed: SPD point `limitador_critico` and sweep cases `p4.condicoes[4]` and `[5]` (case 5 is no longer protected).
- **NBR 5419-3, Figure 1, protection level III.** The digitized curve ends at H = 44.71 m, while the method applies up to H_max = 45 m. Between the two, the original interpolated along the chord from the first to the last vertex (α = 22.20° at 45 m); the last segment of the curve is now extended (α = 22.30°). Changed: sweep case `p3.angulo[56]` (NP III, H = 45 m).
- **Interface, N_G = 0.** Table F.1 lists Fernando de Noronha with N_G = 0; the wizard now accepts it as a completed atmospheric input. No calculated value in the baseline changed.
