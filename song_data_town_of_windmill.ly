\version "2.24.4"

% Lilypond Music Notation Manual:
% https://lilypond.org/doc/v2.24/Documentation/learning/simple-notation

\header {
  title = "Town of Windmill"
  composer = "Aihara Hisa"
}

\score {

% By default in Lilypond, c is c3, c' is c4
% Use \fixed command to say c is c' in the following block
\fixed c' {
  \time 3/4
  \tempo 4 = 60

  % r is rest note
  % add a fingering tip with a dash line and a number
  r r e-1
  c'-3 c'8-3 d'8-4 e'4-5
  % put a chord in a pair of single angle brackets
  % 2 is the duration of this chord
  b-1 <e' g'>2-3-5
  a4-1 a8-1 b8-2 c'4-3
  g4-1 <c' e'>2-3-5
  f4-1 f8-1 g8-2 a4-3
  b4-4 a4-3 g4-2
  e2-1 d4-2
  e2-3 e4-1
  c'4-3 c'8-3 d'8-4 e'4-5
  b4-1 <e' g'>2-3-5
  a4-1 a8-1 b8-2 c'4-3
  g4-1 <c' e'>2-3-5
  f4-1 f8-1 g8-2 a4-3
  b4-4 a4-3 g4-2
  a2-3 r4
  r1
}

% demand Lilypond creating a midi file
% Lilypond can not output a midi file and a svg/pdf file at the same time
% uncomment line below will create a midi file but no svg/pdf file
% use https://cifkao.github.io/html-midi-player to play the midi file.
% \midi {}

}
