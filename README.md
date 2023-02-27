
## About
skvrwl is a (mostly) [UCI compatible](https://www.chessprogramming.org/UCI) engine that uses two other engines underneath (A and B) to search for best traps against human players using [expectimax](https://www.researchgate.net/figure/A-game-tree-with-expectimax-values_fig1_237474023) algorithm.

## Installation
### Requirements:
* node, yarn
* engine for classic search executable - could be [stockfish](https://github.com/official-stockfish/Stockfish)
* [lc0](https://github.com/LeelaChessZero/lc0) executable. Lc0 needs to self-configure before first search, so make sure it does that
* weights for lc0 that approximate opponent's play; [maia-chess](https://github.com/CSSLab/maia-chess) is a project that aims to approximate human play and its weights are recommended, for example [maia-1200](https://github.com/CSSLab/maia-chess/blob/master/maia_weights/maia-1200.pb.gz)

### Process
```sh
git clone git@github.com:mariczne/skvrwl.git
cd skvrwl
yarn install

# This project by default assumes using lc0 and stockfish and that they are available in $PATH
# You can configure this in config.ts

# Download weights:
wget https://github.com/CSSLab/maia-chess/raw/820794cc66df582577807e1a1fa596563bb50581/maia_weights/maia-1200.pb.gz -P ./weights/

# To run with hot-reload, use
yarn start

# To build, use
yarn build
```