# base measures

one measure width: W=349
horizontal spacing between notes: S=12
bar line width: b=3
cursor line width: c=8
note width: for best view, N > c


# derived measures

## 4 successive quarter notes

```

  tail padding(tp)
  / leading padding(lp)
 / /
|~|~|
C | C   C   C   C | C
\___/\__/\__/\__/\__/
```


- formula: 4N + 4 * S - b = W

4N + 4 * 12 - 3 = 349 => N = 76

- formula: tp + b + lp = S

tp = Math.ceil((S - b) / 2)
lp = Math.floor((S - b) / 2)

tp + lp = 12 - 3 = 9
=> tp = 5, lp = 4


Hence,

- half note width
  = spacing occupied by two quarter notes
  => w = 2 * N + S = 2 * 76 + 12 = 164

- eighth note width
  = 2 eighth note width + spacing = quarter note width
  => 2w + 12 = 76
  => w = 32

- sixteenth note width
  = 2 sixteenth note width + spacing = eighth note width
  => 2w + 12 = 32
  => w = 10

# test

Assuming W=1047, S=36, b=9, c=24

4N + 4 * 36 - 9 = 1047
N = 228

tp + lp = 36 - 9 = 27
tp = Math.ceil(27 / 2) = 14
lp = Math.floor(27 / 2) = 13

half note width: w = 2 * 228 + 36 = 492
eighth note width: 2w + 36 = 228 => w = 96
whole note width: 4 * 228 + 3 * 36 = 1020
