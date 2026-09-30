import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np
from matplotlib.patches import Polygon, Circle, FancyArrowPatch

INK='#111111'; FAINT='#8a8a8a'
plt.rcParams.update({'font.family':'DejaVu Sans Mono','font.size':8.5,
                     'text.color':INK})

P, W, NPER = 1.3373, 0.04, 4          # published period and pulse width, seconds

fig = plt.figure(figsize=(12.0, 5.0), dpi=150)
gs = fig.add_gridspec(2, 2, width_ratios=[1, 2.5], height_ratios=[1.25, 1],
                      wspace=0.07, hspace=0.18,
                      left=0.012, right=0.988, top=0.965, bottom=0.035)

# ------------------------------------------------------------ the object
ax = fig.add_subplot(gs[0, 0]); ax.set_axis_off()
ax.set_xlim(-1.5, 1.5); ax.set_ylim(-1.35, 1.35); ax.set_aspect('equal')
tilt = np.deg2rad(32); mx, my = np.sin(tilt), np.cos(tilt)
for sgn in (1, -1):
    tx, ty = sgn*mx*1.10, sgn*my*1.10
    px, py = -my, mx
    ax.add_patch(Polygon([[0,0],[tx+px*0.28, ty+py*0.28],[tx-px*0.28, ty-py*0.28]],
                 closed=True, facecolor='none', edgecolor=INK, lw=0.9))
ax.plot([-mx*1.22, mx*1.22], [-my*1.22, my*1.22], color=FAINT, lw=0.7, ls=(0,(4,3)))
ax.plot([0,0], [-1.0, 1.0], color=INK, lw=0.9)
ax.add_patch(Circle((0,0), 0.16, facecolor='white', edgecolor=INK, lw=1.2, zorder=3))
ax.add_patch(FancyArrowPatch((-0.40,0.80), (0.40,0.80), connectionstyle='arc3,rad=-0.42',
             arrowstyle='-|>', mutation_scale=9, lw=0.9, color=INK))
ax.text(-1.45, 1.30, 'rotating neutron star', ha='left', va='top')
ax.text(-0.46, 0.86, 'rotation', ha='right', va='center', color=FAINT)
ax.text(mx*1.30, my*1.30 - 0.18, 'magnetic axis', ha='left', va='center', color=FAINT)
ax.plot([-1.45, 1.45], [-0.26, -0.26], color=FAINT, lw=0.7, ls=(0,(1,3)))
ax.text(1.45, -0.32, 'line of sight', ha='right', va='top', color=FAINT)

# ------------------------------------------------------------ the particle
ax = fig.add_subplot(gs[1, 0]); ax.set_axis_off()
ax.set_xlim(-1.32, 1.32); ax.set_ylim(-1.0, 1.05)
u = np.linspace(-1, 1, 900)
env = np.exp(-0.5*(u/0.40)**2)
ax.plot(u, env*0.62, color=FAINT, lw=0.8)
ax.plot(u, -env*0.62, color=FAINT, lw=0.8)
ax.plot(u, np.sin(2*np.pi*2.5*u)*env*0.62, color=INK, lw=1.0)
ax.plot([-1.25, 1.25], [0,0], color=FAINT, lw=0.6)
ax.text(0, 1.02, 'pulsaret  =  waveform w  x  envelope v', ha='center', va='top')
ax.text(1.20, 0.34, 'v', ha='right', va='bottom', color=FAINT)
ax.annotate('', xy=(-0.95, -0.80), xytext=(0.95, -0.80),
            arrowprops=dict(arrowstyle='<|-|>', mutation_scale=7, lw=0.8, color=INK))
ax.text(0, -0.86, 'd', ha='center', va='top')

# ------------------------------------------------------------ the two trains
ax = fig.add_subplot(gs[:, 1]); ax.set_axis_off()
T = NPER*P
t = np.linspace(0, T, 6000)
def train(sigma, jitter=0.0, seed=3):
    rng = np.random.default_rng(seed); y = np.zeros_like(t)
    for k in range(NPER):
        c = (k+0.5)*P + (rng.normal(0, jitter) if jitter else 0.0)
        y += np.exp(-0.5*((t-c)/sigma)**2)
    return y
sigma = W/2.355
rng = np.random.default_rng(11)
recv  = train(sigma, jitter=0.004) + rng.normal(0, 0.05, t.size)
synth = train(sigma)

ax.set_xlim(-0.03*T, 1.03*T); ax.set_ylim(-0.55, 2.70)
for base, y in ((1.58, recv), (0.30, synth)):
    ax.plot(t, base + y*0.62, color=INK, lw=0.8)
    ax.plot([0, T], [base, base], color=FAINT, lw=0.6)
ax.text(0, 2.58, 'PSR B1919+21   received signal', va='top')
ax.text(0, 2.42, 'P = 1.3373 s     pulse width 0.04 s     duty cycle 3.0 %',
        va='top', color=FAINT)
ax.text(0, 1.30, 'pulsar synthesis   emitted train', va='top')
ax.text(0, 1.14, 'p = d + s        one pulsaret per period', va='top', color=FAINT)

c0, c1 = 0.5*P, 1.5*P
for x in (c0, c1):
    ax.plot([x, x], [0.26, -0.22], color=FAINT, lw=0.6)
ax.annotate('', xy=(c0, -0.30), xytext=(c1, -0.30),
            arrowprops=dict(arrowstyle='<|-|>', mutation_scale=7, lw=0.8, color=INK))
ax.text((c0+c1)/2, -0.36, 'p', ha='center', va='top')
ax.plot([c0-W/2, c0+W/2], [0.21, 0.21], color=INK, lw=1.8, solid_capstyle='butt')
ax.text(c0 + W*1.2, 0.21, 'd', ha='left', va='center')
ax.text((c0+c1)/2 + 0.12*P, 0.21, 's', ha='center', va='center', color=FAINT)

fig.savefig('pulsar-diagram.png', facecolor='white')
print('ok')
