# Local Testing Guide for Nonogram Archipelago

This guide explains how to test your Nonogram client with a local Archipelago server.

## Prerequisites

1. **Python 3.10-3.12** installed (Python 3.13 may have issues)
2. **Archipelago** installed (download from https://github.com/ArchipelagoMW/Archipelago/releases)
3. **Node.js 18+** installed (for the Nonogram client)

## Step 1: Install the Nonogram World

### Build the APWorld file

```powershell
cd E:\repo\personal\nonogram-archipelago\apworld
python build_apworld.py
```

This creates `nonogram.apworld` in the `apworld` folder.

### Install via Archipelago Launcher

1. Open `ArchipelagoLauncher.exe`
2. Click **"Install APWorld"**
3. Select the `nonogram.apworld` file you just built
4. Restart the Launcher if prompted

## Step 2: Create a Test YAML

Copy the example YAML to the Archipelago `Players` folder:

```powershell
copy apworld\Nonogram.yaml <ARCHIPELAGO_PATH>\Players\
```

Or create `Players/Nonogram.yaml` with:

```yaml
name: TestPlayer
game: Nonogram
Nonogram:
  starting_lives: 3
  starting_coins: 5
  starting_hints: 1
  coins_per_bundle: 5
  extra_lives_in_pool: 5
  hint_reveals_in_pool: 10
  coin_bundles_in_pool: 15
  cell_solves_in_pool: 3
  goal_puzzles: 16
  death_link: false
```

## Step 3: Generate a Game

1. In the Archipelago Launcher, click **"Generate"**
2. It will use YAML files from your Players folder
3. The generated `.archipelago` file appears in the `output/` folder

## Step 4: Start the Server

### Using the Launcher
1. Open `ArchipelagoLauncher.exe`
2. Click "Host"
3. Select your generated `.archipelago` file from `output/`

### Using Command Line
```powershell
python ArchipelagoServer.py
# Or with a specific file:
python ArchipelagoServer.py --multidata output/AP_XXXXX.archipelago
```

The server will display:
```
Server running on port 38281
```

## Step 5: Start the Nonogram Client

In a new terminal:

```powershell
cd E:\repo\personal\nonogram-archipelago
npm run dev
```

Open http://localhost:3000 in your browser.

## Step 6: Connect

1. Click on the **Archipelago** tab in the right panel
2. Enter connection details:
   - **Host**: `localhost`
   - **Port**: `38281`
   - **Slot**: `TestPlayer` (must match your YAML `name` field)
   - **Password**: (leave empty unless you set one)
3. Click **Connect**

## Troubleshooting

### "No world found to handle game Nonogram"
This is the most common error. It means Archipelago can't find the Nonogram world.

**Solutions:**
1. Make sure the folder is at `<ARCHIPELAGO_PATH>/worlds/nonogram/` (not `custom_worlds`)
2. Make sure the folder is named `nonogram` (lowercase, no spaces)
3. Verify all Python files exist: `__init__.py`, `Items.py`, `Locations.py`, `Options.py`, `Regions.py`
4. Test the import manually:
   ```powershell
   cd <ARCHIPELAGO_PATH>
   python -c "from worlds.nonogram import NonogramWorld; print('OK')"
   ```
5. If using a release build, you may need to rebuild/reinstall Archipelago after adding worlds

### "Connection refused"
- Make sure the Archipelago server is running
- Check the port number (default is 38281)
- Try `127.0.0.1` instead of `localhost`

### "Slot not found"
- Make sure your slot name matches the YAML `name` field exactly (case-sensitive)
- Regenerate the game after changing the YAML

### WebSocket errors in browser
- Check browser console (F12) for detailed errors
- For localhost, try using `ws://localhost:38281` instead of `wss://`

### Items not being received
- Check the Archipelago server console for errors
- Use the server's `!getitem` command to test: `!getitem "Place X"`

## Testing Commands

In the Archipelago server text client, you can use these commands:

```
!help              - Show all commands
!getitem "Place X" - Give yourself the Place X item
!getitem "Hint Reveal"
!getitem "Coin Bundle"
!status            - Check your status
!release           - Release all items to their locations
!collect           - Collect all items from your locations
```

## Quick Checklist

- [ ] Built `nonogram.apworld` with `python build_apworld.py`
- [ ] Installed APWorld via Archipelago Launcher
- [ ] YAML file in `<ARCHIPELAGO>/Players/Nonogram.yaml`
- [ ] Game generated successfully
- [ ] Server running on port 38281
- [ ] Nuxt dev server running on port 3000
- [ ] Connected with matching slot name
