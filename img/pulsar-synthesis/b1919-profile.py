import matplotlib; matplotlib.use('Agg')
import matplotlib.pyplot as plt, numpy as np, json

# Drawn in the manner of a printed observatory figure: boxed frame, inward
# ticks, serif labels, warm paper. The data underneath is a modern archival
# observation, and the caption says so.
INK='#1a1713'; PAPER='#f3efe4'; FAINT='#6b655c'
plt.rcParams.update({'font.family':'DejaVu Serif','font.size':9,'text.color':INK})
P = 1.3373

d = json.load(open('jk17.json')); h = d['hdr']
arr = np.asarray(d['series']['I'], float)        # [phase, flux] pairs
I = arr[:, 1]
I = I - np.median(I)
I = I / I.max()
n = I.size
I = np.roll(I, n//2 - int(np.argmax(I)))
phase = np.arange(n) / n

fig, ax = plt.subplots(figsize=(10.5, 4.0), dpi=150)
fig.patch.set_facecolor(PAPER); ax.set_facecolor(PAPER)
ax.plot(phase, I, color=INK, lw=0.85, solid_joinstyle='miter')

ax.set_xlim(0, 1); ax.set_ylim(-0.14, 1.30)
for sp in ax.spines.values():
    sp.set_color(INK); sp.set_linewidth(0.9)
ax.tick_params(direction='in', which='both', color=INK, labelcolor=FAINT,
               top=True, right=True, length=4, width=0.8, labelsize=8)
ax.set_xticks(np.arange(0, 1.01, 0.1))
ax.set_xticklabels(['0','','0.2','','0.4','','0.6','','0.8','','1.0'])
ax.set_yticks([0, 0.5, 1.0]); ax.set_yticklabels(['0', '0.5', '1.0'])
ax.set_xlabel('LONGITUDE  (FRACTION OF ONE ROTATION)', color=FAINT,
              fontsize=8, labelpad=5)
ax.set_ylabel('RELATIVE FLUX DENSITY', color=FAINT, fontsize=8, labelpad=5)

above = np.where(I > 0.5)[0]
d0, d1 = phase[above[0]], phase[above[-1]]
ax.plot([d0, d1], [1.09, 1.09], color=INK, lw=1.4, solid_capstyle='butt')
for x in (d0, d1):
    ax.plot([x, x], [1.06, 1.12], color=INK, lw=0.9)
ax.text((d0 + d1) / 2, 1.135, 'd', ha='center', va='bottom', style='italic')
ax.text(d1 + 0.016, 1.09, 'DUTY CYCLE  2.5 PER CENT OF p AT HALF MAXIMUM',
        ha='left', va='center', color=FAINT, fontsize=7.5)
ax.text(0.012, 1.13, 'PSR B1919+21', va='top', fontsize=9.5)
ax.text(0.012, 1.04, 'p = 1.3373 s', va='top', color=FAINT, fontsize=8)
ax.text(0.988, 1.13, '1369 MHz', va='top', ha='right', color=FAINT, fontsize=8)
ax.text(0.988, 1.04, 'PARKES', va='top', ha='right', color=FAINT, fontsize=8)

fig.tight_layout(pad=0.7)
fig.savefig('b1919.png', facecolor=PAPER)
print('duty %.1f%%' % (100*(d1-d0)))
