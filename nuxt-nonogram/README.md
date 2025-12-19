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
4. Go to **Settings** tab and click **Enable** under Archipelago Mode

In Archipelago Mode:
- Features are locked until you receive them from other players
- Complete puzzles to send checks to the multiworld
- Resource settings are locked to the configured values

### Controls
- **Left Click**: Fill a cell
- **Right Click**: Mark a cell with X (when unlocked)
- **Shift + Click** or **Click again**: Erase a cell

## Development

### Tech Stack
- [Nuxt 4](https://nuxt.com/) - Vue.js framework
- [Vue 3](https://vuejs.org/) - Frontend framework
- [Tailwind CSS 4](https://tailwindcss.com/) - Styling
- [archipelago.js](https://github.com/ArchipelagoMW/archipelago.js) - Archipelago client library

### Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## License

MIT
