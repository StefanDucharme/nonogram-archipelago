# Archipelago Nonogram

A web-based Nonogram (Picross) puzzle game with [Archipelago](https://archipelago.gg/) multiworld randomizer integration.

## Features

- **Nonogram Puzzles**: Classic logic puzzle gameplay
- **Archipelago Integration**: Connect to Archipelago multiworld servers to receive items and send checks
- **Progressive Unlocks**: Start with limited abilities and unlock features like Auto-X, Drag Painting, and Hint Visibility
- **Resource System**: Manage lives and coins as you solve puzzles
- **Difficulty Progression**: Start at 5x5 grids and unlock larger puzzles
- **Shop System**: Spend coins on temporary hints and other powerups

## Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- npm (comes with Node.js)

## Getting Started

### 1. Get the code

**Option A: Clone with Git**
```bash
git clone https://github.com/yourusername/nonogram-archipelago.git
cd nonogram-archipelago/nuxt-nonogram
```

**Option B: Download without Git**
1. Go to the GitHub repository page
2. Click the green **Code** button
3. Select **Download ZIP**
4. Extract the ZIP file to a folder on your computer
5. Open a terminal/command prompt and navigate to the `nuxt-nonogram` folder:
   ```bash
   cd path/to/nonogram-archipelago/nuxt-nonogram
   ```

### 2. Install dependencies

```bash
npm install
```

### 3. Start the development server

```bash
npm run dev
```

The app will be available at `http://localhost:3000`

## Archipelago Setup

For detailed local testing instructions, see [LOCAL_TESTING.md](LOCAL_TESTING.md).

### Installing the APWorld

1. Navigate to the `apworld` folder in this repository
2. Run the build script:
   ```bash
   cd apworld
   python build_apworld.py
   ```
3. Copy the generated `nonogram.apworld` to your Archipelago `custom_worlds` folder
   - Or copy the `apworld/nonogram` folder to `Archipelago/worlds/`

### Generating a Game

1. Create a YAML file for your game (see `apworld/Nonogram.yaml` for an example)
2. Place it in Archipelago's `Players` folder
3. Generate the game using the Archipelago launcher or:
   ```bash
   python Generate.py
   ```

### Game Options

| Option | Range | Default | Description |
|--------|-------|---------|-------------|
| `starting_lives` | 1-10 | 3 | Lives per puzzle |
| `starting_coins` | 0-50 | 5 | Starting coins |
| `starting_hints` | 0-5 | 1 | Hints revealed per puzzle |
| `goal_puzzles` | 1-100 | 64 | Puzzles required to win |
| `death_link` | on/off | off | Share deaths with other players |

## Usage

### Free Play Mode
By default, the game runs in Free Play mode with all features unlocked. You can adjust puzzle size, generate new puzzles, and play without any restrictions.

### Archipelago Mode
1. Click the **Archipelago** tab in the right panel
2. Enter your server details:
   - **Host**: The Archipelago server address (e.g., `archipelago.gg` or `localhost`)
   - **Port**: Server port (default: `38281`)
   - **Player Name**: Your slot name from the multiworld
   - **Password**: Room password (if required)
3. Click **Connect**

In Archipelago Mode:
- Features are locked until you receive them from other players
- Complete puzzles to send checks to the multiworld
- Resource settings come from your YAML configuration
- Receive items from other players in your multiworld

### Items You Can Receive
- **Place X** - Mark cells as empty
- **Auto-X** - Automatically mark completed lines
- **Grey Completed Hints** - Grey out finished hints
- **Drag Painting** - Click and drag to paint
- **Check Mistakes** - Highlight errors
- **Hint Reveal** - See more row/column hints
- **Extra Life** - Increase max lives
- **Coin Bundle** - Get coins for the shop
- **Random Cell Solve** - Auto-solve one cell

### Location Checks
- Complete your first row/column
- Complete 1, 2, 4, 8, 16, 32, or 64 puzzles

### Controls
- **Left Click**: Fill a cell
- **Right Click**: Mark a cell with X (when unlocked)
- **Shift + Click** or **Click again**: Erase a cell

## Development

### Tech Stack
- [Nuxt 4](https://nuxt.com/) - Vue.js framework
- [Vue 3](https://vuejs.org/) - Frontend framework
- [Tailwind CSS 4](https://tailwindcss.com/) - Styling
- [archipelago.js](https://github.com/ThePhar/archipelago.js) - Archipelago client library

### Project Structure
```
nonogram-archipelago/
├── app/                    # Nuxt application
│   ├── components/         # Vue components
│   ├── composables/        # Vue composables (game logic, AP integration)
│   ├── pages/              # Page components
│   └── plugins/            # Nuxt plugins (AP client setup)
├── apworld/                # Archipelago world files
│   ├── nonogram/           # Python world implementation
│   ├── build_apworld.py    # APWorld packaging script
│   └── Nonogram.yaml       # Example player YAML
├── LOCAL_TESTING.md        # Local testing guide
└── README.md               # This file
```

### Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Build APWorld
cd apworld && python build_apworld.py
```

## License

MIT
