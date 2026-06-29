---
title: Pulsar Synthesis
subtitle: A microsound technique for generating pitched tones, noise bands, and rhythmic textures from trains of electronically generated sonic particles.
author: Marcin Pietruszewski
year: "1990s"
permalink: /handbook/pulsar-synthesis/
toc:
  - id: overview
    text: Overview
  - id: genealogy
    text: Genealogy
  - id: pulsaret-construction
    text: Pulsaret construction
  - id: how-it-works
    text: How it works
  - id: parameters
    text: Parameters
  - id: code-examples
    text: Code examples
  - id: instrumental-implementations
    text: Instrumental implementations
  - id: aesthetics
    text: Aesthetics and cultural context
  - id: references
    text: References
references:
  - "Roads, C. (2001). <em>Microsound</em>. Cambridge, MA: MIT Press."
  - "Roads, C. (2004). Point, line, cloud: the legacy of Iannis Xenakis. In <em>Presences of Iannis Xenakis</em>, ed. M. Solomos. Paris: CDMC."
  - "Roads, C. (2001). Sound composition with pulsars. <em>Journal of the Audio Engineering Society</em>, 49(3), 134-147."
  - "Gabor, D. (1946). Theory of communication. Part 1: The analysis of information. <em>Journal of the Institution of Electrical Engineers</em>, 93(26), 429-441."
  - "Gabor, D. (1947). Acoustical quanta and the theory of hearing. <em>Nature</em>, 159(4044), 591-594."
  - "Xenakis, I. (1971). <em>Formalized Music: Thought and Mathematics in Composition</em>. Bloomington: Indiana University Press."
  - "Xenakis, I. (1992). <em>Formalized Music</em>. Rev. ed. Stuyvesant, NY: Pendragon Press."
  - "Roads, C. (2020). <em>Composing Electronic Music: A New Aesthetic</em>. Rev. ed. New York: Oxford University Press."
  - "De Campo, A. (2004). Microsound. In N. Collins and J. d'Escrivan (eds.), <em>The Cambridge Companion to Electronic Music</em>. Cambridge University Press."
  - "Pietruszewski, M. (2021). New Pulsar Generator (nuPG). Software."
related:
  - slug: granular-synthesis
    title: Granular Synthesis
  - slug: fm-synthesis
    title: FM Synthesis
  - slug: additive-synthesis
    title: Additive Synthesis
---

## Overview

Pulsar synthesis generates electronic sound from trains of sonic particles called *pulsarets*. Each pulsaret is a brief waveform, typically lasting between a few microseconds and around 50 milliseconds, shaped by an amplitude envelope. These particles are emitted in periodic or stochastic trains. When the train rate enters the audio frequency range (above roughly 20 Hz), the result is a pitched tone whose timbre is determined by the waveform and envelope of the individual pulsaret. Below audio rate, the train is perceived as a rhythm.

The technique was proposed by Curtis Roads in the late 1990s and formalised in *Microsound* (2001). It belongs to the broader family of particle-based synthesis methods that descend from Dennis Gabor's {% xref "acoustical-quanta", "acoustical quanta" %} (1946, 1947) and Iannis Xenakis's work on {% xref "granular-synthesis", "granular synthesis" %}.

Pulsar synthesis differs from granular synthesis in several respects. Where granular synthesis typically works with stored sound samples or sustained grains of synthetic waveforms, pulsar synthesis operates with electronically generated particles whose waveform and envelope are independently variable parameters. The separation of *pulsaret waveform* (which determines spectral content) from *pulsaret envelope* (which determines bandwidth and formant structure) gives the technique a distinctive parametric architecture.

## Genealogy

The intellectual lineage of pulsar synthesis passes through several key moments in the history of sound synthesis and acoustics:

**Dennis Gabor (1946-1947)** proposed that any sound can be decomposed into elementary acoustical quanta -- short time-frequency atoms. This insight, developed alongside his work on communication theory, challenged the prevailing Fourier-analytic view of sound as a sum of infinite sinusoidal components. Gabor's quanta are finite in both time and frequency, occupying a cell in the joint time-frequency plane whose minimum area is bounded by the uncertainty principle.

**Iannis Xenakis (1960s-1970s)** developed the first practical methods for composing with sonic particles. His concept of *sound clouds* -- statistical distributions of grains across time, frequency, amplitude, and duration -- provided a compositional framework for microsound. Xenakis implemented granular textures in works such as *Analogique A-B* (1959) and later in software including {% xref "gendyn", "GENDYN" %} (1991), which generated sound at the sample level through stochastic procedures.

**Curtis Roads (1978-2001)** extended both Gabor and Xenakis through sustained practical and theoretical work on granular and particle-based synthesis. Roads's contribution with pulsar synthesis specifically was to identify a parametric space within the particle paradigm that had not been systematically explored: the independent control of pulsaret waveform, pulsaret envelope, and train characteristics (fundamental frequency, density, regularity). The technique draws on classical signal processing concepts (pulse trains, duty cycle, formant synthesis) but reconfigures them within the {% xref "microsound", "microsound" %} framework.

The following SC2 code is the original basic pulsar synthesis instrument by Curtis Roads (1997). It declares wavetables for the pulsaret waveform, amplitude, fundamental frequency, formant frequency, and spatial position. Each parameter is read from a control table via `Ktransient`, and `Apulse` generates the pulsarets. The binary `.Synth` file also contains the wavetable data itself (waveform, envelopes, control trajectories) as embedded float arrays.

<figure class="code-historical">

```lua
-- P U L S A R  S Y N T H E S I S
-- Copyright 1997 Curtis Roads

-- A basic pulsar generator, with envelopes for:
--  overall amplitude of a pulsar train
--  fundamental frequency
--  formant frequency
--  spatial envelope
-- The pulsaret waveform is arbitrary and can be changed.

-- Declare the outputs
defaudioout L, R;

-- Declare the wave tables and envelopes
deftable wave, ampl, fundamental, formant, spatial_position;

start {

    -- Declare local variables
    var pulsar, a_env, fun_env, form_env, pos_env, dur;

    dur = 10.0;

    a_env = Ktransient(ampl, dur, 1, 0, `dspRemove);
    fun_env = Ktransient(fundamental, dur, 1, 0, `dspRemove);
    form_env = Ktransient(formant, dur, 1, 0, `dspRemove);
    pos_env = Ktransient(spatial_position, dur, 1, 0, `dspRemove);

    pulsar = Apulse(wave, 0, 0);

    {   (pulsar.value(fun_env.value, form_env.value) *! a_env.value)
                .pan2out(pos_env.value, L, R);
    }.dspAdd;
}
```

<figcaption>Fig. 01. Basic pulsar synthesis instrument in SuperCollider 2. The <code>Apulse</code> UGen reads an arbitrary pulsaret waveform and is controlled by wavetable-driven envelopes for fundamental frequency, formant frequency, amplitude, and spatial position. Source: Curtis Roads (1997).</figcaption>
</figure>

**The pulsaret** is related to but distinct from several precursors: the {% xref "elektronische-musik", "Klangbaustein" %} (sound building block) concept in early German electronic music; the *grain* in Xenakis and Roads's granular synthesis; and the *wavelet* in mathematical signal analysis. Roads explicitly positions the pulsaret as a particle that is neither a grain (too long, too tied to stored samples) nor a sample (too short, no envelope shaping). In advanced practice, both the waveform and envelope tables can be loaded from a sound sample; the pulsaret waveform and envelope remain architecturally distinct, but the resulting pulsaret begins to resemble the windowed grain of granular synthesis, and the boundary between the two techniques blurs. The lexical question of what to call the micro-element -- {% xref "acoustical-quanta", "atom" %}, {% xref "granular-synthesis", "grain" %}, {% xref "acoustical-quanta", "quantum" %}, {% xref "unit-generator", "unit" %}, {% xref "sampling", "sample" %}, {% xref "dictionary-synthesis", "dictionary entry" %}, {% xref "event", "event" %} -- is itself substantive, since each term carries a different lineage and commits the work to different conceptual operations.

## Pulsaret construction

A pulsaret is the product of two lookup tables: a *pulsaret waveform* table and a *pulsaret envelope* table. In the original Pulsar Generator program by Roads and de Campo, each table is an array of 2048 floating-point values that can hold any arbitrary shape. The synthesiser reads through both tables in parallel and multiplies them sample by sample. The waveform determines the spectral content of the particle; the envelope shapes its amplitude over time. Their product is the pulsaret -- the elementary sonic particle emitted at each period of the pulse train.

This separation of waveform and envelope into independently controllable tables is a defining architectural feature of pulsar synthesis. It allows the composer to design timbres by combining any waveform with any envelope, producing a parametric space far larger than either table alone. Where granular synthesis derives timbral variation primarily from the choice of source material, grain duration, and grain density, pulsar synthesis adds the independent axes of waveform shape, envelope shape, and decoupled formant frequency, expanding the space of achievable timbres without requiring any source material at all.

<figure>
  <img src="/img/handbook/pulsar-synthesis/catalogue of envelopes.png" alt="A catalogue of standard pulsaret envelopes: (a) Rectangular, (b) Gaussian, (c) Linear Decay, (d) Exponential Decay, (e) Linear Attack with duty cycle, (f) Exponential Attack, (g) FOF envelope, (h) Bipolar modulator.">
  <figcaption>Fig. 02. A standard catalogue of pulsaret envelopes. (a) Rectangular. (b) Gaussian. (c) Linear Decay. (d) Exponential Decay. <em>b</em> -- steepness of an exponential curve. (e) Linear attack with duty cycle <em>d</em>. (f) Exponential attack. <em>g</em> -- steepness of an exponential curve. (g) FOF envelope. (h) Bipolar modulator. Source: Roads (2020), figures conversion Marcin Pietruszewski.</figcaption>
</figure>

<figure>
  <img src="/img/handbook/pulsar-synthesis/catalogue of pulsarets .png" alt="Examples of pulsaret waveforms: (a) Sine, (b) Multicycle Sine, (c) Gaussian Limited Sine, (d) Saw, (e) Gray Noise.">
  <figcaption>Fig. 03. Examples of pulsaret waveforms. In practice, any waveform can be used. (a) Sine. (b) Multicycle Sine. (c) Gaussian Limited Sine. (d) Saw. (e) Gray Noise. Source: Roads (2020), figures conversion Marcin Pietruszewski.</figcaption>
</figure>

The choice of envelope determines the spectral bandwidth of the pulsaret: a narrow envelope (such as a Gaussian or exponential decay) concentrates energy around the formant frequency and produces a sharp resonant peak, while a wide envelope approaching the full period yields a nearly pure tone. The choice of waveform determines the fine spectral structure within that bandwidth -- a sine produces a single formant peak, a sawtooth fills in the harmonics, and a noise waveform distributes energy stochastically. Because the two tables are multiplied sample by sample, every combination of waveform and envelope produces a distinct spectral profile. The catalogues above show standard shapes, but in practice both tables can hold any arbitrary curve, hand-drawn or algorithmically generated.

<div class="pulsaret-builder" id="demo-01">
  <div class="demo-label">pulsaret builder</div>
  <div class="builder-row">
    <div class="builder-panel">
      <label><span>pulsaret waveform</span> <select class="builder-select builder-select-wave"></select></label>
      <canvas class="builder-canvas builder-canvas-wave"></canvas>
    </div>
    <div class="builder-panel">
      <label><span>pulsaret envelope</span> <select class="builder-select builder-select-env"></select></label>
      <canvas class="builder-canvas builder-canvas-env"></canvas>
    </div>
  </div>
  <div class="builder-result">
    <label>pulsaret = waveform &times; envelope</label>
    <canvas class="builder-canvas builder-canvas-result"></canvas>
  </div>
  <div class="builder-hint">draw directly on the waveform and envelope canvases, or select a preset from the dropdown</div>
</div>
<div class="demo-caption">Demo 01. Interactive pulsaret construction. Each table stores 2048 floating-point values representing one cycle of an arbitrary shape. The pulsaret waveform (left) is multiplied sample-by-sample with the pulsaret envelope (right) to produce the resulting pulsaret (below). Draw on either canvas or select from the presets.</div>

## How it works

A pulsar synthesiser generates sound through the following process:

1. **Pulsaret waveform**: A single cycle (or partial cycle) of a waveform -- sine, cosine, or an arbitrary shape stored in a {% xref "wavetable-synthesis", "wavetable" %}. This determines the spectral content of each particle.

2. **Pulsaret envelope**: An amplitude envelope applied to the waveform. The envelope's shape and duty cycle control the bandwidth and formant characteristics. A narrow duty cycle (short envelope relative to the period) produces a broadband impulse; a wide duty cycle (envelope fills the period) produces a pitched tone closer to a conventional oscillator.

3. **Pulse train**: The pulsarets are emitted at a fundamental frequency *f*. When *f* is in the audio range, the train produces a pitched tone. The relationship between *f* and the pulsaret's internal waveform frequency creates the characteristic {% xref "formant-synthesis", "formant" %} structure of pulsar tones.

4. **Inter-pulse silence**: The gap between successive pulsarets (the silent portion of each period) is a defining feature. As the duty cycle decreases, more silence enters the signal, and the spectrum broadens. At the limit, an infinitely narrow pulsaret produces a click train with a flat spectrum.

<figure>
  <img src="/img/handbook/pulsar-synthesis/single-pulsar.png" alt="A single pulsar consisting of an arbitrary pulsaret waveform w with a duration d followed by an interval of silence s, within a period p.">
  <figcaption>Fig. 04. A single pulsar consists of an arbitrary pulsaret waveform <em>w</em> with a duration <em>d</em> followed by an interval of silence <em>s</em>. Source: Roads (2020), figures conversion Pietruszewski.</figcaption>
</figure>

<figure>
  <img src="/img/handbook/pulsar-synthesis/pulsar-train.png" alt="The succession of pulses forming a pulsar train, showing three pulsarets with varying duty cycles within successive periods.">
  <figcaption>Fig. 05. The succession of pulses is called the pulsar train. As the duty cycle <em>d</em> decreases relative to the period <em>p</em>, the spectrum broadens. Source: Roads (2020), figures conversion Pietruszewski.</figcaption>
</figure>

The fundamental frequency *f* determines the perceived pitch. The ratio of pulsaret duration to period (the *duty cycle* or *width*) determines the spectral envelope. The pulsaret waveform determines the fine spectral structure within that envelope.

## Parameters

The core parameters of a pulsar synthesiser and their perceptual correlates:

<table>
  <caption>Table 01. Core parameters of a pulsar synthesiser and their perceptual correlates.</caption>
  <thead>
    <tr><th>Parameter</th><th>Range</th><th>Perceptual effect</th></tr>
  </thead>
  <tbody>
    <tr><td><strong>Fundamental frequency</strong> (<em>f</em>)</td><td>sub-audio to audio (0.1 Hz -- 5 kHz+)</td><td>Pitch (audio rate) or rhythm (sub-audio)</td></tr>
    <tr><td><strong>Pulsaret waveform</strong></td><td>sine, arbitrary wavetable</td><td>Spectral content, timbre character</td></tr>
    <tr><td><strong>Pulsaret envelope</strong></td><td>Gaussian, raised cosine, exponential, arbitrary</td><td>Bandwidth, formant shape</td></tr>
    <tr><td><strong>Duty cycle</strong> (width)</td><td>0.0 -- 1.0</td><td>Spectral bandwidth: narrow = broadband, wide = tonal</td></tr>
    <tr><td><strong>Formant frequency</strong></td><td>independent of <em>f</em></td><td>Resonant peak in the spectrum</td></tr>
    <tr><td><strong>Train density</strong></td><td>0.0 -- 1.0</td><td>Proportion of periods containing a pulsaret vs silence</td></tr>
  </tbody>
</table>

The parametric independence of these dimensions is what distinguishes pulsar synthesis from related techniques. Fundamental frequency and formant frequency are decoupled, permitting effects analogous to the {% xref "vocoder", "source-filter model" %} of speech (varying pitch independently of resonant formant structure). Train density allows smooth transitions between periodic pitched tones and sparse, rhythmic textures.

## Code examples

### SuperCollider 3 implementation

The code below is the exact SynthDef used by the interactive demo. Copy and run it in SuperCollider to hear the same synthesis on your machine. The pulsaret waveform is a sum of the first 10 harmonics stored in a buffer; the pulsaret envelope is a percussive shape in a second buffer. `GrainBuf` reads the waveform once per impulse trigger, at a rate set by the formant frequency.

```supercollider
// -- Wavetable data --

// Pulsaret waveform: sum of first 10 harmonics (random amplitudes)
a = Signal.sineFill(1024, 1/(1..10).scramble).putLast(0);
x = Buffer.sendCollection(s, a, 1);

// Pulsaret envelope: percussive shape
b = Env.perc.discretize(1024).putLast(0);
y = Buffer.sendCollection(s, b, 1);

// -- SynthDef --

(
SynthDef(\handbook_pulsar, { |out = 0, wavebuf = 0, envbuf = 1,
    fund = 100, form = 400, amp = 0.2, gate = 1|
    var trig = Impulse.ar(fund);        // pulse train at fundamental freq
    var grDur = form.reciprocal;         // pulsaret duration from formant
    var rate = form * BufDur.kr(wavebuf); // playback rate for wavetable
    var sig = GrainBuf.ar(1, trig, grDur, wavebuf, rate, 0, 4, 0, envbuf);
    var ampEnv = EnvGen.kr(Env.asr(0.01, 1, 0.05), gate, doneAction: 2);
    Out.ar(out, sig * amp * ampEnv);
}).add;
)

// -- Play --

z = Synth(\handbook_pulsar, [\wavebuf, x, \envbuf, y, \fund, 100, \form, 400]);

// Change parameters while running
z.set(\fund, 50);       // lower pitch
z.set(\form, 1200);     // brighter formant
z.set(\fund, 8);        // sub-audio: rhythmic pulse
z.set(\form, 200);      // darker

// Stop
z.set(\gate, 0);
```

<div class="demo-with-margin">
<span class="margin-note">Edit the pulsaret waveform and envelope in <a href="#demo-01">Demo 01</a> above, then press 'use builder' to hear the result here.</span>
<div class="synth-demo" data-synth="handbook_pulsar" data-mode="gate" data-buffers='[{"bufnum":0,"file":"pulsar-wave.wav"},{"bufnum":1,"file":"pulsar-env.wav"}]'>
  <div class="demo-header">
    <span class="demo-label">demo</span>
    <button class="demo-boot">boot audio</button>
    <button class="demo-trigger">play</button>
    <button class="demo-use-builder">use builder (Demo 01)</button>
    <span class="demo-status"></span>
  </div>
  <div class="demo-controls">
    <div class="demo-param">
      <label>fundamental frequency</label>
      <input class="demo-slider" type="range" data-param="fund" min="1" max="500" value="100" step="1" data-decimals="0">
      <span class="demo-value" data-label="fund">100</span>
    </div>
    <div class="demo-param">
      <label>formant frequency</label>
      <input class="demo-slider" type="range" data-param="form" min="50" max="4000" value="400" step="1" data-decimals="0">
      <span class="demo-value" data-label="form">400</span>
    </div>
    <div class="demo-param">
      <label>amplitude</label>
      <input class="demo-slider" type="range" data-param="amp" min="0" max="1.0" value="0.8" step="0.01" data-decimals="2">
      <span class="demo-value" data-label="amp">0.80</span>
    </div>
  </div>
  <div class="demo-scope-frame">
    <span class="demo-scope-label">scope</span>
    <canvas class="demo-scope"></canvas>
  </div>
</div>
</div>
<div class="demo-caption">Demo 02. Pulsar synthesis running in the browser via SuperSonic (scsynth compiled to WebAssembly). The SynthDef reads a pulsaret waveform and envelope from two wavetable buffers using <code>GrainBuf</code>. The <em>fund</em> parameter sets the fundamental frequency (the rate of the Impulse trigger, perceived as pitch). The <em>form</em> parameter sets the formant frequency (the playback rate of the pulsaret waveform, controlling the spectral peak independently of pitch). Compare with the parameter table and the <code>\pulsar1</code> SynthDef above.</div>

## Instrumental implementations

### Pulsar Generator (PG)

The <a href="https://www.curtisroads.net/software">Pulsar Generator</a> was developed by Curtis Roads and Alberto de Campo in SuperCollider 2 at the University of California, Santa Barbara. It is the first dedicated software instrument for pulsar synthesis, providing wavetable-driven control over all core parameters: fundamental frequency, formant frequency, pulsaret waveform and envelope selection, amplitude, and spatial position. The interface extends the basic synthesis engine with pulsar masking (burst, channel, and stochastic masking modes), convolution with sampled sounds, and multi-channel mixing.

<figure>
  <img src="/img/handbook/pulsar-synthesis/pulsar-generator-diagram.png" alt="Diagrammatic representation of the Pulsar Generator program showing signal flow from envelope generators and pulsaret waveform through the Pulsar Generator, pulsar masking, and convolution with sampled sounds to output.">
  <figcaption>Fig. 06. The Pulsar Generator program by Curtis Roads and Alberto de Campo. The system combines amplitude, fundamental frequency, and formant envelope generators with pulsaret waveform and envelope selection, pulsar masking (burst, channel, stochastic), convolution with sampled sounds, and mixing. Source: Roads (2020), figures conversion Pietruszewski.</figcaption>
</figure>

<figure>
  <img src="/img/handbook/pulsar-synthesis/PG_main Interface.jpg" alt="Pulsar Generator main interface showing a generalised table type control over pulsaret fundamental frequency with three separate tables for formant frequency, spatial position and amplitude.">
  <figcaption>Fig. 07. Pulsar Generator -- a global view of the graphic interface. Notice a generalised table type control over pulsaret fundamental frequency with three separate tables for formant frequency, spatial position and amplitude. The colour scheme and basic layout of the interface were inspired by the look of audio measurement equipment by Brüel&Kjær.</figcaption>
</figure>

### New Pulsar Generator (nuPG)

The New Pulsar Generator (nuPG) is a reimplementation and extension of the Pulsar Generator developed by Marcin Pietruszewski (2021). Built in SuperCollider 3, nuPG preserves the core parametric architecture of the original while expanding the synthesis engine and interface.

## Aesthetics and cultural context

Pulsar synthesis occupies a distinctive position in the landscape of sound synthesis techniques. It emerged from a specific intellectual tradition -- the {% xref "microsound", "microsound" %} paradigm -- that sought to theorise electronic sound at temporal scales below the note and above the sample. This tradition, running from Gabor through Xenakis to Roads, is itself marked by the disciplinary crossings that SYNCULTURE investigates: mathematics (quantum theory, stochastic processes), engineering (signal processing, filter design), and musical composition (electroacoustic and computer music).

Several features of pulsar synthesis make it a productive case study for the analysis of synthesis as a *cultural technique*:

**The particle as compositional primitive.** Pulsar synthesis foregrounds the particle rather than the waveform, the note, or the sample as the fundamental unit of musical material. This represents a specific epistemological commitment: that sound is best understood and manipulated not as a continuous wave but as a stream of discrete events. The commitment has roots in Gabor's information theory, but its musical interpretation is not determined by the physics -- composers have made radically different aesthetic choices within the particle paradigm.

**The duty cycle as timbral continuum.** The duty cycle parameter exposes a continuous transition between pitched tone and broadband noise within a single synthesis mechanism. In classical synthesis, these are typically separate domains (oscillators vs noise generators). Pulsar synthesis dissolves this boundary, suggesting that pitch and noise are endpoints of a single parametric axis rather than categorically different phenomena.

**Formant structure without physical models.** The decoupled formant frequency parameter produces spectral resonances reminiscent of vocal or instrumental formants without any reference to a physical source. This is a form of {% xref "nonstandard-synthesis", "nonstandard synthesis" %} in the sense defined by Holtzman (1978) -- the sound is specified algorithmically rather than by modelling a physical system. The resulting timbres evoke vocal qualities while remaining irreducibly synthetic.

**Micro-macro temporal bridging.** Because the fundamental frequency parameter can span from sub-audio rhythmic rates to audio-frequency pitches, pulsar synthesis makes audible the continuity between rhythm and pitch that is central to the microsound thesis. A single parameter sweep can traverse the perceptual boundary between discrete pulses and fused tone, demonstrating what Roads calls the {% xref "time-scales", "time scale continuum" %}.
