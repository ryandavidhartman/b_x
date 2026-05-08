# Monster Illustration Slate

Date: `2026-05-07`

## Goal

Add a first wave of new illustrations that remains compatible with the existing retained B/X monster plates in [assets](/home/ryandavidhartman/dev/source/b_x/publication/monsters/assets).

This slate proposes `33` new images:

- `23` core fantasy monsters
- `4` animals
- `3` insects
- `3` NPC entries

That would raise the book from `24` existing visual assets (`23` plates plus `1` diagram) to `57` total visuals, which is comfortably above one-third illustrated coverage for the `138` monster entries in the combined book.

## Style Anchor

The new images should match the existing plates rather than trying to modernize them.

- Black-and-white pen-and-ink line art
- Very high contrast, suitable for print reduction
- Minimal or no environmental background
- One clear subject or a tightly grouped encounter vignette
- Clean silhouettes that survive small reproduction
- Composition biased toward horizontal or near-square plates
- No painted grayscale rendering, no soft digital shading, no comic-book color

## Naming Convention

Use asset filenames in the same general pattern as the current set:

- `bugbear-plate.png`
- `dragon-turtle-plate.png`
- `bandit-plate.png`

## Selected New Plates

### Core Fantasy Monsters

1. `Black Pudding` -> `black-pudding-plate.png`
2. `Blink Dog` -> `blink-dog-plate.png`
3. `Bugbear` -> `bugbear-plate.png`
4. `Centaur` -> `centaur-plate.png`
5. `Chimera` -> `chimera-plate.png`
6. `Displacer Beast` -> `displacer-beast-plate.png`
7. `Dragon` -> `dragon-plate.png`
8. `Dragon Turtle` -> `dragon-turtle-plate.png`
9. `Efreeti, Lesser*` -> `efreeti-plate.png`
10. `Gargoyle*` -> `gargoyle-plate.png`
11. `Gelatinous Cube` -> `gelatinous-cube-plate.png`
12. `Griffon` -> `griffon-plate.png`
13. `Harpy` -> `harpy-plate.png`
14. `Hippogriff` -> `hippogriff-plate.png`
15. `Lizard Man` -> `lizard-man-plate.png`
16. `Manticore` -> `manticore-plate.png`
17. `Minotaur` -> `minotaur-plate.png`
18. `Owl Bear` -> `owl-bear-plate.png`
19. `Purple Worm` -> `purple-worm-plate.png`
20. `Rust Monster` -> `rust-monster-plate.png`
21. `Treant` -> `treant-plate.png`
22. `Unicorn` -> `unicorn-plate.png`
23. `Wyvern` -> `wyvern-plate.png`

### Animals

1. `Bear` -> `bear-plate.png`
2. `Crocodile` -> `crocodile-plate.png`
3. `Shark` -> `shark-plate.png`
4. `Snake` -> `snake-plate.png`

### Insects

1. `Ant, Driver` -> `driver-ant-plate.png`
2. `Beetle, Giant` -> `giant-beetle-plate.png`
3. `Scorpion, Giant` -> `giant-scorpion-plate.png`

### NPCs

1. `Bandit` -> `bandit-plate.png`
2. `Dwarf` -> `dwarf-plate.png`
3. `Elf` -> `elf-plate.png`

## Prompt Direction

Use one prompt family for the whole slate so the images feel like they came from the same book.

Base direction:

```text
Use case: illustration-story
Asset type: interior RPG rulebook monster plate
Primary request: a black-and-white pen-and-ink illustration of <subject>
Scene/backdrop: plain white background or minimal ground indication only
Subject: <subject description>
Style/medium: vintage fantasy rulebook line art, crisp inked contours, sparse crosshatching, print-friendly
Composition/framing: centered subject, strong silhouette, horizontal or near-square composition, generous margins
Lighting/mood: stark, readable, dramatic but uncluttered
Color palette: black ink on white paper only
Materials/textures: scales, fur, hide, bone, wood, or armor rendered with economical line work
Constraints: no color, no painterly shading, no elaborate scenery, no text, no watermark
Avoid: gray wash, glossy digital rendering, modern comic style, busy background, cropped anatomy
```

## Subject Notes

Use these notes to keep each plate specific without drifting away from the shared style.

- `Black Pudding`: amorphous ooze creeping over dungeon stone, engulfing a helmet or shield for scale.
- `Blink Dog`: lean fey hunting dog posed alert, with a subtle doubled outline or offset echo to suggest teleportation.
- `Bugbear`: shaggy goblinoid brute with club or morning star, crouched in ambush.
- `Centaur`: archer in profile, human torso twisted back with drawn bow.
- `Chimera`: all three heads clearly readable, posed as a single aggressive mass.
- `Displacer Beast`: panther-like body with tentacles, lit for silhouette clarity.
- `Dragon`: classic B/X dragon in a dominant heraldic pose, wings partially spread.
- `Dragon Turtle`: huge armored sea reptile surfacing with shell and dragon head both visible.
- `Efreeti`: towering flame-born noble with curved blade and smoke-like lower body.
- `Gargoyle`: horned stone creature perched on ruined masonry.
- `Gelatinous Cube`: transparent cubic ooze with trapped bones and gear visible inside.
- `Griffon`: rearing eagle-lion hybrid, claws forward.
- `Harpy`: winged humanoid shrieking from a rocky perch.
- `Hippogriff`: proud avian-horse hybrid in a grounded three-quarter pose.
- `Lizard Man`: reptilian tribal warrior with spear and shield.
- `Manticore`: leonine body, human-like face, spined tail arched forward.
- `Minotaur`: horned labyrinth brute with axe, broad frontal mass.
- `Owl Bear`: hulking feathered-bear hybrid, beak open, claws set wide.
- `Purple Worm`: massive segmented worm erupting from below, jaws dominating the composition.
- `Rust Monster`: insectoid scavenger with antennae reaching toward corroded armor.
- `Treant`: ancient walking tree with face worked into bark grain, limbs like branches.
- `Unicorn`: elegant single-horned horse in a clean, almost heraldic forest-edge pose.
- `Wyvern`: two-legged dragon with barbed tail emphasized in the silhouette.
- `Bear`: heavy naturalistic beast, side profile with strong shoulder mass.
- `Crocodile`: low stalking reptile, jaws slightly open, body curve visible.
- `Shark`: side-view predator with mouth and fin profile clearly readable.
- `Snake`: coiled striking serpent with a simple ground line only.
- `Driver Ant`: oversized ant shown in threatening close grouping, emphasizing mandibles.
- `Giant Beetle`: chitin and horn structure emphasized over background detail.
- `Giant Scorpion`: claws and tail clearly separated for readability at print size.
- `Bandit`: hard-bitten outlaw with bow or sword, rough travel gear rather than ornate armor.
- `Dwarf`: compact armored warrior with axe and shield, sturdy stance.
- `Elf`: lithe warrior-mage or archer, elegant but restrained equipment.

## Recommended Rollout

Generate and integrate these in batches rather than all at once:

1. Core monsters: `Dragon`, `Minotaur`, `Owl Bear`, `Rust Monster`, `Wyvern`
2. Core monsters: `Chimera`, `Displacer Beast`, `Griffon`, `Harpy`, `Manticore`
3. Core monsters: remaining fantasy slate
4. Animals, insects, and NPCs

This makes it easier to check style consistency and page-layout impact before the whole set is committed.
