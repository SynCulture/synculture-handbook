---
title: Glossary
subtitle: A working lexicon of terms, concepts, and naming conventions used across the Handbook.
permalink: /handbook/glossary/
---

The question of what to call the elementary unit of sound -- atom, grain, quantum, unit, sample, dictionary entry, event -- is not merely terminological. Each name carries a different lineage, commits the work to different conceptual operations, and implies a different ontology of sound. This glossary traces those commitments. Entries link back to the Handbook sections where each term appears in context.

<dl class="glossary-list">

<dt id="acoustical-quantum">acoustical quantum</dt>
<dd>Dennis Gabor's term (1947) for the elementary time-frequency cell of hearing: a short signal segment that is localised in both time and frequency, occupying a region in the joint time-frequency plane whose minimum area is bounded by the uncertainty principle. The concept challenged the Fourier-analytic view of sound as a sum of infinite sinusoidal components, proposing instead that any sound can be decomposed into finite, discrete units. Gabor introduced the more general term <a href="/handbook/glossary/#logon">logon</a> (1946) in his communication theory, where it denotes any elementary unit of information occupying one cell of the time-frequency plane; "acoustical quantum" is its application to hearing and sound. The quantum is a mathematical construct derived from information theory, not from compositional practice; its musical interpretation came later through Xenakis and Roads.
<span class="glossary-refs">See: <a href="/handbook/glossary/#logon">logon</a>, <a href="/handbook/glossary/#gabor-dennis">Gabor, Dennis</a>, <a href="/handbook/pulsar-synthesis/#genealogy">Pulsar Synthesis / Genealogy</a></span>
</dd>

<dt id="analysis-synthesis">analysis-synthesis loop</dt>
<dd>The iterative movement between decomposing existing sound into components (analysis) and constructing new sound from components (synthesis). Microsound and multi-resolution methods enter the loop through synthesis: the composer designs or specifies atoms and organises them. Concatenative and corpus-based methods enter through analysis: a corpus is decomposed into descriptor space, and synthesis selects and recombines. The loop between them -- not either pole alone -- is where contemporary compositional practice operates.
<span class="glossary-refs">See: <a href="/handbook/pulsar-synthesis/#aesthetics">Pulsar Synthesis / Aesthetics and cultural context</a></span>
</dd>

<dt id="atom">atom</dt>
<dd>In signal processing and sparse decomposition, an atom is an elementary waveform drawn from a dictionary. The signal is represented as a weighted sum of atoms selected from the dictionary by algorithms such as matching pursuit (Mallat and Zhang, 1993). The term emphasises the mathematical construction of the element: atoms are designed basis functions, not samples of recorded sound. In the microsound context, atoms are the micro-elements of multi-resolution methods -- wavelets, Gabor functions, chirplets -- whose shapes are determined by the decomposition framework rather than by a composer's decision.
<span class="glossary-refs">See: <a href="/handbook/pulsar-synthesis/#pulsaret-construction">Pulsar Synthesis / Pulsaret construction</a></span>
</dd>

<dt id="basis-function">basis function</dt>
<dd>In multi-resolution and wavelet analysis, a basis function is one member of a complete set of functions used to represent a signal. The choice of basis determines the decomposition: sinusoidal bases yield the Fourier transform; wavelet bases yield the wavelet transform; Gabor functions yield the short-time Fourier transform. In the micro-element context, the basis function is the atom of the mathematical framework -- its shape is determined by the analysis, not by a compositional decision, though the choice of which basis to use is itself a commitment with compositional consequences.
</dd>

<dt id="dictionary-entry">dictionary entry</dt>
<dd>In sparse decomposition and concatenative synthesis, a dictionary entry is a unit stored in a collection (the dictionary) from which signals are reconstructed by selection and combination. In mathematical decomposition, dictionary entries are designed functions (Gabor atoms, wavelets, chirplets). In corpus-based synthesis, dictionary entries are segments of recorded audio indexed by their acoustic descriptors. The distinction matters: when the dictionary is a recorded archive rather than a mathematical construction, each entry carries its own provenance, and the question of what selection means -- and what authorship becomes -- changes.
<span class="glossary-refs">See: <a href="/handbook/pulsar-synthesis/#aesthetics">Pulsar Synthesis / Aesthetics and cultural context</a></span>
</dd>

<dt id="duty-cycle">duty cycle</dt>
<dd>The ratio of active signal duration to total period in a pulse train. In pulsar synthesis, the duty cycle (or width) determines how much of each period is occupied by the pulsaret and how much is silence. Narrow duty cycles produce broadband, impulse-like spectra; wide duty cycles produce tonal spectra approaching a conventional oscillator. The parameter exposes a continuous transition between pitched tone and noise within a single mechanism.
<span class="glossary-refs">See: <a href="/handbook/pulsar-synthesis/#how-it-works">Pulsar Synthesis / How it works</a>, <a href="/handbook/pulsar-synthesis/#parameters">Pulsar Synthesis / Parameters</a></span>
</dd>

<dt id="event">event</dt>
<dd>A general term for a discrete occurrence in a temporal sequence, used across composition, algorithmic music, and signal processing. In the micro-element context, "event" is the least committed of the available terms: it names the fact of discrete occurrence without specifying the element's internal structure, its origin (designed or recorded), or the framework that produced it. Its neutrality is sometimes useful, but it forecloses the ontological distinctions that other terms make explicit.
<span class="glossary-refs">See: <a href="/handbook/pulsar-synthesis/#aesthetics">Pulsar Synthesis / Aesthetics and cultural context</a></span>
</dd>

<dt id="formant">formant</dt>
<dd>A resonant peak in the spectral envelope of a sound, typically associated with the resonances of the vocal tract or an acoustic body. In pulsar synthesis, formant structure arises from the interaction between the pulsaret waveform frequency and the fundamental frequency of the pulse train, without reference to any physical model. The decoupled formant parameter permits independent control of pitch and resonant structure, analogous to the source-filter model of speech but achieved through purely algorithmic means.
<span class="glossary-refs">See: <a href="/handbook/pulsar-synthesis/#how-it-works">Pulsar Synthesis / How it works</a>, <a href="/handbook/pulsar-synthesis/#parameters">Pulsar Synthesis / Parameters</a></span>
</dd>

<dt id="gabor-atom">Gabor atom</dt>
<dd>A Gaussian-windowed sinusoid (or complex exponential) used as an elementary time-frequency function. Gabor himself did not use this term; he called the elementary units "acoustical quanta" (1947) in the context of hearing and "logons" (1946) in his communication theory. The name "Gabor atom" was applied retrospectively by the signal processing and mathematical community to honour the origin of the idea. In time-frequency analysis, a Gabor atom is a modulated Gaussian that is maximally concentrated in the joint time-frequency plane, achieving the lower bound of the uncertainty principle. Gabor atoms form the basis of the Gabor transform (short-time Fourier transform with Gaussian window) and are the building blocks of Gabor dictionaries used in sparse decomposition methods such as matching pursuit.
<span class="glossary-refs">See: <a href="/handbook/glossary/#acoustical-quantum">acoustical quantum</a>, <a href="/handbook/pulsar-synthesis/#genealogy">Pulsar Synthesis / Genealogy</a></span>
</dd>

<dt id="gabor-dennis">Gabor, Dennis</dt>
<dd>Hungarian-British physicist (1900--1979), awarded the Nobel Prize in Physics in 1971 for the invention of holography. His earlier work on communication theory and hearing is foundational to microsound and time-frequency analysis. In "Theory of communication" (1946), Gabor proposed that signals can be decomposed into elementary cells -- logons -- that are jointly localised in time and frequency, with a minimum area bounded by the uncertainty principle. In "Acoustical quanta and the theory of hearing" (1947), he extended this framework to auditory perception, arguing that hearing operates on discrete time-frequency quanta rather than on continuous waveforms. These ideas challenged the prevailing Fourier-analytic model of sound and provided the theoretical foundation for granular synthesis, wavelet analysis, and the microsound paradigm. Gabor's quanta are analytical constructs from information theory; their reinterpretation as compositional primitives came through Xenakis and Roads.
<span class="glossary-refs">See: <a href="/handbook/glossary/#acoustical-quantum">acoustical quantum</a>, <a href="/handbook/glossary/#gabor-atom">Gabor atom</a>, <a href="/handbook/pulsar-synthesis/#genealogy">Pulsar Synthesis / Genealogy</a></span>
</dd>

<dt id="grain">grain</dt>
<dd>Iannis Xenakis's term for a short sonic particle used as a compositional primitive. Where Gabor's quantum is an analytical unit (decomposing an existing signal), Xenakis's grain is a constructive unit (building sound from elementary components). Grains are typically 1--100 ms in duration and are organised into clouds or streams governed by statistical distributions over time, frequency, amplitude, and duration. The term is now standard in the granular synthesis literature, where it usually refers to a short windowed segment of a stored sound or synthetic waveform.
<span class="glossary-refs">See: <a href="/handbook/pulsar-synthesis/#genealogy">Pulsar Synthesis / Genealogy</a>, <a href="/handbook/pulsar-synthesis/#pulsaret-construction">Pulsar Synthesis / Pulsaret construction</a></span>
</dd>

<dt id="klangbaustein">Klangbaustein</dt>
<dd>German for "sound building block." A term from early Elektronische Musik (Cologne studio, 1950s) for a pre-composed sonic element assembled into larger structures. A Klangbaustein is not the equipment itself (the tone generators, filters, and noise generators of the studio) but the composed result: a sinusoidal tone at a specific pitch and duration, a filtered noise band with a prescribed bandwidth and envelope, or a shaped impulse sequence, each determined by serial parameters before being assembled into larger forms. Stockhausen's <em>Studie I</em> (1953) and <em>Studie II</em> (1954) are the canonical works built from Klangbausteine. The Klangbaustein is a precursor to the grain and the pulsaret, but it operates at a longer time scale and within a different aesthetic framework: the serial organisation of discrete sound objects rather than the statistical distribution of micro-particles.
<span class="glossary-refs">See: <a href="/handbook/pulsar-synthesis/#pulsaret-construction">Pulsar Synthesis / Pulsaret construction</a></span>
</dd>

<dt id="logon">logon</dt>
<dd>Gabor's term (1946) for the elementary unit of information in his communication theory: a signal element that occupies one cell of minimum area in the joint time-frequency plane. The logon is the general concept; the <a href="/handbook/glossary/#acoustical-quantum">acoustical quantum</a> is its specific application to hearing. Gabor derived the logon from the uncertainty principle: a signal cannot be simultaneously localised with arbitrary precision in both time and frequency, so the smallest meaningful unit is a cell whose time-bandwidth product is bounded from below. Each logon carries one quantum of information. The term never gained wide currency outside Gabor's own writings, but the underlying idea -- that signals are best represented as collections of jointly localised time-frequency atoms rather than as sums of infinite sinusoids -- became foundational to wavelet theory, the short-time Fourier transform, and the microsound paradigm.
<span class="glossary-refs">See: <a href="/handbook/glossary/#acoustical-quantum">acoustical quantum</a>, <a href="/handbook/glossary/#gabor-atom">Gabor atom</a>, <a href="/handbook/glossary/#gabor-dennis">Gabor, Dennis</a></span>
</dd>

<dt id="microsound">microsound</dt>
<dd>The domain of sound phenomena and compositional methods operating at time scales below the note and above the individual sample -- roughly 1 microsecond to 100 milliseconds. The term was codified by Curtis Roads in <em>Microsound</em> (2001) as a framework encompassing granular synthesis, pulsar synthesis, and related particle-based techniques. Microsound is both a compositional paradigm (building sound from particles) and an analytical claim about the structure of sound itself.
<span class="glossary-refs">See: <a href="/handbook/pulsar-synthesis/#overview">Pulsar Synthesis / Overview</a>, <a href="/handbook/pulsar-synthesis/#aesthetics">Pulsar Synthesis / Aesthetics and cultural context</a></span>
</dd>

<dt id="nonstandard-synthesis">nonstandard synthesis</dt>
<dd>A category proposed by Berg, Holtzman, and others for synthesis methods that specify sound algorithmically rather than by modelling a physical vibrating system. Where "standard" synthesis refers to techniques grounded in acoustical models (physical modelling, additive synthesis of harmonic partials), nonstandard synthesis generates sound from formal procedures whose relationship to physical sound production is indirect or absent. Pulsar synthesis, granular synthesis, and stochastic synthesis all fall within this category.
<span class="glossary-refs">See: <a href="/handbook/pulsar-synthesis/#aesthetics">Pulsar Synthesis / Aesthetics and cultural context</a></span>
</dd>

<dt id="pulsaret">pulsaret</dt>
<dd>Curtis Roads's term for the elementary sonic particle in pulsar synthesis: the product of a pulsaret waveform table and a pulsaret envelope table, multiplied sample by sample. The pulsaret is distinguished from the grain by its architectural separation of waveform and envelope into independently controllable parameters, and from the atom by its origin in compositional design rather than mathematical decomposition. The name itself signals a diminutive of "pulse," placing the technique within the pulse-train lineage of classical electronic music while marking its microsound-scale operation.
<span class="glossary-refs">See: <a href="/handbook/pulsar-synthesis/#pulsaret-construction">Pulsar Synthesis / Pulsaret construction</a>, <a href="/handbook/pulsar-synthesis/#how-it-works">Pulsar Synthesis / How it works</a></span>
</dd>

<dt id="sample">sample</dt>
<dd>In the micro-element context (distinct from "sample" as a digital recording), a sample refers to a single amplitude value at one point in time -- the minimal discrete unit of a digital audio signal. Roads distinguishes the pulsaret from the sample on the grounds that a single sample has no envelope shaping and no internal waveform structure. The term is also used in corpus-based and concatenative synthesis to mean a short recorded excerpt treated as a unit of selection and recombination, carrying provenance from its source recording.
<span class="glossary-refs">See: <a href="/handbook/pulsar-synthesis/#pulsaret-construction">Pulsar Synthesis / Pulsaret construction</a></span>
</dd>

<dt id="sparse-decomposition">sparse decomposition</dt>
<dd>A signal representation strategy in which a signal is expressed as a weighted sum of a small number of elements (atoms) drawn from a larger dictionary. Matching pursuit (Mallat and Zhang, 1993), basis pursuit, and dictionary learning algorithms all operate within this framework. The mathematical machinery is shared between multi-resolution methods (where dictionaries are designed) and corpus-based methods (where dictionaries are derived from recorded audio). The bridge between these two configurations is direct, though their compositional and ontological implications differ.
</dd>

<dt id="time-scales">time scales</dt>
<dd>Roads's taxonomy of temporal levels in electronic music, ranging from the infinite (the longest compositional spans) through the macro, meso, sound object, micro (the granular domain), and sample scales, down to the sub-sample and infinitesimal. The time scale continuum is central to the microsound thesis: it proposes that rhythm and pitch are not categorically different but endpoints of a single parametric axis, and that compositional control can be exercised at any level of the continuum.
<span class="glossary-refs">See: <a href="/handbook/pulsar-synthesis/#aesthetics">Pulsar Synthesis / Aesthetics and cultural context</a></span>
</dd>

<dt id="unit">unit</dt>
<dd>A generic term for the elementary component of a synthesis or compositional process. "Unit" appears in the compound "unit generator" (UGen), Max Mathews's term for a modular signal-processing block in MUSIC III (1962) and its descendants. In the micro-element debate, "unit" shares the neutrality of "event" but carries an additional connotation of modularity and interchangeability -- units are defined by their role in a system rather than by their internal properties.
</dd>

</dl>
