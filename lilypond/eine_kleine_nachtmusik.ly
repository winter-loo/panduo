\version "2.24.4"

\score {

\new Staff \with {
  \magnifyStaff #1.5
} \fixed c' {
  \time 4/4
  \tempo 4 = 120

  c' r r2 |
  r1 |
  c'4 r8 g8 c'4 r8 g8 |
  c'4 c'8 e'8 g'4 r4 |
  f'4 r8 d'8 f'4 r8 d'8 |
  f'8 d'8 b8 d'8 g4 r4 |
  c'4 c'4 r8 e'8 d'8 c'8 |
  c'8 b8 b4 r8 d'8 f'4 |
  d'8 c'8 c'4 r8 e'8 d'8 c'8 |
  c'8 b8 b4 r8 d'8 f'4 |
  c'8 c'8 c'4 c'8 c'8 e'4 |
  e'8 e'8 g'8 e'8 g'4 r4 |
  g1 |
  g'8 f'8 f'4 f'8 e'8 e'4 |
  e'8 d'8 d'4 c'8 b8 a8 b8 |
  c'4 d'4 e'4 r4 |
  g'1 |
  g'8 f' f' f' f' e' e' e' |
  e'8 d' d' d' c' b a b |
  c'1 |
  r1
}

\midi {}
}

\paper {
  indent = 0\mm          % space before the first system
  short-indent = 0\mm    % space before following systems
  % line-width = 210\mm   % set system width
}
