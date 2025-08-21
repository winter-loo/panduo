\version "2.24.4"

% Lilypond Music Notation Manual:
% https://lilypond.org/doc/v2.24/Documentation/learning/simple-notation

\header {
  title = "爱的供养"
  composer = "杨幂"
}

\score {

% By default in Lilypond, c is c3, c' is c4
% Use \fixed command to say c is c' in the following block
\fixed c' {
  \time 4/4
  \tempo 4 = 60

  a16 b c' e'
  a16 b c' e'
  a16 b c' e'
  a16 b c' e'
  g16 a b d'
  g16 a b d'
  g16 a b d'
  g16 a b d'
  f16 g a c'
  f16 g a c'
  g16 a b d'
  g16 a b d'
  e16 g b d'
  b16 g e g
  a16 b c' e'
  a4
}

% demand Lilypond creating a midi file
% Lilypond can not output a midi file and a svg/pdf file at the same time
% uncomment line below will create a midi file but no svg/pdf file
% use https://cifkao.github.io/html-midi-player to play a midi file
% \midi {}

}
