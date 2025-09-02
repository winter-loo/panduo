\version "2.24.4"

\header {
  title = "Mary Had a Little Lamb"
  composer = "Traditional"
}

\score {
  \new PianoStaff <<
    \new Staff = "right" {
      \clef treble
      \key c \major
      \time 4/4

      \relative c' {
        e4-3 d-2 c-1 d-2
        e4-3 e-3 e2-3
        d4-2 d-2 d2-2
        e4-3 g-5 g2-5
        e4-3 d-2 c-1 d-2
        e4-3 e-3 e4-3 d-2
        c1-1
      }
    }

    \new Staff = "left" {
      \clef bass
      \key c \major
      \time 4/4

      \relative c {
        c2-1 c-1   % measure 1
        g2-5 g-5   % measure 2
        c2-1 c-1   % measure 3
        g2-5 g-5   % measure 4
        c2-1 c-1   % measure 5
        g2-5 g-5   % measure 6
        c1-1       % measure 7
      }
    }
  >>
}

