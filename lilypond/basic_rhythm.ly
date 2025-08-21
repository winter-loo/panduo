\version "2.24.0"

\book {
  \score {
    \fixed c' {
      \time 4/4

      c d e f
    }
  }

  \score {
    \fixed c' {
      \time 2/4

      c8 d e f
      c d e f
    }
  }

  \score {
    \fixed c' {
      \time 2/4

      c16 d e f
      c16 d e f
      c16 d e f
      c16 d e f
    }
  }

  \score {
    \fixed c' {
      \time 2/4

      c8. d16 e8. f16
      c8. d16 e8. f16
    }
  }

  \score {
    \fixed c' {
      \time 2/4

      c16 d8. e16 f8.
      c16 d8. e16 f8.
    }
  }

  \score {
    \fixed c' {
      \time 2/4

      c16 d e8 f16 e d8
      c16 d e8 f16 e d8
    }
  }

  \score {
    \fixed c' {
      \time 2/4

      c8 d16 e f8 e16 d
      c8 d16 e f8 e16 d
    }
  }

  \score {
    \fixed c' {
      \time 2/4

      c16 d8 e16 f16 e8 d16
      c16 d8 e16 f16 e8 d16
    }
  }

  \score {
    \fixed c' {
      \time 2/4

      % Normally, two 8th notes (c8 d) would take 1 beat (half of a 2/4 measure).
      % But here you squeeze three 8th notes (c8 d e) into that same space.
      % So the triplet lasts as long as two ordinary 8ths.
      \tuplet 3/2 { c8 d e } \tuplet 3/2 { f8 e d }
      \tuplet 3/2 { c8 d e } \tuplet 3/2 { f8 e d }
    }
  }
}
