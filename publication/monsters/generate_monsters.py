from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path


ROOT = Path(__file__).resolve().parent
WORKING = ROOT / "working"
FIELD_PATTERN = r"(?:Armor Class|Hit Dice|Move|Flying|Fly|Attacks|Damage|No\. Appearing|Save As|Morale|Treasure(?: Type)?|Alignment)"
STAT_DISPLAY_ORDER = [
    "Armor Class",
    "Hit Dice",
    "Move",
    "Flying",
    "Fly",
    "Attacks",
    "Damage",
    "No. Appearing",
    "Save As",
    "Morale",
    "Treasure",
    "Treasure Type",
    "Alignment",
]


BASIC_ORDER = [
    "Acolyte",
    "Ape, White",
    "Bandit",
    "Bat",
    "Bear",
    "Beetle, Giant",
    "Berserker",
    "Boar",
    "Bugbear",
    "Carrion Crawler",
    "Cat, Great",
    "Cave Locust",
    "Centipede, Giant",
    "Doppleganger",
    "Dragon",
    "Ant, Driver",
    "Dwarf",
    "Elf",
    "Ferret, Giant",
    "Gargoyle",
    "Gelatinous Cube",
    "Ghoul",
    "Gnoll",
    "Gnome",
    "Goblin",
    "Gray Ooze",
    "Green Slime",
    "Halfling",
    "Harpy",
    "Hobgoblin",
    "Insect Swarms",
    "Killer Bee",
    "Kobold",
    "Lizard Man",
    "Living Statue",
    "Lycanthropes",
    "Medium",
    "Medusa",
    "Minotaur",
    "Mule",
    "Neanderthal (Caveman)",
    "Noble",
    "Normal Human",
    "NPC Party",
    "Ochre Jelly",
    "Ogre",
    "Orc",
    "Owl Bear",
    "Pixie",
    "Rat",
    "Robber Fly",
    "Rock Baboon",
    "Rust Monster",
    "Shadow",
    "Shrew, Giant",
    "Shrieker",
    "Skeleton",
    "Snake",
    "Spider, Giant",
    "Sprite",
    "Stirge",
    "Thoul",
    "Trader",
    "Troglodyte",
    "Veteran",
    "Wight",
    "Wolf",
    "Yellow Mold",
    "Zombie",
]

EXPERT_ORDER = [
    "Antelope (Herd Animals)",
    "Basilisk",
    "Black Pudding",
    "Blink Dog",
    "Caecilia",
    "Camel",
    "Chimera",
    "Cockatrice",
    "Crab, Giant",
    "Crocodile",
    "Cyclops",
    "Devil Swine",
    "Displacer Beast",
    "Djinni (Lesser)",
    "Dragon Turtle",
    "Dryad",
    "Efreeti (Lesser)",
    "Elemental",
    "Elephant",
    "Fish, Giant",
    "Giant",
    "Gorgon",
    "Griffon",
    "Hawk",
    "Hellhound",
    "Hippogriff",
    "Horse",
    "Hydra",
    "Invisible Stalker",
    "Leech, Giant",
    "Manticore",
    "Mastodon",
    "Men",
    "Mermen",
    "Mummy",
    "Nixies",
    "NPC Parties",
    "Octopus, Giant",
    "Pegasus",
    "Pterodactyl",
    "Purple Worm",
    "Rhinoceros",
    "Rhagodessa",
    "Roc",
    "Salamander",
    "Scorpion, Giant",
    "Sea Dragons",
    "Sea Serpent (Lesser)",
    "Shark",
    "Spectre",
    "Squid, Giant",
    "Stegosaurus",
    "Termite, Water",
    "Titanothere",
    "Toad, Giant",
    "Treant",
    "Triceratops",
    "Troll",
    "Tyrannosaurus Rex",
    "Unicorn",
    "Vampire",
    "Weasel, Giant",
    "Whale",
    "Wraith",
    "Wyvern",
]

ALIASES = {
    "Ant, Driver": "Driver Ant",
    "Cat, Great": "Cat, Great       '",
    "Cave Locust": "Cave Locust:",
    "Gargoyle": "Gargoyle*",
    "Green Slime": "Green Slime •",
    "Lycanthropes": "Lycanthropes*",
    "Ochre Jelly": "Ochre Jelly'",
    "Orc": "Ore",
    "Rat": "Rat",
    "Rust Monster": "Rust Monster*",
    "Shadow": "Shadow*",
    "Wight": "Wight*",
    "Yellow Mold": "Yellow Mold'",
    "Black Pudding": "Black Pudding*",
    "Djinni (Lesser)": "Djinni (Lesser)*",
    "Efreeti (Lesser)": "Efreeti (Lesser)'",
    "Mummy": "Mummy*",
    "Salamander": "Salamander*",
    "Spectre": "Spectre*",
    "Vampire": "Vampire'",
    "Wraith": "Wraith*",
}

ART_BY_NAME = {
    "Ape, White": "![Basic monster illustration: white ape](assets/white-ape-plate.png)\n",
    "Basilisk": "![Expert monster illustration: basilisk](assets/basilisk-plate.png)\n",
    "Carrion Crawler": "![Basic monster illustration: carrion crawler](assets/carrion-crawler-plate.png)\n",
    "Cat, Great": "![Basic monster illustration: great cat](assets/cat-great-plate.png)\n",
    "Cockatrice": "![Expert monster illustration: cockatrice](assets/cockatrice-plate.png)\n",
    "Giant": "![Expert monster illustration: giants](assets/giant-plate.png)\n",
    "Hydra": "![Expert monster illustration: hydra](assets/hydra-plate.png)\n",
    "Killer Bee": "![Basic monster illustration: killer bee](assets/killer-bee-plate.png)\n",
    "Kobold": "![Basic monster illustration: kobold](assets/kobold-plate.png)\n",
    "Lizards, Giant": "![Basic monster illustration: giant lizards](assets/lizards-giant-plate.png)\n",
    "Medusa": "![Basic monster illustration: medusa](assets/medusa-plate.png)\n",
    "Pixie": "![Basic monster illustration: pixies](assets/pixie-plate.png)\n",
    "Octopus, Giant": "![Expert monster plate: octopus](assets/octopus-plate.png)\n",
    "Pegasus": "![Expert monster plate: pegasus](assets/pegasus-plate.png)\n",
    "Salamander": "![Expert monster plate: salamander](assets/salamander-plate.png)\n",
    "Sea Serpent (Lesser)": "![Expert monster plate: sea serpents](assets/sea-serpent-plate.png)\n",
    "Skeleton": "![Basic monster illustration: skeleton](assets/skeleton-plate.png)\n",
    "Spider, Giant": "![Basic monster illustration: giant spider](assets/spider-plate.png)\n",
    "Spectre": "![Expert monster plate: spectre](assets/spectre-plate.png)\n",
    "Termite, Water": "![Expert monster plate: water termite](assets/termite-plate.png)\n",
    "Troglodyte": "![Basic monster illustration: troglodyte](assets/troglodyte-plate.png)\n",
    "Vampire": "![Expert monster plate: vampire](assets/vampire-plate.png)\n",
    "Whale": "![Expert monster plate: whale](assets/whale-plate.png)\n",
}

MANUAL_INSERTED_NAMES = {
    "Centaur",
    "Chimera",
    "Cockatrice",
    "Crab, Giant",
    "Crocodile",
    "Cyclops",
    "Devil Swine",
    "Displacer Beast",
    "Djinni (Lesser)",
    "Dragon Turtle",
    "Dryad",
    "Elemental",
    "Elephant",
    "Fish, Giant",
    "Golem",
    "Griffon",
    "Hellhound",
    "Horse",
    "Hydra",
    "Invisible Stalker",
    "Leech, Giant",
    "Manticore",
    "Mastodon",
    "Troglodyte",
}

POST_BODY_ART_NAMES = {
    "Ape, White",
    "Basilisk",
    "Carrion Crawler",
    "Cat, Great",
    "Cockatrice",
    "Giant",
    "Hydra",
    "Killer Bee",
    "Kobold",
    "Lizards, Giant",
    "Medusa",
    "Octopus, Giant",
    "Pegasus",
    "Pixie",
    "Salamander",
    "Sea Serpent (Lesser)",
    "Skeleton",
    "Spectre",
    "Spider, Giant",
    "Termite, Water",
    "Troglodyte",
    "Vampire",
    "Whale",
}

MANUAL_RENDER = {
    "Camel": """
| Stat | Value |
| --- | --- |
| Armor Class | 7 |
| Hit Dice | 2 |
| Move | 150' (50') |
| Attacks | 1 bite / 1 hoof |
| Damage | 1 / 1-4 |
| No. Appearing | 0 (2-8) |
| Save As | Fighter: 1 |
| Morale | 7 |
| Treasure Type | Nil |
| Alignment | Neutral |
""".strip(),
    "Cat, Great": """
| Stat | Mountain Lion | Panther | Lion | Sabre-tooth Tiger | Tiger |
| --- | --- | --- | --- | --- | --- |
| Armor Class | 6 | 4 | 6 | 6 | 6 |
| Hit Dice | 3 + 2 | 4 | 5 | 6 | 8 |
| Move | 150' (50') | 210' (70') | 150' (50') | 150' (50') | 150' (50') |
| Attacks | 2 claws / 1 bite | 2 claws / 1 bite | 2 claws / 1 bite | 2 claws / 1 bite | 2 claws / 1 bite |
| Damage | 1-3 / 1-3 / 1-6 | 1-4 / 1-4 / 1-8 | 2-5 / 2-5 / 1-10 | 1-6 / 1-6 / 2-12 | 1-8 / 1-8 / 2-16 |
| No. Appearing | 1-4 (1-4) | 1-2 (1-6) | 1-4 (1-8) | 1 (1-3) | 1-4 (1-4) |
| Save As | Fighter: 2 | Fighter: 2 | Fighter: 3 | Fighter: 3 | Fighter: 4 |
| Morale | 8 | 8 | 9 | 9 | 10 |
| Treasure Type | U | U | U | U | V |
| Alignment | Neutral | Neutral | Neutral | Neutral | Neutral |
""".strip(),
    "Centaur": """
| Stat | Value |
| --- | --- |
| Armor Class | 5 |
| Hit Dice | 4 |
| Move | 180' (60') |
| Attacks | 2 hooves / 1 weapon |
| Damage | 1-6 / 1-6 / 1-6 or by weapon |
| No. Appearing | 0 (2-20) |
| Save As | Fighter: 4 |
| Morale | 8 |
| Treasure Type | A |
| Alignment | Neutral |
""".strip(),
    "Cave Locust": """
| Stat | Value |
| --- | --- |
| Armor Class | 4 |
| Hit Dice | 2 |
| Move | 60' (20') |
| Fly | 180' (60') |
| Attacks | 1 bite or 1 bump or 1 spit |
| Damage | 1-2 or 1-4 or see below |
| No. Appearing | 2-20 (1-10) |
| Save As | Fighter: 2 |
| Morale | 5 |
| Treasure Type | Nil |
| Alignment | Neutral |
""".strip(),
    "Chimera": """
| Stat | Value |
| --- | --- |
| Armor Class | 4 |
| Hit Dice | 9** |
| Move | 120' (40') |
| Flying | 180' (60') |
| Attacks | 2 claws / 3 heads + special |
| Damage | 1-3 / 1-3 / 2-8 / 2-8 / 3-12 + special |
| No. Appearing | 1-2 (1-4) |
| Save As | Fighter: 9 |
| Morale | 9 |
| Treasure Type | F |
| Alignment | Chaotic |
""".strip(),
    "Cockatrice": """
| Stat | Value |
| --- | --- |
| Armor Class | 6 |
| Hit Dice | 5** |
| Move | 90' (30') |
| Flying | 180' (60') |
| Attacks | 1 beak + special |
| Damage | 1-6 + petrification |
| No. Appearing | 1-4 (1-8) |
| Save As | Fighter: 5 |
| Morale | 7 |
| Treasure Type | D |
| Alignment | Neutral |
""".strip(),
    "Crab, Giant": """
| Stat | Value |
| --- | --- |
| Armor Class | 2 |
| Hit Dice | 3 |
| Move | 60' (20') |
| Attacks | 2 pincers |
| Damage | 2-12 / 2-12 |
| No. Appearing | 1-2 (1-6) |
| Save As | Fighter: 2 |
| Morale | 7 |
| Treasure Type | Nil |
| Alignment | Neutral |
""".strip(),
    "Crocodile": """
| Stat | Crocodile | Large Crocodile | Giant Crocodile |
| --- | --- | --- | --- |
| Armor Class | 5 | 3 | 1 |
| Hit Dice | 2 | 6 | 15 |
| Move | 90' (30') | 90' (30') | 90' (30') |
| Swimming | 90' (30') | 90' (30') | 90' (30') |
| Attacks | 1 | 1 | 1 |
| Damage | 1-8 | 2-16 | 3-24 |
| No. Appearing | 0 (1-8) | 0 (1-4) | 0 (1-3) |
| Save As | Fighter: 1 | Fighter: 3 | Fighter: 8 |
| Morale | 7 | 7 | 9 |
| Treasure Type | Nil | Nil | Nil |
| Alignment | Neutral | Neutral | Neutral |
""".strip(),
    "Cyclops": """
| Stat | Value |
| --- | --- |
| Armor Class | 5 |
| Hit Dice | 13* |
| Move | 90' (30') |
| Attacks | 1 |
| Damage | 3-30 |
| No. Appearing | 1 (1-4) |
| Save As | Fighter: 13 |
| Morale | 9 |
| Treasure Type | E + 5000 gp |
| Alignment | Chaotic |
""".strip(),
    "Devil Swine": """
| Stat | Value |
| --- | --- |
| Armor Class | 3 (9) |
| Hit Dice | 9* |
| Move | 180' (60') |
| Human | 120' (40') |
| Attacks | 1 gore (or blow) |
| Damage | 2-12 (or by weapon) |
| No. Appearing | 1-3 (1-4) |
| Save As | Fighter: 9 |
| Morale | 10 |
| Treasure Type | C |
| Alignment | Chaotic |
""".strip(),
    "Displacer Beast": """
| Stat | Value |
| --- | --- |
| Armor Class | 4 |
| Hit Dice | 6* |
| Move | 150' (50') |
| Attacks | 2 tentacles |
| Damage | 2-8 / 2-8 |
| No. Appearing | 1-4 (1-4) |
| Save As | Fighter: 6 |
| Morale | 8 |
| Treasure Type | D |
| Alignment | Neutral |
""".strip(),
    "Djinni (Lesser)": """
| Stat | Value |
| --- | --- |
| Armor Class | 5 |
| Hit Dice | 7 + 1 |
| Move | 90' (30') |
| Flying | 240' (80') |
| Attacks | 1 + special |
| Damage | 2-16 (fists), or 2-12 (whirlwind) |
| No. Appearing | 1 (0) |
| Save As | Fighter: 14 |
| Morale | 12 |
| Treasure Type | Nil |
| Alignment | Neutral |
""".strip(),
    "Dragon Turtle": """
| Stat | Value |
| --- | --- |
| Armor Class | -2 |
| Hit Dice | 30 |
| Move | 30' (10') |
| Swimming | 90' (30') |
| Attacks | 2 claws / 1 bite |
| Damage | 1-8 claw / 10-60 bite |
| No. Appearing | 0 (1) |
| Save As | Fighter: 15 |
| Morale | 10 |
| Treasure Type | H |
| Alignment | Chaotic |
""".strip(),
    "Dryad": """
| Stat | Value |
| --- | --- |
| Armor Class | 5 |
| Hit Dice | 2* |
| Movement | 120' (40') |
| Attacks | See below |
| Damage | 0 |
| No. Appearing | 0 (1-6) |
| Save As | Fighter: 4 |
| Morale | 6 |
| Treasure Type | D |
| Alignment | Neutral |
""".strip(),
    "Elemental": """
| Stat | Air | Earth | Fire | Water |
| --- | --- | --- | --- | --- |
| Armor Class | Variable | Variable | Variable | Variable |
| Hit Dice | Variable | Variable | Variable | Variable |
| Move | Fly 360' (120') | 60' (20') | 120' (40') | 60' (20'); Swim 180' (60') |
| Attacks | Special | Special | Special | Special |
| Damage | Variable | Variable | Variable | Variable |
| No. Appearing | 1 (1) | 1 (1) | 1 (1) | 1 (1) |
| Save As | Variable | Variable | Variable | Variable |
| Morale | 10 | 10 | 10 | 10 |
| Treasure Type | Nil | Nil | Nil | Nil |
| Alignment | Neutral | Neutral | Neutral | Neutral |
""".strip(),
    "Elephant": """
| Stat | Value |
| --- | --- |
| Armor Class | 5 |
| Hit Dice | 9 |
| Move | 120' (40') |
| Attacks | 2 tusks or 1 trample |
| Damage | 2-8 / 2-8 or 4-32 |
| No. Appearing | 0 (1-20) |
| Save As | Fighter: 5 |
| Morale | 8 |
| Treasure Type | See below |
| Alignment | Neutral |
""".strip(),
    "Efreeti (Lesser)": """
| Stat | Value |
| --- | --- |
| Armor Class | 3 |
| Hit Dice | 10* |
| Move | 90' (30') |
| Flying | 240' (80') |
| Attacks | 1 |
| Damage | 2-16 |
| No. Appearing | 1 (1) |
| Save As | Fighter: 15 |
| Morale | 12 |
| Treasure Type | Nil |
| Alignment | Chaotic |
""".strip(),
    "Fish, Giant": """
| Stat | Giant Piranha | Giant Rockfish | Giant Catfish | Giant Sturgeon |
| --- | --- | --- | --- | --- |
| Armor Class | 6 | 7 | 4 | 0 |
| Hit Dice | 3 + 3 | 5 + 5 | 8 + 3* | 10 + 2* |
| Move (swimming) | 150' (50') | 180' (60') | 90' (30') | 180' (60') |
| Attacks | 1 bite | 4 spines + poison | 1 bite / 4 feelers | 1 bite |
| Damage | 1-8 | (1-4) x 4 + poison | 2-16 / (1-4) x 4 | 2-20 |
| No. Appearing | 0 (2-8) | 0 (2-8) | 0 (1-2) | 0 (1) |
| Save As | Fighter: 2 | Fighter: 3 | Fighter: 4 | Fighter: 5 |
| Morale | 7 | 8 | 8 | 9 |
| Treasure Type | Nil | Nil | Nil | Nil |
| Alignment | Neutral | Neutral | Neutral | Neutral |
""".strip(),
    "Giant": """
| Stat | Hill Giant | Stone Giant | Frost Giant | Fire Giant | Cloud Giant | Storm Giant |
| --- | --- | --- | --- | --- | --- | --- |
| Armor Class | 4 | 4 | 4 | 4 | 4 | 2 |
| Hit Dice | 8 | 9 | 10 + 1 | 11 + 2 | 12 + 3 | 15 |
| Move | 120' (40') | 120' (40') | 120' (40') | 120' (40') | 120' (40') | 150' (50') |
| Attacks | 1 | 1 | 1 | 1 | 1 | 1 + special |
| Damage | 2-16 | 3-18 | 4-24 | 5-30 | 6-36 | 8-48 + special |
| No. Appearing | 1-4 (2-8) | 1-2 (1-6) | 1-2 (1-4) | 1-2 (1-3) | 1-2 (1-3) | 1-2 (1-3) |
| Save As | Fighter: 8 | Fighter: 9 | Fighter: 10 | Fighter: 11 | Fighter: 12 | Fighter: 15 |
| Morale | 8 | 9 | 9 | 9 | 10 | 10 |
| Treasure Type | E + 5000 gp | E + 5000 gp | E + 5000 gp | E + 5000 gp | E + 5000 gp | E + 5000 gp |
| Alignment | Chaotic | Neutral | Chaotic | Chaotic | Neutral | Lawful |
""".strip(),
    "Golem": """
| Stat | Wood | Bone | Amber | Bronze |
| --- | --- | --- | --- | --- |
| Armor Class | 7 | 2 | 6 | 0 |
| Hit Dice | 2 + 2 | 8 | 10** | 20** |
| Move | 120' (40') | 120' (40') | 180' (60') | 240' (80') |
| Attacks | 1 fist | 4 weapons | 2 claws / 1 bite | 1 fist + special |
| Damage | 1-8 | By weapon | 2-12 / 2-12 / 2-20 | 3-30 + special |
| No. Appearing | 1 (1) | 1 (1) | 1 (1) | 1 (1) |
| Save As | Fighter: 1 | Fighter: 4 | Fighter: 5 | Fighter: 10 |
| Morale | 12 | 12 | 12 | 12 |
| Treasure Type | Nil | Nil | Nil | Nil |
| Alignment | Neutral | Neutral | Neutral | Neutral |
""".strip(),
    "Gorgon": """
| Stat | Value |
| --- | --- |
| Armor Class | 2 |
| Hit Dice | 8* |
| Move | 120' (40') |
| Attacks | 1 gore or breath |
| Damage | 2-12 or petrification |
| No. Appearing | 1-2 (1-4) |
| Save As | Fighter: 8 |
| Morale | 8 |
| Treasure Type | E |
| Alignment | Chaotic |
""".strip(),
    "Griffon": """
| Stat | Value |
| --- | --- |
| Armor Class | 5 |
| Hit Dice | 7 |
| Move | 120' (40') |
| Flying | 360' (120') |
| Attacks | 2 claws / 1 bite |
| Damage | 1-4 / 1-4 / 2-16 |
| No. Appearing | 0 (2-16) |
| Save As | Fighter: 4 |
| Morale | 8 |
| Treasure Type | E |
| Alignment | Neutral |
""".strip(),
    "Gray Ooze": """
| Stat | Value |
| --- | --- |
| Armor Class | 8 |
| Hit Dice | 3* |
| Move | 10' (3') |
| Attacks | 1 |
| Damage | 2-16 |
| No. Appearing | 1 (1) |
| Save As | Fighter: 2 |
| Morale | 12 |
| Treasure Type | Nil |
| Alignment | Neutral |
""".strip(),
    "Green Slime": """
| Stat | Value |
| --- | --- |
| Armor Class | Can always be hit |
| Hit Dice | 2* |
| Move | 3' (1') |
| Attacks | 1 |
| Damage | See below |
| No. Appearing | 1 (0) |
| Save As | Fighter: 1 |
| Morale | 12 |
| Treasure Type | Nil |
| Alignment | Neutral |
""".strip(),
    "Hippogriff": """
| Stat | Value |
| --- | --- |
| Armor Class | 5 |
| Hit Dice | 3 + 1 |
| Move | 180' (60') |
| Flying | 360' (120') |
| Attacks | 2 claws / 1 bite |
| Damage | 1-6 / 1-6 / 1-10 |
| No. Appearing | 0 (2-16) |
| Save As | Fighter: 2 |
| Morale | 8 |
| Treasure Type | Nil |
| Alignment | Neutral |
""".strip(),
    "Hawk": """
| Stat | Normal Hawk | Giant Hawk |
| --- | --- | --- |
| Armor Class | 8 | 6 |
| Hit Dice | 1/2 (1-4 hit points) | 3 + 3 |
| Move | Fly 480' (160') | Fly 450' (150') |
| Attacks | 1 | 1 |
| Damage | 1-2 | 1-6 |
| No. Appearing | 0 (1-6) | 0 (1-3) |
| Save As | Normal Man | Fighter: 2 |
| Morale | 7 | 8 |
| Treasure Type | Nil | Nil |
| Alignment | Neutral | Neutral |
""".strip(),
    "Hellhound": """
| Stat | Value |
| --- | --- |
| Armor Class | 4 |
| Hit Dice | 3-7* |
| Move | 120' (40') |
| Attacks | Bite or breath |
| Damage | 1-6 or special |
| No. Appearing | 2-8 (2-8) |
| Save As | Variable |
| Morale | 9 |
| Treasure Type | C |
| Alignment | Chaotic |
""".strip(),
    "Horse": """
| Stat | Riding Horse | War Horse | Draft Horse |
| --- | --- | --- | --- |
| Armor Class | 1 | 7 | 7 |
| Hit Dice | 2 | 3 | 3 |
| Move | 240' (80') | 120' (40') | 90' (30') |
| Attacks | 2 hooves | 2 hooves | Nil |
| Damage | 1-4 / 1-4 | 1-6 / 1-6 | Nil |
| No. Appearing | 0 (10-100) | 0 (domestic only) | 0 (domestic only) |
| Save As | Fighter: 1 | Fighter: 2 | Fighter: 2 |
| Morale | 7 | 9 | 6 |
| Treasure Type | Nil | Nil | Nil |
| Alignment | Neutral | Neutral | Neutral |
""".strip(),
    "Hydra": """
| Stat | Value |
| --- | --- |
| Armor Class | 5 |
| Hit Dice | 5-12 |
| Move | 120' (40') |
| Attacks | 5-12 (see below) |
| Damage | 1-10 per head |
| No. Appearing | 1 (1) |
| Save As | Fighter (see below) |
| Morale | 9 |
| Treasure Type | B |
| Alignment | Neutral |
""".strip(),
    "Invisible Stalker": """
| Stat | Value |
| --- | --- |
| Armor Class | 3 |
| Hit Dice | 8* |
| Move | 120' (40') |
| Attacks | 1 |
| Damage | 4-16 |
| No. Appearing | 1 (1) |
| Save As | Fighter: 8 |
| Morale | 12 |
| Treasure Type | Nil |
| Alignment | Neutral |
""".strip(),
    "Leech, Giant": """
| Stat | Value |
| --- | --- |
| Armor Class | 7 |
| Hit Dice | 6 |
| Move | 90' (30') |
| Attacks | Blood suck |
| Damage | 1-6 |
| No. Appearing | 0 (1-4) |
| Save As | Fighter: 3 |
| Morale | 10 |
| Treasure Type | Nil |
| Alignment | Neutral |
""".strip(),
    "Bat": """
| Stat | Normal | Giant |
| --- | --- | --- |
| Armor Class | 6 | 6 |
| Hit Dice | 1 point (0 level man) | 2 |
| Move | 9' (3') | 30' (10') |
| Fly | 120' (40') | 180' (60') |
| Attacks | Confusion | 1 bite |
| Damage | Nil | 1-4 |
| No. Appearing | 1-100 (1-100) | 1-10 (1-10) |
| Save As | Normal Man | Fighter: 1 |
| Morale | 6 | 8 |
| Treasure | Nil | Nil |
| Alignment | Neutral | Neutral |
""".strip(),
    "Antelope (Herd Animals)": """
| Stat | Value |
| --- | --- |
| Armor Class | 7 |
| Hit Dice | (Variable 1-4) |
| Move | 240' (80') |
| Attacks | 1 butt |
| Damage | 1-4 or 1-6 or 1-8 |
| No. Appearing | 0 (3-30) |
| Save As | Fighter: 1 or 2 |
| Morale | 5 |
| Treasure Type | Nil |
| Alignment | Neutral |
""".strip(),
    "Bear": """
| Stat | Black | Grizzly | Polar | Cave |
| --- | --- | --- | --- | --- |
| Armor Class | 6 | 6 | 6 | 5 |
| Hit Dice | 4 | 5 | 6 | 7 |
| Move | 120' (40') | 120' (40') | 120' (40') | 120' (40') |
| Attacks | 2 claws / 1 bite | 2 claws / 1 bite | 2 claws / 1 bite | 2 claws / 1 bite |
| Damage | 1-3 / 1-3 / 1-6 | 1-4 / 1-4 / 1-8 | 1-6 / 1-6 / 1-10 | 1-8 / 1-8 / 2-12 |
| No. Appearing | 1-4 (1-4) | 1-4 (1-4) | 1 (1-2) | 1-2 (1-2) |
| Save As | Fighter: 2 | Fighter: 2 | Fighter: 3 | Fighter: 3 |
| Morale | 7 | 8 | 8 | 9 |
| Treasure Type | U | U | U | V |
| Alignment | Neutral | Neutral | Neutral | Neutral |
""".strip(),
    "Beetle, Giant": """
| Stat | Fire | Oil | Tiger |
| --- | --- | --- | --- |
| Armor Class | 4 | 4 | 3 |
| Hit Dice | 1 + 2 | 2* | 3 + 1 |
| Move | 120' (40') | 120' (40') | 150' (50') |
| Attacks | 1 bite | 1 bite + special | 1 bite |
| Damage | 2-8 | 1-6 + special | 2-12 |
| No. Appearing | 1-8 (2-12) | 1-8 (2-12) | 1-6 (2-8) |
| Save As | Fighter: 1 | Fighter: 1 | Fighter: 1 |
| Morale | 7 | 8 | 9 |
| Treasure Type | Nil | Nil | U |
| Alignment | Neutral | Neutral | Neutral |
""".strip(),
    "Dragon": """
| Stat | White | Black | Green | Blue | Red | Gold |
| --- | --- | --- | --- | --- | --- | --- |
| Armor Class | 3 | 2 | 1 | 0 | -1 | -2 |
| Hit Dice | 6** | 7** | 8** | 9** | 10** | 11** |
| Move | 90' (30'); fly 240' (80') | 90' (30'); fly 240' (80') | 90' (30'); fly 240' (80') | 90' (30'); fly 240' (80') | 90' (30'); fly 240' (80') | 90' (30'); fly 240' (80') |
| Attacks | 2 claws / 1 bite + breath | 2 claws / 1 bite + breath | 2 claws / 1 bite + breath | 2 claws / 1 bite + breath | 2 claws / 1 bite + breath | 2 claws / 1 bite + breath |
| Damage | 1-4 / 1-4 / 2-16 | 2-5 / 2-5 / 2-20 | 1-6 / 1-6 / 3-24 | 2-7 / 2-7 / 3-30 | 1-8 / 1-8 / 4-32 | 2-8 / 2-8 / 6-36 |
| No. Appearing | 1-4 (1-4) | 1-4 (1-4) | 1-4 (1-4) | 1-4 (1-4) | 1-4 (1-4) | 1-4 (1-4) |
| Save As | Fighter: 6 | Fighter: 7 | Fighter: 8 | Fighter: 9 | Fighter: 10 | Fighter: 11 |
| Morale | 8 | 8 | 9 | 9 | 10 | 10 |
| Treasure Type | H | H | H | H | H | H |
| Alignment | Neutral | Chaotic | Chaotic | Neutral | Chaotic | Lawful |

| Trait | White | Black | Green | Blue | Red | Gold |
| --- | --- | --- | --- | --- | --- | --- |
| Where Found | Cold region | Swamp, marsh | Jungle, forest | Desert, plain | Mountain, hill | Anywhere |
| Breath Weapon | Cold | Acid | Chlorine gas | Lightning | Fire | Fire / gas |
| Range and Shape | 80' × 30' cone | 60' × 5' line | 50' × 40' cloud | 100' × 5' line | 90' × 30' cone | 90' × 30' cone / 50' × 40' cloud |
| Chance of Talking | 10% | 20% | 30% | 40% | 50% | 100% |
| Chance of Being Asleep | 50% | 40% | 30% | 20% | 10% | 5% |
| Spells by Level | 3 / - / - | 4 / - / - | 3 / 3 / - | 4 / 4 / - | 3 / 3 / 3 | 4 / 4 / 4 |
""".strip(),
    "Lizard Man": """
| Stat | Value |
| --- | --- |
| Armor Class | 5 |
| Hit Dice | 2 + 1 |
| Move | 60' (20'); in water 120' (40') |
| Attacks | 1 weapon |
| Damage | 2-7 or weapon + 1 |
| No. Appearing | 2-8 (6-36) |
| Save As | Fighter: 2 |
| Morale | 12 |
| Treasure Type | D |
| Alignment | Neutral |
""".strip(),
    "Living Statue": """
| Stat | Crystal | Iron | Rock |
| --- | --- | --- | --- |
| Armor Class | 4 | 2 | 4 |
| Hit Dice | 3 | 4 | 5* |
| Move | 90' (30') | 30' (10') | 60' (20') |
| Attacks | 2 blows | 2 blows + special | 2 blows |
| Damage | 1-6 / 1-6 | 1-8 / 1-8 + special | 2-12 / 2-12 |
| No. Appearing | 1-6 (1-6) | 1-4 (1-4) | 1-3 (1-3) |
| Save As | Fighter: 3 | Fighter: 4 | Fighter: 5 |
| Morale | 11 | 11 | 11 |
| Treasure Type | Nil | Nil | Nil |
| Alignment | Lawful | Neutral | Chaotic |
""".strip(),
    "Medium": """
| Stat | Value |
| --- | --- |
| Armor Class | 9 |
| Hit Dice | 1* |
| Move | 120' (40') |
| Attacks | 1 dagger or spell |
| Damage | 1-4 or by spell |
| No. Appearing | 1-4 (1-12) |
| Save As | Magic-user: 1 |
| Morale | 7 |
| Treasure Type | V |
| Alignment | Any |
""".strip(),
    "Neanderthal (Caveman)": """
| Stat | Value |
| --- | --- |
| Armor Class | 8 |
| Hit Dice | 2 |
| Move | 120' (40') |
| Attacks | 1 weapon |
| Damage | 2-8 or weapon + 1 |
| No. Appearing | 1-10 (10-40) |
| Save As | Fighter: 2 |
| Morale | 7 |
| Treasure Type | C |
| Alignment | Lawful |
""".strip(),
    "Noble": """
| Stat | Value |
| --- | --- |
| Armor Class | 2 |
| Hit Dice | 3 |
| Move | 60' (20') |
| Attacks | 1 weapon |
| Damage | 1-8 or weapon |
| No. Appearing | 2-12 (2-12) |
| Save As | Variable |
| Morale | 8 |
| Treasure Type | V x 3 |
| Alignment | Any |
""".strip(),
    "Lizards, Giant": """
| Stat | Gecko | Draco | Horned Chameleon | Tuatara |
| --- | --- | --- | --- | --- |
| Armor Class | 5 | 5 | 2 | 4 |
| Hit Dice | 3 + 1 | 4 + 2 | 5* | 6 |
| Move | 120' (40') | 120' (40'); fly 210' (70') | 120' (40') | 90' (30') |
| Attacks | 1 bite | 1 bite | 1 bite / 1 horn | 2 claws / 1 bite |
| Damage | 1-8 | 1-10 | 2-8 / 1-6 | 1-4 / 1-4 / 2-12 |
| No. Appearing | 1-6 (1-10) | 1-4 (1-8) | 1-3 (1-6) | 1-2 (1-4) |
| Save As | Fighter: 2 | Fighter: 3 | Fighter: 3 | Fighter: 4 |
| Morale | 7 | 7 | 7 | 6 |
| Treasure Type | U | U | U | V |
| Alignment | Neutral | Neutral | Neutral | Neutral |
""".strip(),
    "Lycanthropes": """
| Stat | Wererat | Werewolf | Wereboar | Weretiger | Werebear |
| --- | --- | --- | --- | --- | --- |
| Armor Class | 7, (9) | 5, (9) | 4, (9) | 3, (9) | 2, (8) |
| Hit Dice | 3* | 4* | 4 + 1* | 5* | 6* |
| Move | 120' (40') | 180' (60') | 150' (50') | 150' (50') | 120' (40') |
| Attacks | 1 bite or weapon | 1 bite | 1 tusk-bite | 2 claws / 1 bite | 2 claws / 1 bite |
| Damage | 1-4 or by weapon | 2-8 | 2-12 | 1-6 / 1-6 / 2-12 | 2-8 / 2-8 / 2-16 |
| No. Appearing | 1-8 (2-16) | 1-6 (2-12) | 1-4 (2-8) | 1-4 (1-4) | 1-4 (1-4) |
| Save As | Fighter: 3 | Fighter: 4 | Fighter: 4 | Fighter: 5 | Fighter: 6 |
| Morale | 8 | 8 | 9 | 9 | 10 |
| Treasure Type | C | C | C | C | C |
| Alignment | Chaotic | Chaotic | Neutral | Neutral | Neutral |
""".strip(),
    "Manticore": """
| Stat | Value |
| --- | --- |
| Armor Class | 4 |
| Hit Dice | 6 + 1 |
| Move | 120' (40') |
| Flying | 180' (60') |
| Attacks | 2 claws / 1 bite or spikes |
| Damage | 1-4 / 1-4 / 2-8 or special |
| No. Appearing | 1-2 (1-4) |
| Save As | Fighter: 6 |
| Morale | 9 |
| Treasure Type | D |
| Alignment | Chaotic |
""".strip(),
    "Mastodon": """
| Stat | Value |
| --- | --- |
| Armor Class | 3 |
| Hit Dice | 15 |
| Move | 120' (40') |
| Attacks | 2 tusks or 1 trample |
| Damage | 2-12 / 2-12 or 4-32 |
| No. Appearing | 0 (2-16) |
| Save As | Fighter: 8 |
| Morale | 8 |
| Treasure Type | See below |
| Alignment | Neutral |
""".strip(),
    "Mermen": """
| Stat | Value |
| --- | --- |
| Armor Class | 6 |
| Hit Dice | 1-4 |
| Move | 120' (40') |
| Attacks | 1 |
| Damage | 1-6 or by weapon |
| No. Appearing | 0 (1-20) |
| Save As | Fighter: 1 |
| Morale | 8 |
| Treasure Type | A |
| Alignment | Neutral |
""".strip(),
    "Pegasus": """
| Stat | Value |
| --- | --- |
| Armor Class | 6 |
| Hit Dice | 2 + 2 |
| Move | 240' (80') |
| Flying | 480' (160') |
| Attacks | 2 hooves |
| Damage | 1-6 / 1-6 |
| No. Appearing | 0 (1-12) |
| Save As | Fighter: 2 |
| Morale | 8 |
| Treasure Type | Nil |
| Alignment | Lawful |
""".strip(),
    "Pterodactyl": """
| Stat | Pterodactyl | Pteranodon |
| --- | --- | --- |
| Armor Class | 7 | 6 |
| Hit Dice | 1 | 5 |
| Flying | 180' (60') | 240' (120') |
| Attacks | 1 | 1 |
| Damage | 1-3 | 1-12 |
| No. Appearing | 0 (2-8) | 0 (1-4) |
| Save As | Fighter: 1 | Fighter: 3 |
| Morale | 7 | 8 |
| Treasure Type | Nil | V |
| Alignment | Neutral | Neutral |
""".strip(),
    "Rhinoceros": """
| Stat | Normal | Woolly |
| --- | --- | --- |
| Armor Class | 5 | 4 |
| Hit Dice | 6 | 8 |
| Move | 120' (40') | 120' (40') |
| Attacks | butt or trample | butt or trample |
| Damage | 2-8 or 2-16 | 2-12 or 2-24 |
| No. Appearing | 0 (1-12) | 0 (1-8) |
| Save As | Fighter: 3 | Fighter: 4 |
| Morale | 6 | 6 |
| Treasure Type | Nil | Nil |
| Alignment | Neutral | Neutral |
""".strip(),
    "Roc": """
| Stat | Small Roc | Large Roc | Giant Roc |
| --- | --- | --- | --- |
| Armor Class | 4 | 2 | 0 |
| Hit Dice | 6 | 12 | 36 |
| Move | 60' (20') | 60' (20') | 60' (20') |
| Flying | 480' (160') | 480' (160') | 480' (160') |
| Attacks | 2 claws / 1 bite | 2 claws / 1 bite | 2 claws / 1 bite |
| Damage | 2-5 / 2-5 / 2-12 | 1-8 / 1-8 / 2-20 | 3-18 / 3-18 / 8-48 |
| No. Appearing | 0 (1-12) | 0 (1-8) | 0 (1) |
| Save As | Fighter: 3 | Fighter: 6 | Fighter: 18 |
| Morale | 8 | 9 | 10 |
| Treasure Type | I | I | I |
| Alignment | Lawful | Lawful | Lawful |
""".strip(),
    "Salamander": """
| Stat | Flame Salamander | Frost Salamander |
| --- | --- | --- |
| Armor Class | 2 | 3 |
| Hit Dice | 8* | 12* |
| Move | 120' (40') | 120' (40') |
| Attacks | 2 claws / 1 bite | 4 claws / 1 bite |
| Damage | 1-4 / 1-4 / 1-8 | 1-6 (x4) / 2-12 |
| No. Appearing | 2-5 (2-8) | 1-3 (1-3) |
| Save As | Fighter: 8 | Fighter: 12 |
| Morale | 8 | 9 |
| Treasure Type | F | E |
| Alignment | Neutral | Chaotic |
""".strip(),
    "Scorpion, Giant": """
| Stat | Value |
| --- | --- |
| Armor Class | 2 |
| Hit Dice | 4* |
| Move | 150' (50') |
| Attacks | 2 claws / 1 sting |
| Damage | 1-10 / 1-10 / 1-4 + poison |
| No. Appearing | 1-6 (1-6) |
| Save As | Fighter: 2 |
| Morale | 11 |
| Treasure Type | V |
| Alignment | Chaotic |
""".strip(),
    "Sea Serpent (Lesser)": """
| Stat | Value |
| --- | --- |
| Armor Class | 5 |
| Hit Dice | 6 |
| Move | 150' (50') |
| Attacks | 1 bite or squeeze |
| Damage | 2-12 |
| No. Appearing | 0 (2-12) |
| Save As | Fighter: 3 |
| Morale | 8 |
| Treasure Type | Nil |
| Alignment | Neutral |
""".strip(),
    "Shark": """
| Stat | Bull | Mako | Great White |
| --- | --- | --- | --- |
| Armor Class | 4 | 4 | 4 |
| Hit Dice | 2 | 4 | 8 |
| Move | 180' (60') | 180' (60') | 180' (60') |
| Attacks | 1 bite | 1 bite | 1 bite |
| Damage | 2-8 | 2-12 | 2-20 |
| No. Appearing | 0 (3-18) | 0 (2-12) | 0 (1-4) |
| Save As | Fighter: 1 | Fighter: 2 | Fighter: 4 |
| Morale | 7 | 7 | 7 |
| Treasure Type | Nil | Nil | Nil |
| Alignment | Neutral | Neutral | Neutral |
""".strip(),
    "Spectre": """
| Stat | Value |
| --- | --- |
| Armor Class | 2 |
| Hit Dice | 6** |
| Move | 150' (50') |
| Flying | 300' (100') |
| Attacks | 1 touch + special |
| Damage | 1-8 + 2 level drain |
| No. Appearing | 1-4 (1-8) |
| Save As | Fighter: 6 |
| Morale | 11 |
| Treasure Type | E |
| Alignment | Chaotic |
""".strip(),
    "Squid, Giant": """
| Stat | Value |
| --- | --- |
| Armor Class | 7 |
| Hit Dice | 6 |
| Move | 120' (40') |
| Attacks | 8 tentacles / 1 bite |
| Damage | 1-4 tentacles / 1-10 beak |
| No. Appearing | 0 (1-4) |
| Save As | Fighter: 3 |
| Morale | 7 (9) |
| Treasure Type | V |
| Alignment | Neutral |
""".strip(),
    "Stegosaurus": """
| Stat | Value |
| --- | --- |
| Armor Class | 3 |
| Hit Dice | 11 |
| Move | 60' (20') |
| Attacks | tail or trample |
| Damage | 2-16 or 2-16 |
| No. Appearing | 0 (1-4) |
| Save As | Fighter: 6 |
| Morale | 7 |
| Treasure Type | Nil |
| Alignment | Neutral |
""".strip(),
    "Men": """
| Stat | Brigand | Buccaneer / Pirate | Dervish | Merchant | Nomad |
| --- | --- | --- | --- | --- | --- |
| Armor Class | Variable | Variable | Variable | 5 | Variable |
| Hit Dice | 1 | 1 | 1 | 1 | 1 |
| Move | 120' (40') | 120' (40') | 120' (40') | 90' (30') | 120' (40') |
| Attacks | 1 weapon | 1 weapon | 1 weapon | 1 weapon | 1 weapon |
| Damage | 1-6 or by weapon | 1-6 or by weapon | 1-6 or by weapon | 1-6 or by weapon | 1-6 or by weapon |
| No. Appearing | 0 (10-40) | 0 (special) | 0 (20-70) | 0 (1-20) | 0 (10-40) |
| Save As | Fighter: 1 | Fighter: 1 | Fighter: 1 | Fighter: 1 | Fighter: 1 |
| Morale | 8 | 6 (7) | 10 | Variable | 8 |
| Treasure Type | A | A | A | A | A |
| Alignment | Chaotic | Neutral (pirates chaotic) | Lawful | Neutral | Neutral |
""".strip(),
    "Mummy": """
| Stat | Value |
| --- | --- |
| Armor Class | 3 |
| Hit Dice | 5 + 1* |
| Move | 60' (20') |
| Attacks | 1 touch + disease |
| Damage | 1-12 + disease |
| No. Appearing | 1-4 (1-12) |
| Save As | Fighter: 5 |
| Morale | 12 |
| Treasure Type | D |
| Alignment | Chaotic |
""".strip(),
    "Mule": """
| Stat | Value |
| --- | --- |
| Armor Class | 7 |
| Hit Dice | 2 |
| Move | 120' (40') |
| Attacks | 1 kick or 1 bite |
| Damage | 1-4 or 1-3 |
| No. Appearing | 1-8 (2-12) |
| Save As | Normal Man |
| Morale | 8 |
| Treasure Type | Nil |
| Alignment | Neutral |
""".strip(),
    "NPC Parties": """
| Stat | Adventurers | Cleric | Fighter | Magic-User |
| --- | --- | --- | --- | --- |
| Armor Class | varies | varies | varies | varies |
| Hit Dice | varies | varies | varies | varies |
| Move | varies | varies | varies | varies |
| Attacks | varies | varies | varies | varies |
| Damage | varies | varies | varies | varies |
| No. Appearing | 4-9 (4-9) | 1 + 2-7 (1 + 2-7) | 1 + 2-8 (1 + 2-8) | 1 + 2-8 (1 + 2-8) |
| Save As | varies | varies | varies | varies |
| Morale | varies | varies | varies | varies |
| Treasure Type | varies | U + V | U + V | U + V |
| Alignment | varies | varies | varies | varies |
""".strip(),
    "Pixie": """
| Stat | Value |
| --- | --- |
| Armor Class | 3 |
| Hit Dice | 1* |
| Move | 90' (30') |
| Flying | 180' (60') |
| Attacks | 1 dagger |
| Damage | 1-4 |
| No. Appearing | 2-8 (10-40) |
| Save As | Elf: 1 |
| Morale | 7 |
| Treasure Type | R + S |
| Alignment | Neutral |
""".strip(),
    "Rat": """
| Stat | Normal | Giant |
| --- | --- | --- |
| Armor Class | 9 | 7 |
| Hit Dice | 1 hit point | 1-4 hit points |
| Move | 60' (20') | 120' (40') |
| Swimming | 30' (10') | 60' (20') |
| Attacks | 1 bite per pack | 1 bite each |
| Damage | 1-6 + disease | 1-3 + disease |
| No. Appearing | 5-50 (2-20) | 3-18 (3-30) |
| Save As | Normal Man | Fighter: 1 |
| Morale | 5 | 8 |
| Treasure Type | L | C |
| Alignment | Neutral | Neutral |
""".strip(),
    "Snake": """
| Stat | Spitting Cobra | Pit Viper | Sea Snake | Giant Rattler | Rock Python |
| --- | --- | --- | --- | --- | --- |
| Armor Class | 7 | 6 | 6 | 5 | 6 |
| Hit Dice | 1* | 2* | 3* | 4* | 5* |
| Move | 90' (30') | 90' (30') | 90' (30') | 120' (40') | 90' (30') |
| Attacks | 1 bite or 1 spit | 1 bite | 1 bite | 2 bites | 1 bite / 1 squeeze |
| Damage | 1-3 + poison | 1-4 + poison | 1 + poison | 1-4 + poison | 1-4 / 2-8 |
| No. Appearing | 1-6 (1-6) | 1-8 (1-8) | 1-8 (1-8) | 1-4 (1-4) | 1-3 (1-3) |
| Save As | Fighter: 1 | Fighter: 1 | Fighter: 2 | Fighter: 2 | Fighter: 3 |
| Morale | 7 | 7 | 7 | 8 | 8 |
| Treasure Type | Nil | Nil | Nil | U | U |
| Alignment | Neutral | Neutral | Neutral | Neutral | Neutral |
""".strip(),
    "Spider, Giant": """
| Stat | Crab Spider | Black Widow | Tarantella |
| --- | --- | --- | --- |
| Armor Class | 7 | 6 | 5 |
| Hit Dice | 2* | 3* | 4* |
| Move | 120' (40') | 60' (20') | 120' (40') |
| In Web | No webs | 120' (40') | No webs |
| Attacks | 1 bite | 1 bite | 1 bite |
| Damage | 1-8 + poison | 2-12 + poison | 1-8 + poison |
| No. Appearing | 1-4 (1-4) | 1-3 (1-3) | 1-3 (1-3) |
| Save As | Fighter: 1 | Fighter: 2 | Fighter: 2 |
| Morale | 7 | 8 | 8 |
| Treasure Type | U | U | U |
| Alignment | Neutral | Neutral | Neutral |
""".strip(),
    "Stirge": """
| Stat | Value |
| --- | --- |
| Armor Class | 7 |
| Hit Dice | 1* |
| Move | 30' (10') |
| Flying | 180' (60') |
| Attacks | 1 |
| Damage | 1-3 |
| No. Appearing | 1-10 (3-36) |
| Save As | Fighter: 2 |
| Morale | 9 |
| Treasure Type | L |
| Alignment | Neutral |
""".strip(),
    "Thoul": """
| Stat | Value |
| --- | --- |
| Armor Class | 6 |
| Hit Dice | 3** |
| Move | 120' (40') |
| Attacks | 2 claws or 1 weapon |
| Damage | 1-3 / 1-3 or weapon |
| No. Appearing | 1-6 (1-10) |
| Save As | Fighter: 3 |
| Morale | 10 |
| Treasure Type | C |
| Alignment | Chaotic |
""".strip(),
    "Trader": """
| Stat | Value |
| --- | --- |
| Armor Class | 6 |
| Hit Dice | 1 |
| Move | 120' (40') |
| Attacks | 1 weapon |
| Damage | 1-6 or weapon |
| No. Appearing | 1-8 (3-18) |
| Save As | Fighter: 1 |
| Morale | 7 |
| Treasure Type | U + V |
| Alignment | Any |
""".strip(),
    "Troglodyte": """
| Stat | Value |
| --- | --- |
| Armor Class | 5 |
| Hit Dice | 2* |
| Move | 120' (40') |
| Attacks | 2 claws / 1 bite |
| Damage | 1-4 each |
| No. Appearing | 1-8 (5-40) |
| Save As | Fighter: 2 |
| Morale | 9 |
| Treasure Type | A |
| Alignment | Chaotic |
""".strip(),
    "Veteran": """
| Stat | Value |
| --- | --- |
| Armor Class | 2 |
| Hit Dice | 1-3 |
| Move | 60' (20') |
| Attacks | 1 weapon |
| Damage | 1-8 or weapon |
| No. Appearing | 2-8 (2-12) |
| Save As | Fighter: 1-3 |
| Morale | 9 (varies) |
| Treasure Type | V |
| Alignment | Any |
""".strip(),
    "Wight": """
| Stat | Value |
| --- | --- |
| Armor Class | 5 |
| Hit Dice | 3* |
| Move | 90' (30') |
| Attacks | 1 |
| Damage | Energy drain |
| No. Appearing | 1-6 (1-8) |
| Save As | Fighter: 3 |
| Morale | 12 |
| Treasure Type | B |
| Alignment | Chaotic |
""".strip(),
    "Yellow Mold": """
| Stat | Value |
| --- | --- |
| Armor Class | Can always be hit |
| Hit Dice | 2 |
| Move | 0 |
| Attacks | Spores |
| Damage | 1-6 + special |
| No. Appearing | 1-8 (1-4) |
| Save As | Fighter: 2 |
| Morale | Not applicable |
| Treasure Type | Nil |
| Alignment | Neutral |
""".strip(),
    "Zombie": """
| Stat | Value |
| --- | --- |
| Armor Class | 8 |
| Hit Dice | 2 |
| Move | 120' (40') |
| Attacks | 1 weapon |
| Damage | 1-8 or weapon |
| No. Appearing | 2-8 (4-24) |
| Save As | Fighter: 1 |
| Morale | 12 |
| Treasure Type | Nil |
| Alignment | Chaotic |
""".strip(),
    "Termite, Water": """
| Stat | Swamp Termite | Fresh Water Termite | Salt Water Termite |
| --- | --- | --- | --- |
| Armor Class | 4 | 6 | 5 |
| Hit Dice | 1 + 1 | 2 + 1 | 4 |
| Move | 90' (30') | 120' (40') | 180' (60') |
| Attacks | See below | See below | See below |
| Damage | 1-3 | 1-4 | 1-6 |
| No. Appearing | 0 (1-4) | 0 (1-3) | 0 (2-7) |
| Save As | Fighter: 1 | Fighter: 2 | Fighter: 3 |
| Morale | 10 | 8 | 11 |
| Treasure Type | Nil | Nil | Nil |
| Alignment | Neutral | Neutral | Neutral |
""".strip(),
    "Titanothere": """
| Stat | Value |
| --- | --- |
| Armor Class | 5 |
| Hit Dice | 12 |
| Move | 120' (40') |
| Attacks | butt or trample |
| Damage | 2-12 / 3-24 |
| No. Appearing | 0 (1-6) |
| Save As | Fighter: 6 |
| Morale | 7 |
| Treasure Type | Nil |
| Alignment | Neutral |
""".strip(),
    "Toad, Giant": """
| Stat | Value |
| --- | --- |
| Armor Class | 7 |
| Hit Dice | 2 + 2 |
| Move | 90' (30') |
| Attacks | 1 bite |
| Damage | 2-5 |
| No. Appearing | 1-4 (1-4) |
| Save As | Fighter: 1 |
| Morale | 6 |
| Treasure Type | Nil |
| Alignment | Neutral |
""".strip(),
    "Treant": """
| Stat | Value |
| --- | --- |
| Armor Class | 2 |
| Hit Dice | 8 |
| Move | 60' (20') |
| Attacks | 2 blows |
| Damage | 2-12 / 2-12 |
| No. Appearing | 0 (1-8) |
| Save As | Fighter: 8 |
| Morale | 9 |
| Treasure Type | C |
| Alignment | Lawful |
""".strip(),
    "Triceratops": """
| Stat | Value |
| --- | --- |
| Armor Class | 2 |
| Hit Dice | 11 |
| Move | 90' (30') |
| Attacks | gore or trample |
| Damage | 3-18 each |
| No. Appearing | 0 (1-4) |
| Save As | Fighter: 6 |
| Morale | 8 |
| Treasure Type | Nil |
| Alignment | Neutral |
""".strip(),
    "Troll": """
| Stat | Value |
| --- | --- |
| Armor Class | 4 |
| Hit Dice | 6 + 3* |
| Move | 120' (40') |
| Attacks | 2 claws / 1 bite |
| Damage | 1-6 / 1-6 / 1-10 |
| No. Appearing | 1-8 (1-8) |
| Save As | Fighter: 6 |
| Morale | 10 (8) |
| Treasure Type | D |
| Alignment | Chaotic |
""".strip(),
    "Tyrannosaurus Rex": """
| Stat | Value |
| --- | --- |
| Armor Class | 3 |
| Hit Dice | 20 |
| Move | 120' (40') |
| Attacks | 1 bite |
| Damage | 6-36 |
| No. Appearing | 0 (1) |
| Save As | Fighter: 10 |
| Morale | 11 |
| Treasure Type | V x 3 |
| Alignment | Neutral |
""".strip(),
    "Unicorn": """
| Stat | Value |
| --- | --- |
| Armor Class | 2 |
| Hit Dice | 4* |
| Move | 240' (80') |
| Attacks | 2 hooves / 1 horn |
| Damage | 1-8 each |
| No. Appearing | 1-6 (1-8) |
| Save As | Fighter: 8 |
| Morale | 7 |
| Treasure Type | Nil |
| Alignment | Lawful |
""".strip(),
    "Vampire": """
| Stat | Value |
| --- | --- |
| Armor Class | 2 |
| Hit Dice | 7-9** |
| Move | 120' (40') |
| Flying | 180' (60') |
| Attacks | 1 touch + special |
| Damage | 1-10 + energy drain |
| No. Appearing | 1-4 (1-6) |
| Save As | Fighter: 7-9 |
| Morale | 11 |
| Treasure Type | F |
| Alignment | Chaotic |
""".strip(),
    "Weasel, Giant": """
| Stat | Value |
| --- | --- |
| Armor Class | 7 |
| Hit Dice | 4 + 4 |
| Move | 150' (50') |
| Attacks | 1 bite + special |
| Damage | 2-8 |
| No. Appearing | 1-4 (1-6) |
| Save As | Fighter: 3 |
| Morale | 8 |
| Treasure Type | V |
| Alignment | Neutral |
""".strip(),
    "Whale": """
| Stat | Killer Whale | Narwhal | Sperm Whale |
| --- | --- | --- | --- |
| Armor Class | 6 | 7 | 6 |
| Hit Dice | 6 | 12 | 36 |
| Move | 240' | 180' | 180' |
| Attacks | 1 bite | 1 horn / 1 bite | 1 bite |
| Damage | 1-20 | 2-12 / 1-8 | 3-60 |
| No. Appearing | 0 (1-6) | 0 (1-4) | 0 (1-3) |
| Save As | Fighter: 3 | Fighter: 12 | Fighter: 15 |
| Morale | 10 | 8 | 7 |
| Treasure Type | V | See below | V |
| Alignment | Neutral | Lawful | Neutral |
""".strip(),
    "Wraith": """
| Stat | Value |
| --- | --- |
| Armor Class | 3 |
| Hit Dice | 4** |
| Move | 120' (40') |
| Flying | 240' (80') |
| Attacks | 1 touch + special |
| Damage | 1-6 + energy drain |
| No. Appearing | 1-4 (1-6) |
| Save As | Fighter: 4 |
| Morale | 12 |
| Treasure Type | E |
| Alignment | Chaotic |
""".strip(),
    "Wyvern": """
| Stat | Value |
| --- | --- |
| Armor Class | 3 |
| Hit Dice | 7* |
| Move | 90' (30') |
| Flying | 240' (80') |
| Attacks | 1 bite / 1 sting |
| Damage | 2-16 / 1-6 + poison |
| No. Appearing | 1-2 (1-6) |
| Save As | Fighter: 4 |
| Morale | 9 |
| Treasure Type | E |
| Alignment | Chaotic |
""".strip(),
    "Wolf": """
| Stat | Normal Wolf | Dire Wolf |
| --- | --- | --- |
| Armor Class | 7 | 6 |
| Hit Dice | 2 + 2 | 4 + 1 |
| Move | 180' (60') | 150' (50') |
| Attacks | 1 bite | 1 bite |
| Damage | 1-6 | 2-8 |
| No. Appearing | 2-12 (3-18) | 1-4 (2-8) |
| Save As | Fighter: 1 | Fighter: 2 |
| Morale | 8 (6) | 8 |
| Treasure Type | Nil | Nil |
| Alignment | Neutral | Neutral |
""".strip(),
}

BODY_OVERRIDE = {
    "Cave Locust": "Cave locusts are 2-3' long, stone-gray giant grasshoppers that live underground. Because of their color they may be mistaken for statues until closely approached. They are herbivorous, eat fungus such as yellow mold and shriekers, and are not harmed by yellow mold or most poisons.\n\nThey are very nervous and usually flee rather than fight, often leaping up to 60' away. Unfortunately their sense of direction is poor, and they may accidentally jump into a party; if they jump toward a group, determine a random target and make a normal attack roll, with 1-4 points of battering damage on a hit.\n\nWhen frightened or attacked, cave locusts make a loud shrieking noise to warn their fellows. This cry has a 20% chance each round of attracting wandering monsters. If cornered, a cave locust may spit a brown gooey substance up to 10'. Treat the spit as an attack against Armor Class 9; a victim hit must save vs. Poison or be unable to act for 1 turn because of the awful smell.",
    "Dragon": "Dragons are a very old race of huge winged lizards. They like to live in isolated, out-of-the-way places where few humans are found. Though the color of their scaly hide makes dragons look different, they all have several traits in common: they are hatched from eggs, are meat-eaters, have Breath Weapons, love treasure, and will do everything possible to save their own lives, including surrender.\n\nDragons are proud of their long history, and because of this they tend to think less of the younger races. Chaotic dragons might capture humans, but will usually kill and eat them immediately. Neutral dragons might either attack or ignore a party completely. Lawful dragons, however, may actually help a party if the characters are truly worthy of the honor. When playing a dragon, the DM should remember that even the hungriest dragon will pause and listen to flattery, provided no one is attacking it and it understands the speaker.\n\nBREATH WEAPONS DAMAGE: All dragons have a special attack with their Breath Weapon in addition to their claw and bite attacks. Any dragon can use its Breath Weapon up to 3 times each day. A dragon's first attack is always with its Breath Weapon. The number of points of damage any Breath Weapon does is equal to the dragon's remaining number of hit points. Any damage done to a dragon will reduce the damage it can do with its Breath Weapon.\n\nAfter the first Breath attack, a dragon may choose to attack with claws and bite. To determine this randomly, roll 1d6. A result of 1-3 means that the dragon will use its claw and bite attacks; a result of 4-6 means that the dragon will breathe again.\n\nSHAPE OF BREATH: A dragon's Breath Weapon appears as one of three different shapes: cone-shaped, a straight line, or a cloud of gas.\n\nA cone-shaped Breath begins at the dragon's mouth, where it is 2' wide, and spreads out until it is 30' wide at its furthest end. For example, the area of effect of a white dragon's Breath is a cone 80' long and 30' wide at its far end.\n\nA line-shaped Breath starts in the dragon's mouth and stretches out toward its victim in a straight line, even downwards. Even at its source, a line-shaped Breath is 5' wide.\n\nA cloud-shaped Breath billows forth from the dragon's mouth to form a 50'x40'x20' tall cloud around the dragon's targets directly in front of it.\n\n![Basic diagram: dragon breath shapes](assets/dragon-breath-diagram.png)\n\nSAVING THROWS: Anyone caught within the area of effect of a dragon's Breath Weapon may make a saving throw. A successful saving throw means that the victim takes only 1/2 damage from the Breath. Dragons are never affected by the normal or smaller versions of their own Breath Weapons, and automatically make their saving throws against any attack form that is the same as their Breath Weapon. For example, a red dragon will take no damage from burning oil, and will always take only 1/2 damage from a fire-type magic spell such as a fire ball.\n\nTALKING: Dragons are intelligent, and some dragons can speak Dragon and Common. The percentage listed under Chance of Talking is the chance that a dragon will be able to talk. Talking dragons are also able to use Magic-user/Elf spells. The number of spells and their levels are given above under Spells by Level. For example, 3 / 3 / - would mean that the dragon can cast 3 first-level spells and 3 second-level spells, but no third-level spells. Dragon spells are usually selected randomly.\n\nSLEEPING DRAGONS: The percentage chance given under Chance of Being Asleep applies whenever a party encounters a dragon on the ground; flying dragons are never asleep. Any result greater than the percentage means that the dragon is not asleep, though it may be pretending to be. If a dragon is asleep, it may be attacked with a bonus of +2 on attack rolls for one round, during which it will wake. Combat proceeds normally from the second round on.\n\nSUBDUING DRAGONS: Whenever characters encounter a dragon, they may choose to try to subdue it rather than kill it. To subdue a dragon, all the attacks must be with the flat of the sword; missile weapons and spells may not be used. Attacks and damage are determined normally when trying to subdue the dragon. The dragon will fight normally until it reaches 0 or fewer hit points, at which time it will surrender. A dragon may be subdued because it realizes that its attackers could have killed it if they had been striking to kill.\n\nA subdued dragon will attempt to escape or turn on its captor if given a reasonable chance to do so through the party's actions. For example, a dragon left unguarded at night, or ordered to guard a position alone, would consider these reasonable chances. A subdued dragon must be sold. The price is up to the DM, but should never exceed 1,000 gp per hit point. The dragon may be forced to serve the characters who subdued it. If a subdued dragon is ever ordered to perform a task that is apparently suicidal, it will attempt to escape and/or kill its captors.\n\nAGE: The statistics given are for an average-sized dragon of its type. Younger dragons are smaller and have acquired less treasure; older dragons are larger and have acquired more. Dragons generally range in size from 3 hit dice smaller to 3 hit dice larger than average. For example, red dragons could be found having 7 to 13 hit dice, depending on their age.\n\nTREASURE: Younger dragons may have collected as little as 1/2 the normal listed treasure; older dragons may have as much as double the listed amount. Dragon treasure is only found in the dragon's lair. These lairs are rarely left unguarded, and are well-hidden to prevent easy discovery.\n\nGOLD DRAGONS: Gold dragons always talk and use spells. They can also change their shape, and often appear in the form of a human or animal. Gold dragons may breathe either fire, like a red dragon, or chlorine gas, like a green dragon, though they still have a total of 3 Breath Weapon attacks per day, not 6. The type of Breath attack should be chosen by the DM to fit the situation.\n\nDragons are extremely powerful and should be used with caution when encountered by low-level player characters. It is recommended that until characters reach the fourth level and higher, only the youngest and smallest dragons be used by the DM.",
    "Efreeti (Lesser)": "Efreet are free-willed fire elementals. They usually appear as clouds of smoke that solidify into giant demonic-faced men surrounded by flame. The air around them is always hot and smoky, they are highly magical in nature, and they can only be hit with magic weapons.\n\nEfreet can create objects, create illusions, and turn invisible like djinn. They may also create a wall of fire up to 3 times per day. An efreeti can transform itself into a pillar of flame for up to 3 rounds, setting flammable items within 5' alight and doing an extra 1-8 points of damage to creatures it strikes while in that form.\n\nEfreet may fly and carry up to 10,000 en weight while flying. They can be summoned by high-level magic-users who know the special spells required, but once summoned they must be carefully controlled.",
    "Gorgon": "A gorgon is a magical bull-like monster covered with large iron scales. It gores opponents with its great horns and will do double damage if it hits when charging. A gorgon also breathes clouds of vapor that will petrify any opponents who fail their saving throw vs. Turn to Stone.\n\nA gorgon's vapor cloud is 60' long by 10' wide. They are impervious to their own breath weapon. Gorgons are usually found in foothills or grasslands.",
    "Green Slime": "Green slime looks like green, oozing slime. This creature can be harmed by fire or cold but cannot be hurt by any other attacks. It dissolves wood and metal in 6 rounds, but cannot dissolve stone.\n\nGreen slime often clings to walls and ceilings and will drop down on surprised characters. Once in contact with flesh, it will stick and turn the flesh into green slime. It cannot be scraped off, but must be burnt off, or treated with a cure disease spell.\n\nWhen green slime drops on a victim, or is stepped on, the victim can usually burn it while it is dissolving armor and clothing. If it is not burned off, the victim will turn completely into green slime 1-4 rounds after the first 6-round, one-minute period. Burning does 1/2 damage to the green slime and 1/2 damage to the victim.",
    "Lizards, Giant": "Gecko: A gecko is a 5' long lizard colored pale blue with orange-brown spots. Geckos are carnivorous and nocturnal, sleeping during the day and active at night or in darkness. Geckos hunt by climbing steep walls or trees with their specially adapted feet, then dropping on their prey to attack.\n\nDraco: A draco is a 6' long lizard with wide flaps of skin between its legs which it can spread to glide through the air like a flying squirrel. Dracos are generally found above ground, though they sometimes creep into caves to escape very cold or very hot weather. Dracos are carnivorous and have been known to attack humans.\n\nHorned Chameleon: A horned chameleon is a 7' long lizard which can change color to blend into its surroundings. It surprises on a roll of 1-5 on 1d6. A horned chameleon can shoot out its sticky tongue up to 5' long. A successful hit means that the victim is pulled to the horned chameleon's mouth and automatically bitten for 2d4 points of damage. The horned chameleon can also attack with its horn for 1d6, and may use its tail to knock other attackers down on a successful hit, doing no damage but preventing the victim from attacking that round.\n\nTuatara: A tuatara is a 8' long lizard that looks like a cross between an iguana and a toad. It has pebble-colored olive skin with white spikes along its back. It is carnivorous and sometimes attacks humans. A tuatara has a membrane over its eyes which, when lowered, is sensitive to changes in temperature, allowing it to see in darkness with 90' infravision.",
    "Medium": "Mediums are NPC 1st level magic-users. There is a 50% chance that mediums will be accompanied by their master, a 3rd level magic-user. Mediums will each have one 1st level spell which the DM may choose or determine randomly.\n\nThe 3rd level magic-user will have two 1st level spells and one 2nd level spell, chosen in a similar manner.",
    "Neanderthal (Caveman)": "Neanderthals, also known as cavemen, are a demi-human species related to humans. They have squat bodies with large bones and powerful muscles. Their faces have apelike features, including large brows above the eyes. Neanderthals live in family groups in caves and caverns.\n\nNeanderthals usually attack with thrown spears and use stone axes, clubs, or stone hammers in hand-to-hand combat. They choose their leaders from a similar race that is much larger than the average Neanderthal. These leaders have 6 hit dice and are 10' tall. There will be 10-40 Neanderthals in the lair with 2 leaders, one male and one female. Neanderthals often hunt cave bears and keep white apes as pets. They are friendly toward dwarves and gnomes, but hate goblins and kobolds. They will attack ogres on sight. They are shy and will avoid humans, but are not usually hostile unless they are attacked.",
    "Noble": "\"Noble\" is a general term for the lord of a castle and any of his or her relatives. In the D&D BASIC rules, a noble will always be a 3rd level fighter. However, the DM may choose to make a noble any class and level. The DM may make up the noble's title or use traditional ones; a few sample titles are Baron or Baroness, Count or Countess, Duke or Duchess, Emir, Khan, Knight, Margrave, and Sheikh.\n\nA little research will uncover many more traditional titles. A noble will always be accompanied by a squire, a 2nd level fighter. A noble might also be accompanied by as many as 10 retainers or hirelings, usually 1st level fighters. For details on encounters with nobles in their castles, see the D&D EXPERT rules.",
    "Lycanthropes": "Lycanthropes are humans who can change into beasts, or in the case of wererats, beasts who can change into humans. They do not wear armor, since it would interfere with their shapechanging. Any lycanthrope can summon 1 or 2 of the animals of their were-type, such as giant rats, wolves, boars, great cats, or bears, which will arrive in 1-4 rounds. If a lycanthrope is hit by wolfsbane, it must save vs. Poison or run away in fear. The sprig of wolfsbane must be swung or thrown as a weapon using normal combat procedures. All lycanthropes will turn back into human form when killed. Some animals, such as horses, do not like the smell of lycanthropes and will react with fear.\n\nANIMAL FORM: In animal form, a lycanthrope may only be harmed by magic weapons, silvered weapons, or magic spells. The lycanthrope cannot speak normal languages, though it can speak with normal animals of its were-type.\n\nHUMAN FORM: In human form, a lycanthrope often looks somewhat like its were-form. In this form, it may be attacked normally, and may speak any known languages.\n\nLYCANTHROPY: Lycanthropy is a disease. Any human character who is severely hurt by were-creatures, losing more than half of his or her hit points in battle with them, will become a lycanthrope of the same type in 2-24 days. The victim will begin to show signs of the disease after only half that time. The disease will kill non-humans instead of turning them into were-creatures. It may only be cured by a high-level cleric of 11th level or greater. Any character who becomes a full were-creature becomes an NPC, to be run by the DM only.\n\nWererats: Wererats are different from most lycanthropes. They are intelligent, can speak Common in either form, and may use any weapon. A wererat usually prefers to use a man-sized rat form, but may become a full-sized human. Wererats are sneaky and often set ambushes, surprising on a roll of 1-4 on 1d6. They summon giant rats to help them in battle. Only a wererat's bite causes lycanthropy.\n\nWerewolves: These creatures are semi-intelligent and usually hunt in packs. Any group of 5 or more will have a leader with 30 hit points, attacks as a 5 hit dice monster, and gains +2 on damage rolls. Werewolves summon normal wolves to form large packs with them.\n\nWereboars: Wereboars are semi-intelligent and have bad tempers. In human form they often seem to be berserkers, and may act the same way in battle, gaining +2 on attack rolls and fighting to the death. Wereboars summon normal boars to help them in battle.\n\nWeretigers: These relatives of the Great Cats often act like them, being very curious but becoming dangerous when threatened. They are good swimmers and quiet trackers, surprising on a roll of 1-4 on 1d6. They may summon any type of Great Cat in the area, preferring tigers.\n\nWerebears: Werebears are very intelligent, even in animal form. A werebear usually prefers to live alone or with bears. It might be friendly if peacefully approached. In combat, werebears may hug for 2-16 points of damage, in addition to normal damage, if both paws hit the same target in one combat round. A werebear may summon any type of bear in the area.\n\nArmor Class in parentheses applies when in human form.",
    "Giant": "Hill giants are hairy, stupid brutes about 12' tall who wear skins and raid nearby human settlements for food and plunder. Stone giants are 14' tall with gray rock-like skin and hurl boulders up to 300'. Frost giants are pale, cold-dwelling raiders with bear or wolf guards and immunity to cold-based attacks.\n\nFire giants have red skin, dark hair, and homes near volcanic regions; they are immune to fire-based attacks and often keep hydras or hellhounds as guards. Cloud giants are tall, sharp-sensed mountain or cloud dwellers who often keep giant hawks or dire wolves. Storm giants are the tallest of all giants, love thunder storms, and in a storm may hurl lightning that does damage equal to their current hit points, with a save vs. Spells for half.",
    "Hawk": "Hawks are hunting birds that glide on the updrafts of the wind, watching the ground for prey. If a hawk surprises its victim, it does double damage on its first attack.\n\nNormal hawks do not usually attack human-sized or larger creatures unless the target appears unable to defend itself. Giant hawks are as large as a very big dog or small pony, are much stronger, and will attack human-sized creatures if hungry. Both normal and giant hawks may be trained as pets or guards by an animal trainer.",
    "Hellhound": "A hellhound appears as a reddish-brown hound the size of a large wolfhound or small pony, and is impervious to normal fire. They are often found near volcanos, deep in dungeons, or with another fire-loving creature such as a fire giant. Hellhounds are cunning and highly intelligent. They save as a fighter level equal to their hit dice.\n\nIn melee, a hellhound will attack one person, biting, 3-6 on 1d6, or breathing fire, 1 or 2 on 1d6, each round. Its breath does 1d6 points of damage for each hit die the hellhound has, 3d6 to 7d6. A character who makes a saving throw vs. Dragon Breath takes only half damage.\n\nHellhounds have a 75% chance per round of detecting an invisible person or object within 60'. They save as a fighter of equal hit dice.",
    "Hippogriff": "A hippogriff is a fantastic creature with the foreparts and head of a giant eagle and the hindquarters of a horse. Hippogriffs can be ridden if tamed. They usually attack pegasi, their natural enemies, and nest in rocky crags.",
    "Horse": "Riding horses are smaller than draft or war horses but can carry a rider farther. A riding horse is noted for its ability to exist anywhere there is grass to feed on. Any wild horse can become a riding horse if tamed. The amount of weight the horse can carry and still move at normal speed is 3000 cn. The maximum weight that can be carried is 6000 cn at half movement.\n\nWar horses are bred for warlike temperament and strength. They cannot be ridden long distances at high speed, but are powerful in a short charge. A war horse can carry 4000 cn at full speed and 8000 cn at half speed. When charging, a rider employing a lance will do double damage if a hit is successful, although the horse may not fight at the same time. After the first charging round, both rider and horse can fight normally.\n\nDraft horses are large horses bred for sturdiness and endurance. They are used primarily for plowing, pulling wagons, and as pack animals. A draft horse can carry a normal load of 4500 cn and a maximum load, movement reduced by 1/2, of 9000 cn. A draft horse will not fight; if attacked, it will attempt to flee.",
    "Hydra": "A hydra is a large creature with a dragon-like body and 5 to 12, 1d8 + 4, serpentine heads. It has one hit die for each head, and always has 8 hit points per hit die. A hydra will attack with all of its heads each round. For every 8 points of damage a hydra takes, one head will no longer attack. Example: if a 7-headed hydra took 18 points of damage, it would only attack with 5 heads in the next round. A hydra saves as a fighter of a level equal to its number of heads.\n\nSea hydras have adapted to water. They possess fins instead of legs. They are otherwise the same as their land-dwelling cousins.\n\nThe DM may wish to create special versions of hydra. Special hydras could have poisonous bites or breathe fire, as a dragon, but with a 5' range and only causing 8 points of damage per head. Such creatures should be placed by the DM to guard special treasures.",
    "Invisible Stalker": "An invisible stalker is a very intelligent enchanted monster summoned to this world by use of the invisible stalker magic-user's spell. If the stalker is given a simple task that is clear and can be swiftly completed, it will obey promptly. If the task is complex or lengthy, the invisible stalker will try to distort the intent while obeying the literal command. Example: if ordered to guard a treasure for longer than a week, the stalker may take it away to its native plane of existence and guard it there forever.\n\nInvisible stalkers are most often used to track and slay enemies. They are faultless trackers. They surprise any creature that cannot detect invisible creatures on a 1d6 roll of 1-5. They will return to their native plane once they are slain, dispelled, or have completed their task.",
    "Leech, Giant": "Giant leeches are loathsome and slug-like. They live in swamps and are about 3 to 4 feet long. A giant leech has a sucker-like mouth that attaches to the victim if a hit is successful. It then sucks blood, doing 1-6 points of damage per round. A giant leech must be killed to be removed from its victim. When the victim dies, the leech will drop off and hide while it digests its meal.",
    "Manticore": "A manticore is a horrid monster having a man's face, the body of a lion, leathery bat wings, and a tail ridged with spikes. The manticore has 24 spikes and can shoot 6 each round even when flying. The tail spikes have a 180' range and each do 1-6 points of damage. The creature will regrow 2 spikes per day.\n\nThe manticore's favorite food is man. They usually live in wild mountain ranges. They will frequently track parties with humans, ambushing with spike attacks when the party stops to rest.",
    "Mastodon": "Mastodons look like hairy elephants with long tusks. In combat, a mastodon will charge, striking only with its tusks for double damage. In succeeding rounds, it will either strike with its tusks, 25%, or trample, 75%, if the opponent is man-sized or smaller. The mastodon gains a bonus of +4 on \"to hit\" rolls when trampling any creature man-sized or smaller.\n\nIvory mastodon tusks are quite valuable, each tusk being worth 200-800 gp. They live in cold, icy tundras or \"lost worlds.\"",
    "Mermen": "Mermen have the upper bodies of men and the lower bodies of large fish. They are armed with spears, tridents (treat as spears), or daggers. They live in coastal waters and hunt fish and harvest kelp.\n\nAll mermen except leaders have 1 hit die and save as 1st level fighters. The number appearing represents a small hunting party, although mermen will often form underwater villages of 100 to 300 creatures. For every 10 mermen encountered there will be a leader with 2 hit dice. For every 50 there will be one leader with 4 hit dice. Mermen leaders save as fighters with the same amount of hit dice.\n\nMermen often keep trained marine animals and monsters to help guard their homes.",
    "Men": "Most groups of men will be led by additional higher-level leaders with better armor, hit points, saving throws, and possibly magic items. Men also usually have large camps, and the treasure will usually be at the camp.\n\nBrigands are loosely organized outlaws and renegade mercenaries who live by raiding towns and robbing caravans and travelers. For every 20 brigands there will be an additional 2nd level fighter who acts as their leader. For every 40 brigands there will be an additional 4th level fighter acting as commander of the entire group.\n\nHalf the brigands will have leather armor, shield, short bow, and sword. The rest will be mounted on riding horses, wear chain mail and shield, and carry swords. The leaders will wear plate mail, carry swords and lances, and ride barded war horses. Brigands will often band together to make fortified camps of 50-300 men. A camp will always be led by a 9th level fighter, with an additional 5th level fighter for every 50 brigands. There is also a 50% chance that a magic-user of 9th to 11th level will be in the brigand camp, and a 30% chance for a cleric of 8th level.\n\nBuccaneers are found on seas, rivers, great lakes, and occasionally oceans. They live by raiding coastal towns and capturing ships to sell the booty elsewhere. Pirates are seagoing men who plunder other vessels, raid coastal towns, and engage in illegal slave trades. They are noted for evil acts and cruelty toward prisoners, and will also freely attack each other if there is a chance for profit. The number of buccaneers or pirates that appear depends on the type and number of ships they are sailing.\n\nBuccaneers and pirates are organized as follows. Leather armor and sword: buccaneers 60%, pirates 50%. Leather armor, sword, and crossbow: buccaneers 30%, pirates 35%. Chain mail and sword: buccaneers 10%, pirates 15%; buccaneers of this type also carry crossbows. For every 30 buccaneers there will be a 4th level fighter. For every ship, there will be a 7th level fighter as captain, and there will be a 9th level fighter as commander of the fleet. There is a 30% chance that a 10th or 11th level magic-user and a 25% chance that an 8th level cleric will be with the fleet.\n\nFor every 30 pirates, they will be led by a 4th level fighter. For every 50 pirates or ship, there will be a 5th level fighter. For every 100 pirates or fleet, there will be an 8th level fighter as leader. For every fleet of 300 or more pirates, there will be an 11th level fighter, the pirate lord, as commander of the fleet, and a 75% chance for a 9th or 10th level magic-user. Buccaneers and pirates may carry their treasure with them or have maps showing where it is buried. The treasure given is the total for the entire buccaneer pack or pirate fleet and may be divided as the DM desires. In addition, pirates have a 25% chance of having 1-3 prisoners with them, awaiting ransom. Often, well-defended coastal towns will serve as havens for pirates and buccaneers. These are lawless and dangerous places, full of many possible adventures.\n\nDervishes often form into camps or tribes of up to 300 men, led by a 10th level cleric. Such a camp will be of tents, 75%, or a wooden or brick stockade, 25%. These camps will contain women, children, livestock, and the treasure of the dervishes.\n\nDervishes are noted for their fanatic belief in their religion and their intolerance of other views. On rare occasions, they will wage a holy war, in which they will attempt to capture or kill all who have different beliefs. Captives will be given an opportunity to convert; if they refuse, they may be killed or enslaved. Lawful characters may be invited to join the crusade, and those who refuse will be viewed with great suspicion unless a good reason can be provided as to why they should not participate.\n\nMerchants are traders who travel in caravans from town to town, selling and buying various goods such as wines, silks, jewels, and precious metals. Those in the caravan usually ride horses, but they are likely to travel by camel in desert and barren lands and by mule in the mountains. All merchants wear chain mail and carry a sword and dagger.\n\nTypical caravan organization is 5 wagons with 10 merchants, 20 1st level fighters, 2 2nd or 3rd level fighters, 1 5th level fighter, and 1-12 extra animals. At 10 wagons, 20 merchants, 40 1st level fighters, 4 2nd or 3rd level fighters, 1 5th level fighter, and 1-12 extra animals. At 15 wagons, 30 merchants, 60 1st level fighters, 6 2nd or 3rd level fighters, 1 5th level fighter, and 1-12 extra animals. At 20 wagons, 40 merchants, 80 1st level fighters, 8 2nd or 3rd level fighters, 1 5th level fighter, and 1-12 extra animals. All fighters have Armor Class 4 and carry swords, daggers, and crossbows. The extra animals may be horses, mules, or even camels, at the DM's choice. If a caravan has fewer than 20 wagons, the treasure should be reduced accordingly.\n\nNomads are groups of wandering tribesmen who may be peaceful or warlike and may have any alignment. Small bands encountered hunting or foraging in the wilderness will usually be part of a larger tribe. All treasure will be at the main camp.",
    "Mummy": "Mummies are undead who lurk near deserted ruins and tombs. On seeing a mummy, each character must save vs. Paralysis or be paralyzed with fear until the mummy attacks someone or goes out of sight.\n\nIn melee, a hit by a mummy does 1-12 points of damage and infects the creature hit with a hideous rotting disease. This disease prevents magical healing and makes all wounds take 10 times as long to heal. The disease lasts until it is magically cured.\n\nMummies can only be damaged by spells, fire, or magic weapons, all of which will only do half damage. They are immune to sleep, charm, and hold spells.",
    "Pegasus": "These semi-intelligent flying horses are wild and shy. They cannot be tamed, but will serve Lawful characters only if captured when young and trained. Pegasi are the natural enemies of hippogriffs.",
    "Pterodactyl": "Pterodactyls are bat-like reptiles with wingspans of 8-10 feet. They hunt small and medium-sized animals, gliding slowly along air currents to spot their prey. If driven by great hunger they will attack human-sized creatures.\n\nPteranodons are giant pterodactyls. They are more aggressive and will often attack humans or humanoids. These monsters can have a wingspan of up to 50 feet.\n\nPteranodons and pterodactyls are only found in warm climates, usually in \"lost world\" areas.",
    "Rhinoceros": "Though unintelligent plant eaters, rhinoceri can be very dangerous.\n\nIf threatened, surprised, or charged, they will stampede in a random direction, goring all in their path for double damage on the first attack.\n\nWoolly rhinos are covered with long white hair. Woolly rhinos travel in small herds across tundra and plain, usually in \"lost world\" areas.",
    "Roc": "Rocs are huge birds of prey resembling eagles. They are very lawful, and are often unfriendly towards neutrals, -1 on reaction rolls, and chaotics, -2 on reactions. Rocs prefer solitude and will swoop to attack any intruders unless carefully approached.\n\nRoc nests are found in the highest mountains and 50% of the time will contain 1-6 eggs or young. Rocs never check morale if encountered in their lair. If hatched or captured as chicks, young rocs can be trained.",
    "Salamander": "A flame salamander is a form of free-willed fire elemental that looks like a giant snake, 12' to 16' long, with the head and limbs of a lizard. It has scales of bright orange-yellow and orange-red. All creatures within 20' will take 1-8 points of damage per round from the intense heat the salamander generates. Flame salamanders are immune to all fire-based attacks. These creatures are intelligent and prefer to live near, or in, volcanoes or in very hot, dry lands.\n\nA frost salamander looks like a giant lizard with 6 legs. Its scales are white or blue-white in color. When it fights, it rears up and strikes with the front four legs as well as fangs. All creatures within 20' will take an additional 1-8 points of damage each round from the extreme cold the monster radiates. Frost salamanders are immune to all cold-based attacks. They live in frozen wastelands, glaciers, and icy tundras.\n\nFrost and flame salamanders hate each other, and will attack one another on sight.",
    "Scorpion, Giant": "A giant scorpion is the size of a small horse and will usually attack on sight. It fights by grasping opponents with its claws and stinging the immobilized foe. If a claw hits, the stinger attacks at +2.\n\nAnyone struck by the stinger must save vs. Poison or die. Giant scorpions live in deserts, caves, and ruins.",
    "Sea Serpent (Lesser)": "A sea serpent resembles a long, 20' to 30', giant snake with many fins. A sea serpent may attack a sea craft its own size or smaller by looping around the boat and squeezing for 1-10 points of hull damage per round. Its normal attack is a bite, and it can lunge up to 20' out of the water when biting creatures on the surface.",
    "Shark": "Sharks are vicious predators. They have little intelligence and are unpredictable. They are attracted to the scent of blood within 300', and it will drive them into a feeding frenzy, no morale checks required. They attack by making long, curving passes. Sharks are found in salt water.\n\nBull sharks are 8' long and brown in color. Bull sharks will ram their prey first to stun it, and then attack the helpless prey the next round.\n\nMako sharks are 15' long and blue-gray or tan in color. Mako sharks are extremely unpredictable, ignoring swimmers one moment and then, for no apparent reason, attacking.\n\nGreat white sharks are 30' long or larger and gray with a white underside. They have been known to destroy small boats.",
    "Spectre": "The ghostly spectres are among the mightiest of the undead. They have no solid bodies and can only be hit by magic weapons; silver weapons have no effect. Like all undead, spectres are immune to sleep, charm, and hold spells.\n\nA hit by a spectre does 1-8 points of damage and drains 2 life energy levels. The result of this drain is that the creature touched loses 2 hit dice, levels of experience. Experience points will drop to the lowest amount needed for the new level, and all hit dice and abilities associated with the drained levels are lost.\n\nA character whose level is reduced to 0 is slain. A character slain by a spectre will rise the next night as a spectre under the control of the slayer.",
    "Squid, Giant": "A giant squid dwells only in the deep sea, rising to the surface only to hunt. A giant squid will sometimes, 25%, wrap its two long tentacles about a boat and squeeze, doing 1-10 points of damage to the boat's hull, while the beak does 2 points per round after the tentacles grapple. Giant squids often, 75%, attempt to snatch seamen from the decks of passing ships and pull them to their lair below to be devoured.\n\nThe lesser tentacles do constriction damage after they hit. They can be severed with a single blow that does 6 or more points, while the greater tentacles can be severed with a blow that causes 10 or more points of damage.\n\nIf its morale fails, the squid can flee at triple speed and will leave great clouds of ink, 30' radius, twice per day maximum, to confuse pursuers. A large giant squid can even be double or triple normal size.",
    "Stegosaurus": "These squat dinosaurs have hard upright plates of bone along their backs and 4 long spikes on the end of their tails. They will swing their tail at anything that menaces them. Stegosaurs are herbivores and prefer sub-tropical conditions. They are usually found only in \"lost world\" areas.",
    "Titanothere": "The prehistoric titanothere resembles a huge blunt-horned rhino, 12' tall at the shoulder. They are generally peaceful if left alone, preferring to graze grass and eat leaves off trees. In combat, titanotheres will butt or trample their opponents. Small herds of these creatures are found in the grasslands of \"lost world\" areas.",
    "Toad, Giant": "A giant toad is about the size of a very large dog and weighs 150-250 pounds. These toads can change their skin color to blend into woods or poorly lit dungeons, thus surprising their prey on a roll of 1-3. They can shoot their tongues out to 15' and drag dwarf-sized or smaller victims to their mouths to be bitten. On a \"to hit\" roll of 20, small prey will be swallowed whole, taking 1-6 points of damage each round thereafter.",
    "Treant": "Treants are 18' tall tree-men who resemble trees. Treants are only concerned with protecting forests and plant life. They speak a slow and difficult tongue and distrust those who use fire. Because treants are often mistaken for normal trees, all encounters with treants take place at 30 yards or less and they surprise a party on a roll of 1-3.\n\nOne treant can animate any two trees within 60' to move at 30', 5', and fight as treants. A treant may change which trees it is animating at will.",
    "Triceratops": "A triceratops is a heavily muscled, four-legged dinosaur that stands about 12' high at the shoulder and is nearly 40' long. It has three horns protruding from the bony protective crest that covers its head. Although these creatures are plant eaters, they are aggressive and dangerous, usually attacking on sight. They charge for double damage on the first attack.\n\nTriceratops are found on the plains of \"lost worlds.\"",
    "Tyrannosaurus Rex": "The tyrannosaurus rex is one of the largest hunting dinosaurs, standing over 20' tall. Its great jaws are lined with sharp teeth and it moves erect on its hind legs. It will attack anything man-sized or larger, usually attacking the largest creature first.\n\nThe tyrannosaurus rex is usually found only in \"lost world\" areas.",
    "Unicorn": "A unicorn looks like a slender horse with a horn growing from its forehead. A unicorn is a fierce but shy creature. Only a pure maiden can talk to or ride one. It can magically teleport itself with a rider to a distance of 360' once per day.",
    "Vampire": "Vampires are the most feared of the undead, feeding on the blood of the living in order to survive. Vampires haunt ruins, tombs, crypts, and other places deserted by man. They are unaffected by sleep, charm, and hold spells. Vampires can only be hit with magic weapons.\n\nIn human form, a vampire's touch will drain 2 life energy levels from the victim. A character slain by a vampire will return from death as a vampire in 3 days.\n\nA vampire may also attempt to charm any who gaze into its eyes. The victim must save vs. Spells to avoid the charm, with a -2 penalty on the roll. A charmed victim will be totally under the vampire's control, but cannot use spells or magic.\n\nA vampire in any form can regenerate 3 hit points per round, as soon as it is damaged. If a vampire is reduced to 0 hit points, it will not regenerate, but will become gaseous and flee to its coffin.\n\nIn human form the vampire can summon 10-100 rats, 5-20 giant rats, 10-100 bats, 3-18 giant bats, or 3-18 wolves, 2-8 dire wolves, if these are in the area.\n\nWeaknesses of vampires: Vampires will not come within 10' of any strongly presented holy symbol, although they may move to attack the person holding the symbol from another direction. A strong odor of garlic repels them, save vs. Poison or cannot attack that round. Vampires cast no reflection and avoid mirrors.\n\nA vampire may take the form of a human, a dire wolf, a giant bat, or a gaseous cloud at will. This transformation requires 1 round. In dire wolf or giant bat form, the vampire will move, attack, and do damage according to the statistics for those creatures. The vampire's armor class, hit dice, morale, and saving throws remain unchanged. In gaseous form, a vampire can fly at the listed speed and has immunity to all weapon attacks. A vampire cannot attack while in gaseous form.\n\nVampires cannot cross running water, either on foot or flying, except at bridges or while in their coffins. During the day, a vampire usually rests in its coffin, and failure to do so results in the loss of 2-12 hit points per day. These hit points will not be regenerated until the vampire has rested in its coffin for a full day.\n\nDestroying vampires: A vampire can be destroyed by driving a wooden stake through its heart or by immersion in running water for 1 turn. If a vampire is exposed to direct sunlight, the creature must make a saving throw vs. Death Ray each round or disintegrate. A continual light spell will not disintegrate a vampire, but will partially blind it, making its attacks suffer a -4 penalty to hit. If all of the vampire's coffins are blessed or destroyed, the vampire will weaken, taking damage as above, and will die when its hit points are reduced to 0. A vampire will always have several well-hidden coffins available.",
    "Wraith": "A wraith is an undead monster that drains the life force of its victims. It has no physical body and looks like a pale, manlike, almost transparent figure composed of thick mist. It is immune to sleep, charm, and hold spells. A wraith can only be hit by silver or magical weapons, but silver weapons will only do half damage.\n\nWhen a wraith hits in melee, it will do normal damage and also drain one life energy level, see spectre. Wraiths dwell in deserted lands or in the dwellings of creatures they have slain or frightened away. Characters slain by a wraith will become wraiths under the control of the one that killed them after one day.",
    "Wyvern": "A wyvern looks like a two-legged, winged dragon with a long tail. In combat, the wyvern will bite and arch its tail over its head to hit opponents in front of it. Those stung by the tail must save vs. Poison or die. These beasts prefer to live on cliffs or in forests, but may be found anywhere.",
    "NPC Parties": "An NPC party is any group of non-player characters. They may be of any class and level. Each NPC may be Lawful, Neutral, or Chaotic, and the group may be mixed with respect to alignment and class. All rules for player characters apply to NPCs. An NPC party may be created in great detail before a game; the Basic rules point to the procedure in Creating an NPC Party.\n\nA high-level NPC party may be a mixed group of adventurers of any class or alignment. A cleric party is led by a 7th to 12th level cleric, usually with lesser clerics and a few fighters. A fighter party is led by a 7th to 10th level fighter with retainers of similar alignment.\n\nA magic-user party is led by a 7th to 10th level magic-user, often with apprentices and hired fighters. Any magic items found in such a party's treasure should be assumed to be in active use by the NPCs.",
    "Rat": "Rats will eat almost anything and some rats carry diseases. Anyone bitten by a rat has a 1 in 20 chance of being infected, and that chance should be checked each time a rat successfully hits. The victim may still avoid the disease by making a saving throw vs. Poison. If the save is failed, roll 1d4. On a 1 the victim dies in 1-6 days; otherwise the victim is sick in bed and unable to adventure for one month. The disease may be cured magically.\n\nRats usually avoid humans and will not attack unless summoned, by a wererat for example, or while defending their lair. Rats are good swimmers and may attack without penalty while in water. They are afraid of fire, and will run from it unless forced to fight by their leader, the creature summoning them.\n\nNormal Rats: Normal rats may be from 6 inches to 2 feet long and have gray or brown fur. They attack in packs of 5 to 10. If there are more than 10 rats they will attack several creatures as packs of 10 or less. A pack will only attack one creature at a time, but may bite for 1-6 points of damage, plus the normal chance of disease checked once per pack attack. Rats will climb all over the creature they are attacking and the victim must save vs. Death or be knocked down by them and unable to fight until regaining its feet.\n\nGiant Rats: Giant rats are 3 feet long or more, and have gray or black fur. They are often found in the dark corners of dungeon rooms and in areas where undead monsters lurk.",
    "Stirge": "A stirge is a birdlike creature with a long beak, rather like a very small feathered anteater. When it attacks, it tries to bury its beak in the victim and suck blood. A successful hit means it has attached itself, after which it automatically drains 1-3 points each round until either it or its victim dies.\n\nBecause of its speed, a flying stirge gains a +2 bonus on its first attack roll against a target. Stirges are hardy and save as Fighter: 2.",
    "Thoul": "A thoul is a magical combination of a ghoul, a hobgoblin, and a troll (see D&D EXPERT rules). Except when very close, thouls look exactly like hobgoblins, and they are sometimes found as part of the bodyguard of a hobgoblin king. The touch of a thoul will paralyze in the same way as that of a ghoul.\n\nIf it is damaged, a thoul will regenerate 1 hit point per round as long as it is alive. After a thoul is hit, the DM should add 1 hit point to its total at the beginning of each round of combat.",
    "Trader": "Traders are first level fighters who make their living trading goods. They are similar to merchants, but much braver and much better fighters. They usually carry swords and hand axes. They wear furs, treating them as leather armor, and carry shields.\n\nWhen encountered in the wilderness, they will be leading 1-4 pack mules carrying trade goods. The choice of exactly which trade goods is left to the DM; typical ones are spices, furs, or carved decorative items.",
    "Troglodyte": "A troglodyte is an intelligent human-like reptile with a short tail, long legs, and a spiny comb on its head and arms. Troglodytes walk upright and use their hands as well as humans. They hate most other creatures, and will try to kill anyone they meet.\n\nThey have a chameleon-like ability to change colors and use it to hide by rock walls, surprising on a roll of 1-4 on 1d6. They secrete an oil which produces a stench that will nauseate humans and demi-humans unless the victims save vs. Poison. Nauseated characters have a -2 penalty on their attack rolls while in hand-to-hand combat with the troglodytes.",
    "Centaur": "A centaur is a creature with the head, arms, and upper body of a man joined to the body and legs of a horse. Centaurs prefer to live far from humankind in meadows and forests. Since they are somewhat intelligent, they will arm themselves with weapons such as clubs, lances, or bows.\n\nCentaurs will form into small tribes or families. Their homes will be found in dense thickets or woods reached by twisting and guarded pathways. The females and young will usually stay in the lair. If attacked, females and young will attempt to flee unless escape is impossible, in which case they will fight to the death. The young will fight as 2 hit dice monsters, doing 1-2 / 1-2 / 1-4 damage or by weapon type.",
    "Chimera": "A chimera is a horrid combination of three different creatures. It has three heads, goat, lion, and dragon, the forebody of a lion, the hindquarters of a goat, and the wings of a dragon. The goat's head gores with its horns, the lion's head bites with its fangs, and the dragon's head can bite or breathe fire, a 50' long cone with a 10' wide end, for 3-18 points of damage.\n\nLike a regular dragon, the dragon head will breathe fire 50% of the time or bite 50% of the time. The dragon's head can only breathe 3 times per day. Chimeras usually live in wild hills, but may occasionally be found in dungeons.",
    "Cockatrice": "This is a small, magical monster with the head, wings, and legs of a rooster and the tail of a serpent. It is able to strike with its beak for 1-6 points of damage. However, its small size and single attack disguises its greatest danger: any character touched by a cockatrice must make a saving throw or be turned to stone.\n\nCockatrices may be found anywhere.",
    "Crab, Giant": "Unable to swim, giant crabs are found on the bottom of shallow waters, in coastal rivers and on beaches, and in salt or fresh water. They are always hungry and will attack anything that moves. Giant crabs are not intelligent.",
    "Crocodile": "Crocodiles are commonly found in tropical and semi-tropical swamps or in slow-moving rivers. Awkward on land, they do not stray far from water and will spend hours floating barely under the surface. If hungry, crocodiles will attack creatures in the water. They are particularly attracted to the smell of blood or violent thrashing of the water.\n\nLarge crocodiles are at least 20' long, and can overturn canoes and small rafts. Giant crocodiles are normally found only in \"lost worlds\" where prehistoric creatures thrive. They are over 50' long and have been known to attack small boats or ships.",
    "Cyclops": "A cyclops is a rare type of giant, noted for its great size and the single eye in the center of its forehead. A cyclops is about 20' tall. It has poor depth perception due to its single eye, and strikes with a penalty of -2 on all \"to hit\" rolls. A cyclops will usually fight with a wooden club. A cyclops can throw rocks up to a distance of 200 feet with a penalty of -2 to hit. These rocks will cause 3-18 points of damage to any creature struck.\n\nSome cyclops, 5%, are able to cast a curse once a week. The DM should decide the exact nature of the curse.\n\nA cyclops usually lives alone, though a small group may sometimes share a large cave. They spend their time raising sheep and grapes. Cyclopes are known for their stupidity, and a clever party can often escape from them by trickery.",
    "Devil Swine": "Devil swine are lycanthropes, shape-changers. They haunt the fringes of human settlements, especially those near swamps or forests. They are carnivorous and especially fond of human flesh. They can assume the forms of huge hogs or fat human beings, and can change from one form to the other freely at night, but at dawn they must retain their current form until dusk. Devil swine can be harmed only by silver or magical weapons.\n\nDevil swine possess a powerful charm person spell that can be used 3 times each 24 hours. They can use this spell in either human or swine form. A saving throw vs. Spells is allowed, at -2 on the roll. The charmed victim will be unable to use spells or magical devices, and each devil swine may have 0-3 humans under its control. Devil swine prefer to attack from ambush.",
    "Displacer Beast": "A displacer beast looks like a large black panther with six legs and a pair of tentacles growing from its shoulders. It attacks with these tentacles, which have sharp horn-like edges. A displacer beast always appears to be 3' from its actual position, making the creature hard to hit: any creature attacking it must subtract 2 from the \"to hit\" rolls. The displacer beast also receives a +2 bonus on all saving throws.\n\nThey are semi-intelligent. Displacer beasts hate and fear blink dogs, and will always attack them and anyone traveling with them.",
    "Djinni (Lesser)": "The djinn are intelligent, free-willed air elementals. They appear as tall, human-like beings, surrounded with clouds. Djinn are highly magical in nature and save as 14th level fighters. They can only be harmed by magic or magical weapons.\n\nA djinni can perform any of its seven powers three times a day. These powers are: create food and drink, as a 7th level cleric; create metallic objects of temporary duration, varying with hardness, gold for 1 day and iron for one round, to a maximum of 1000 en weight; create soft goods and wooden objects, permanent, to a maximum of 1000 en weight; become invisible; assume gaseous form; or form itself into a whirlwind. In addition, a djinni can create illusions that affect both sight and hearing at will. Such illusions last until touched or magically dispelled; the djinni need not concentrate to maintain them.\n\nDjinn have two forms of attack. A djinni can form itself into a whirlwind, 70' tall, 20' diameter at the top, 10' diameter at base, that moves 120' (40') per turn. The djinni requires 5 rounds to enter or leave whirlwind form. The djinni-whirlwind will do 2-12 points of damage to all in its path and will sweep aside all creatures with fewer than 2 hit dice who do not save vs. Death Ray. When not in whirlwind form, a djinni strikes once per round with its fists for 2-16 points of damage. If a djinni is slain, it returns to its own plane. A djinni can carry 6000 en weight without tiring. Up to 12,000 en weight can be carried for 3 turns walking or 1 turn flying. Afterwards, a djinni must rest for one turn.",
    "Dragon Turtle": "Dragon turtles appear to be some unusual mixture of a dragon and a gigantic turtle. They have the head, limbs and tail of a great dragon and the hard shell of a turtle. These creatures live in the depths of great oceans and seas, seldom surfacing or approaching land. Dragon turtles are so large that sailors have mistakenly anchored on ones floating on the surface, thinking the hard shell to be a small island.\n\nBesides its powerful claws and bite, the dragon turtle is also able to use a breath weapon. It can breathe a 30' wide cloud of steam to a distance of 90'. This breath weapon will do damage in the same manner as a dragon's, inflicting hit points of damage equal to the current hit points of the dragon turtle.\n\nDragon turtles live in great caverns on the bottom of the deepest oceans, where they keep the treasures of sunken ships. On occasion they will rise under ships, attempting to overturn them and devour the occupants.\n\nNote: Dragon turtles are extremely powerful creatures that should not be used unless the player characters are of very high level.",
    "Dryad": "A dryad is a beautiful female tree spirit, who lives in a woodland setting or a dense forest. Each individual dryad always lives in a specific tree and will die in one turn if taken more than 240' away from it. A dryad will also die if her tree dies. If a dryad wishes to be unobserved, she will join with her tree, becoming part of it. Dryads are extremely shy and non-violent, but very suspicious of strangers.\n\nAnyone approaching or following a dryad, not merely standing in the area of the tree, may be attacked by the powerful charm person spell these creatures can cast. The victim must make a saving throw vs. Spells with a penalty of -2 on the roll. A charmed character will approach the tree and be drawn into it. Unless rescued immediately, the victim will never be seen again.\n\nDryads hide their treasure in hollows under the roots of their trees.",
    "Elemental": "Elementals can be brought forth only from a large amount of their element, open air, bare earth or rock, large fire, or a large pond. After being summoned they must be totally controlled at all times by the person who summoned them. Control requires complete concentration. If the summoner moves over half speed, takes damage in combat, or does anything besides paying attention to the elemental, the elemental will turn and attempt to attack its summoner. It will also attack any creature in the path between it and the one who summoned it. Once control is lost, it can never be regained. An elemental vanishes when dispelled, when the elemental is slain, or when the summoner orders the elemental to return from whence it came while it is still under control. Elementals can be hit only by magic or magic weapons.\n\nStaff elementals, the weakest, are summoned by a magic-user with a special staff. Device elementals are summoned with the use of a special miscellaneous magic item. Conjured elementals are summoned by the use of the 5th level magic-user or elf spell.\n\n| Kind | Armor Class | Hit Dice | Damage | Save As |\n| --- | --- | --- | --- | --- |\n| Staff | 2 | 8 | 1-8 | Fighter: 8 |\n| Device | 0 | 12 | 2-16 | Fighter: 12 |\n| Conjured | -2 | 16 | 3-24 | Fighter: 16 |\n\nAir elementals appear as great whirlwinds 2' tall and 1/2' in diameter for each hit die they have. The whirlwind will catch and sweep away creatures of less than 2 hit dice unless a saving throw vs. Death Ray is made. Air elementals do an extra 1-8 points of damage against flying opponents.\n\nEarth elementals appear as huge man-like figures 1' tall for each hit die they have. Earth elementals cannot cross a water barrier wider than their height. Earth elementals do an extra 1-8 points of damage against opponents on the ground.\n\nFire elementals appear as swirling pillars of roaring flame 1' tall and 1' in diameter for each hit die they have. They cannot cross a water barrier wider than their own diameter. They do an additional 1-8 points of damage against all creatures with cold-based attacks.\n\nWater elementals appear as great waves of water 1/2' tall and 2' in diameter for each hit die they have. Water elementals are not able to move more than 60' from water. They do an extra 1-8 points of damage against opponents in water.",
    "Elephant": "Any number of elephants from a lone rogue to an entire herd may be encountered. Both males and females have tusks.\n\nIn combat, elephants will first charge, striking with their tusks for double damage. In succeeding combat rounds, they will either strike with their tusks, 25%, or trample, 75%. If the opponent is man-sized or smaller, the elephant receives a bonus of +4 on \"to hit\" rolls when trampling.\n\nElephants dwell at the edge of sub-tropical forest areas. Their tusks are valued for the ivory and may be sold for 100-600 gp each.",
    "Fish, Giant": "Giant piranha are 5' in length with green and black scales. They attack anything that disturbs the water near them. Up to 8 giant piranha can attack the same target. Once blood is drawn they go into a feeding frenzy and will not check morale. Piranha inhabit warm fresh waters and prefer rivers to lakes.\n\nSpiny rockfish are found in shallow salt water and are very difficult to distinguish from normal boulders. There is a 70% chance that one will be mistaken for a boulder or lump of coral. A rockfish is normally harmless, but will viciously attack anyone who disturbs it. Its body is covered with spines, and it may lash 4 of them at any character. These spines do 1-4 points of damage each and are deadly poisonous, save vs. Poison or die. Mistaking a rockfish for a rock or lump of coral and grasping it will result in 4 automatic hits, each requiring a save vs. Poison in addition to the normal damage taken.\n\nGiant catfish are chalky white fish about 15' long. They have two long feelers that sprout from each side of the mouth, and lurk in the cool muck of river and lake bottoms attacking swimmers or things moving on the bottom.\n\nGiant sturgeon are almost 30' long and are covered with thick armorlike scales. Sturgeons are vicious fighters. On a roll of 18 or better they swallow their prey whole.\n\nAny character swallowed takes 2-12 points of damage per round and must make a saving throw vs. Death Ray or be paralyzed. If the character saves, he or she may try to hack a way out at a penalty of -4; the inside of a sturgeon has a base AC of 7.",
    "Golem": "A golem is a powerful monster, created and animated by a high-level magic-user or cleric. They can be made of almost any material, but the ones listed are typical. The DM should feel free to create other golems with any special powers desired.\n\nNormally golems can only be hit by magic weapons. Golems are also immune to sleep, charm, and hold spells, as well as all forms of gases. Creating a golem is costly, time consuming, and beyond the power of player characters in the D&D Expert rules.\n\nWood golems are crude manlike figures about 3' tall, hacked from wood. They move stiffly and have a penalty of -1 on initiative rolls. They burn easily, saving at -2 and suffering one extra point of damage per die from fire-based attacks.\n\nBone golems are 6' tall creatures made from the bones of dead men bound together into a manlike form. They wield weapons from skeletal arms fastened to their bodies at various points. Either four one-handed weapons or two pole arms may be used by a bone golem, and it will attack up to two enemies per round. Bone golems are immune to fire, cold, and electrical attacks.\n\nAmber golems resemble giant lions or tigers. They are faultless trackers and can detect invisible creatures within 60'.\n\nBronze golems look somewhat like fire giants. Their skin is bronze and their blood is liquid fire. Any creature hit by a bronze golem takes 1-10 more points of damage from the great heat inside it. Anyone scoring damage on a bronze golem with an edged weapon must save vs. Death Ray or take 2-12 points of damage from the fiery blood spurting out of the wound. Bronze golems are not affected by fire-based attacks.",
    "Griffon": "A griffon is a large monster with the head, wings, and front claws of an eagle and the body and hindquarters of a lion. It is a voracious predator. Its favorite prey is horses. When within 120' of horses a griffon must pass a morale check or attack immediately.\n\nWild griffons will attack any who approach their nests. If captured young, they can be tamed to become fierce, loyal mounts, with training left to the DM's discretion. Tamed griffons are still likely to attack horses, however, and must check morale as above.",
    "Hellhound": "A hellhound appears as a reddish-brown hound the size of a large wolfhound or small pony, and is impervious to normal fire. They are often found near volcanos, deep in dungeons, or with another fire-loving creature such as a fire giant. Hellhounds are cunning and highly intelligent. They save as a fighter level equal to their hit dice.\n\nIn melee, a hellhound will attack one person, biting, 3-6 on 1d6, or breathing fire, 1 or 2 on 1d6, each round. Its breath does 1d6 points of damage for each hit die the hellhound has, 3d6 to 7d6. A character who makes a saving throw vs. Dragon Breath takes only half damage.\n\nHellhounds have a 75% chance per round of detecting an invisible person or object within 60'. They save as a fighter of equal hit dice.",
    "Veteran": "Veterans are low-level fighters, usually returning from or going to a war. To determine each veteran's level and alignment, use the method outlined under Creating an NPC Party. A party of veterans may be of mixed levels and alignments, or the DM may wish to give all members the same levels.",
    "Wight": "A wight is an undead spirit living in the body of a dead human or demi-human. It can only be hit by silvered or magical weapons. Wights are greatly feared, as they drain life energy when striking a victim. Each hit drains one level of experience or hit die. Example: a 3rd level fighter struck by a wight becomes a 2nd level fighter, keeping only enough experience points to be at the midpoint of 2nd level, and losing 1 hit die of hit points.\n\nAny person totally drained of life energy by a wight will become a wight in 1-4 days and will be under control of the wight who drained them.",
    "Wolf": "Wolves are meat-eaters and hunt in packs. Though wolves prefer the wilderness, they will occasionally be found in caves. Captured wolf cubs can be trained like dogs, if the DM permits, but it is difficult. If 3 wolves or fewer are encountered, or if a pack is reduced to less than 50% of its original numbers, their morale is 6 rather than 8.\n\nDire Wolves: Dire wolves may be found in caves, woods, or mountains. They are larger and more ferocious than normal wolves, and are semi-intelligent. They are fierce enemies and usually hunt in packs. They are sometimes trained by goblins to be used as mounts. Captured dire wolf cubs can be trained like dogs, if the DM permits, but they are even more savage than normal wolves.",
    "Yellow Mold": "This deadly fungus covers an area of 10 square feet (2' by 5', for example), though many are sometimes found together. Yellow mold can only be killed by fire; a torch will do 1-4 points of damage to it each round. It will eat through wood and leather but does not harm metal or stone.\n\nIt does not actually attack, but if it is touched by a torch, for example, the touch may cause the mold to squirt out a 10'x10'x10' cloud of spores. There is a 50% chance per hit that the mold will squirt out this cloud. Anyone caught within the cloud must save vs. Death Ray or choke to death within 6 rounds.",
    "Zombie": "Zombies are undead humans or demi-humans animated by some evil cleric or magic-user. As all undead, they may be turned by a cleric but are not affected by sleep or charm spells or any form of mind reading. They are often placed to guard treasures, since they make no noise until they attack.\n\nZombies will always attack on sight, but can be destroyed by normal weapons. They are slow fighters and always strike last (no initiative roll needed).",
    "Troll": "Thin, rubbery, and loathsome, trolls stand nearly 8' tall. They are intelligent and prefer humanoid creatures over all other foods. Trolls live in caves, dungeons, wastelands, and in ruined dwellings of the humanoids they have slain and eaten.\n\nTrolls are strong and rend their opponents with talons and sharp teeth. A troll has the power of regeneration, the ability to heal and grow back together. A troll will begin to heal 3 rounds after it has taken damage. A troll's wounds will heal themselves at a rate of 3 hit points per round, and even severed limbs will crawl back to the body and rejoin. The troll cannot regenerate damage from fire or acid. In game turns, this means that unless totally consumed by fire or acid, a troll will eventually regenerate completely. If reduced to 0 hit points by other than fire or acid damage, the troll will heal enough to fight again in 2-12 rounds. The morale in parentheses applies only when the troll is attacked by fire or acid.",
    "Weasel, Giant": "A giant weasel is 8'-9' long and covered with richly colored fur of white, gold, or brown. These quick, vicious predators hunt singly or in groups. Once they bite, they hold on and suck blood, doing 2-8 points of damage each round until their prey dies or the weasel is killed.\n\nGiant weasels have infravision to 30' and can track by scent. They prefer wounded prey and lair in underground tunnels, where treasure is often found on the bodies of creatures they have dragged back to eat.",
}


@dataclass
class Entry:
    name: str
    source: str
    block: str


def reconstruct_layout_text(name: str) -> str:
    split = 93 if "basic" in name else 99
    text = (WORKING / name).read_text()
    text = text.replace("\f", "\n")
    pages = re.split(r"(?m)^===== [^=]+ =====\n?", text)
    page_chunks: list[str] = []

    for page in pages:
        if not page.strip():
            continue

        left: list[str] = []
        right: list[str] = []
        for raw_line in page.splitlines():
            if "Ryan Hartman" in raw_line:
                continue

            stripped = raw_line.strip()
            if not stripped:
                if left and left[-1] != "":
                    left.append("")
                if right and right[-1] != "":
                    right.append("")
                continue

            if stripped in {"MONSTERS", "D&D: BASIC", "D&D: EXPERT"}:
                continue
            if re.fullmatch(r"[BX]\d+", stripped):
                continue

            if len(raw_line) < split or not raw_line[split:].strip():
                left.append(stripped)
                continue

            left_text = raw_line[:split].strip()
            right_text = raw_line[split:].strip()
            if left_text:
                left.append(left_text)
            if right_text:
                right.append(right_text)

        if left:
            page_chunks.append("\n".join(left).strip())
        if right:
            page_chunks.append("\n".join(right).strip())

    return "\n\n".join(chunk for chunk in page_chunks if chunk).strip()


def load_text(name: str) -> str:
    text = reconstruct_layout_text(name) if "layout" in name else (WORKING / name).read_text()
    text = text.replace("\f", "\n")
    text = re.sub(r"===== [^=]+ =====", "", text)
    text = re.sub(r"Ryan Hartman \(Order #[0-9]+\)", "", text)
    text = re.sub(r"D&D:\s*BASIC|D&D:\s*EXPERT|DAD:\s*EXPERT|MONSTERS|PART 6:\s*MONSTERS", "", text, flags=re.I)
    text = re.sub(
        r"in nature, or have special abilities.*?Only\s+the\s+intelligen[t]?\s+monsters can speak an alignment language\.",
        "",
        text,
        flags=re.S | re.I,
    )
    text = re.sub(r"\b(?:B|X)\d+\b", "", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text


def split_entries(text: str, names: list[str], source: str) -> list[Entry]:
    found: list[tuple[int, str, str]] = []
    for canonical in names:
        literal = ALIASES.get(canonical, canonical)
        match = re.search(r"(?m)^" + re.escape(literal) + r"\s*$", text)
        if match:
            found.append((match.start(), canonical, literal))
    found.sort()

    entries: list[Entry] = []
    for idx, (start, canonical, literal) in enumerate(found):
        end = found[idx + 1][0] if idx + 1 < len(found) else len(text)
        block = text[start:end].strip()
        block = re.sub(r"^" + re.escape(literal) + r"\s*\n?", "", block)
        block = cleanup_block(canonical, block)
        entries.append(Entry(canonical, source, block))
    return entries


def cleanup_block(name: str, block: str) -> str:
    block = block.replace("Ore", "Orc") if name == "Orc" else block
    preserved_linebreak_compounds = {
        "demi-\nhumans": "demi-humans",
        "fire-\nscales": "fire-scales",
        "orange-\nbrown": "orange-brown",
        "to-\nhand": "to-hand",
        "well-\nhidden": "well-hidden",
    }
    for src, dst in preserved_linebreak_compounds.items():
        block = block.replace(src, dst)
    block = re.sub(r"([A-Za-z]+)-\s*\n\s*([a-z]+)", r"\1\2", block)
    block = block.replace("Id4", "1d4").replace("Id6", "1d6").replace("Id8", "1d8").replace("Id 10", "1d10")
    block = block.replace("V2", "1/2").replace("lbutt", "1 butt").replace("lbite", "1 bite")
    block = block.replace("l touch", "1 touch").replace("l spell", "1 spell").replace("l weapon", "1 weapon")
    block = block.replace("ldlO", "1d10").replace("lU", "1/2")
    block = block.replace("en- countered", "encountered")
    block = re.sub(r"en-\s+countered", "encountered", block)
    block = block.replace("l-6", "1-6").replace("l-4", "1-4").replace("l-8", "1-8").replace("l-10", "1-10")
    block = block.replace("l-12", "1-12").replace("l-20", "1-20").replace("l-24", "1-24").replace("l-18", "1-18")
    block = re.sub(r"at-\s+tack", "attack", block)
    hyphen_fixes = {
        "ad- mitting": "admitting",
        "ad- venture": "adventure",
        "al- ways": "always",
        "any- thing": "anything",
        "ap- pear": "appear",
        "at- tempt": "attempt",
        "auto- matically": "automatically",
        "body- guards": "bodyguards",
        "char- acter": "character",
        "char- acters": "characters",
        "con- strict": "constrict",
        "con- tain": "contain",
        "dam- age": "damage",
        "de- fend": "defend",
        "demi- humans": "demi-humans",
        "down- wards": "downwards",
        "dur- ing": "during",
        "echo- location": "echolocation",
        "eat- ing": "eating",
        "en- counters": "encounters",
        "experi- ence": "experience",
        "grave- yards": "graveyards",
        "hav- ing": "having",
        "house- wives": "housewives",
        "in- habitants": "inhabitants",
        "in- stead": "instead",
        "initia- tive": "initiative",
        "inquisi- tive": "inquisitive",
        "intelli- gent": "intelligent",
        "ko- bolds": "kobolds",
        "ma- terial": "material",
        "magi- cal": "magical",
        "min- ing": "mining",
        "mon- sters": "monsters",
        "most- ly": "mostly",
        "moun- tainous": "mountainous",
        "omnivor- ous": "omnivorous",
        "op- ponent": "opponent",
        "open- ings": "openings",
        "pud- ding": "pudding",
        "pre- ferring": "preferring",
        "pro- tect": "protect",
        "profes- sion": "profession",
        "reac- tions": "reactions",
        "re- mainder": "remainder",
        "re- moved": "removed",
        "re- peatedly": "repeatedly",
        "read- ing": "reading",
        "sub- due": "subdue",
        "success- fully": "successfully",
        "to- gether": "together",
        "un- less": "unless",
        "under- ground": "underground",
        "when- ever": "whenever",
        "with- out": "without",
    }
    hyphen_compounds = {
        "orange- brown": "orange-brown",
        "to- hand": "to-hand",
        "well- hidden": "well-hidden",
    }
    for src, dst in hyphen_fixes.items():
        block = block.replace(src, dst)
    for src, dst in hyphen_compounds.items():
        block = block.replace(src, dst)
    block = block.replace("dan", "than")
    block = block.replace("thangerous", "dangerous")
    block = block.replace("\\wings", "wings")
    block = block.replace("GnoUs", "Gnolls").replace("indivuals", "individuals").replace("echos", "echoes")
    block = block.replace("magica1", "magical").replace("mechanica1", "mechanical")
    block = block.replace("Liv- ing", "Living")
    block = block.replace("goblins or ores", "goblins or orcs")
    block = re.sub(r"\bcrea-\s+unless\b", "creatures unless", block)
    block = re.sub(r"\bre-\s+move\b", "remove", block)
    if name == "Orc":
        block = block.replace("both humans and )", "both humans and monsters)")
        block = block.replace("An ore lair", "An orc lair")
        block = re.sub(r"\bOres\b", "Orcs", block)
        block = re.sub(r"\bores\b", "orcs", block)
        block = re.sub(r"\bOre\b", "Orc", block)
        block = re.sub(r"\bore\b", "orc", block)
        block = re.sub(r"\bore tribe\b", "orc tribe", block)
    if name == "Basilisk":
        block = block.replace(
            "Damage:      1-10 points +          Alignment:     Neutral\npetrification",
            "Damage:      1-10 points + petrification          Alignment:     Neutral",
        )
        block = re.sub(r"non-intelli-\s+gent", "non-intelligent", block)
    if name == "Ape, White":
        block = re.sub(
            r"If creatures approach their lair, the apes\s+.*?bie\s+will threaten them\. If their threats are ignored, they will attack\.\s+They may throw one stone per round for 1d6 points\. White apes\s+are not intelligent and sometimes are kept as pets by Neanderthals\.",
            (
                "If creatures approach their lair, the apes will threaten them. "
                "If their threats are ignored, they will attack. They may throw one stone "
                "per round for 1d6 points. White apes are not intelligent and sometimes "
                "are kept as pets by Neanderthals."
            ),
            block,
            flags=re.S,
        )
    if name == "Doppleganger":
        block = block.split("Blue                Red                    Gold", 1)[0].rstrip()
    if name == "Acolyte":
        block = block.replace(
            "Animals, Normal and Giant: see Ape, Bat, Bear, Boar, Cat,\nFerret, Rat, Rock Baboon, Shrew, and Wolf.",
            "",
        )
    if name == "Pegasus":
        block = block.replace(
            "Prehistorical animal: see Mastodon, Pterodactyl, Stegosaurus, Titanothere, Triceratops, and Tyrannosaurus Rex.",
            "",
        )
    trim_markers = {
        "Camel": "Centaur",
        "Gray Ooze": "Green Slime",
        "Hippogriff": "Horse",
        "Living Statue": "Lizards, Giant",
        "Lizard Man": "Lycanthropes",
        "Mule": "Neanderthal",
        "Stirge": "Thoul",
        "Troll": "Tyrannosaurus Rex",
        "Weasel, Giant": "Whale",
    }
    marker = trim_markers.get(name)
    if marker and marker in block:
        block = block.split(marker, 1)[0].rstrip()
    block = block.replace("\t", " ")
    block = re.sub(r"\n +", "\n", block)
    block = re.sub(r"\n{3,}", "\n\n", block)
    return block.strip()


def extract_stats_and_body(block: str) -> tuple[str, str]:
    lines = normalized_lines(block)
    stats: list[str] = []
    body_start = 0
    seen_stat = False
    for idx, line in enumerate(lines):
        if re.match(rf"^{FIELD_PATTERN}\b", line):
            seen_stat = True
            stats.append(line)
            continue
        if seen_stat and looks_like_body(line):
            body_start = idx
            break
        if seen_stat:
            stats.append(line)
    if body_start == 0 and seen_stat:
        for idx, line in enumerate(lines[len(stats):], start=len(stats)):
            if looks_like_body(line):
                body_start = idx
                break
    if body_start == 0:
        return "", "\n".join(lines)
    return "\n".join(stats).strip(), "\n".join(lines[body_start:]).strip()


def normalize_body(text: str) -> str:
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    paras: list[str] = []
    current: list[str] = []
    for line in lines:
        current.append(line)
        if line.endswith((".", "!", "?")):
            paras.append(" ".join(current))
            current = []
    if current:
        paras.append(" ".join(current))
    return "\n\n".join(paras)


def is_field_line(line: str) -> bool:
    return bool(re.match(rf"^{FIELD_PATTERN}\b", line))


def looks_like_body(line: str) -> bool:
    if "." in line and len(line.split()) >= 6 and re.search(r"[a-z]{3,}", line) is not None:
        return True
    return bool(re.match(r'^[A-Z][A-Za-z0-9",()\'/-]*(?:\s+[A-Za-z0-9"\'(),/-]+){4,}', line))


def normalized_lines(block: str) -> list[str]:
    raw_lines = [line.strip() for line in block.splitlines() if line.strip()]
    lines: list[str] = []
    inline_split = re.compile(rf"(?<!^)\s{{2,}}(?={FIELD_PATTERN}\b)")

    for line in raw_lines:
        pieces = [piece.strip() for piece in inline_split.split(line) if piece.strip()]
        lines.extend(pieces)

    return lines


def parse_stat_pairs(block: str) -> list[tuple[str, str]]:
    lines = normalized_lines(block)
    pairs: list[tuple[str, str]] = []
    idx = 0
    while idx < len(lines):
        line = lines[idx]
        match = re.match(rf"^({FIELD_PATTERN}):?\s*(.*)$", line)
        if not match:
            idx += 1
            continue
        field = match.group(1)
        value = match.group(2).strip()
        idx += 1
        parts: list[str] = [value] if value else []
        while idx < len(lines):
            nxt = lines[idx]
            if is_field_line(nxt) or looks_like_body(nxt):
                break
            parts.append(nxt)
            idx += 1
        clean_value = " ".join(p for p in parts if p).strip()
        clean_value = re.sub(r"\s+", " ", clean_value)
        pairs.append((field, clean_value))
    return pairs


def render_stat_table(name: str, block: str) -> str:
    if name in MANUAL_RENDER:
        return MANUAL_RENDER[name]

    pairs = parse_stat_pairs(block)
    if not pairs:
        return ""

    empties = sum(1 for _, value in pairs if not value or value == "—")
    if empties >= 3:
        return ""

    rank = {field: idx for idx, field in enumerate(STAT_DISPLAY_ORDER)}
    pairs = sorted(
        enumerate(pairs),
        key=lambda item: (rank.get(item[1][0], len(rank)), item[0]),
    )

    lines = ["| Stat | Value |", "| --- | --- |"]
    for _, (field, value) in pairs:
        label = "Treasure Type" if field == "Treasure" else field
        lines.append(f"| {label} | {value or '—'} |")
    return "\n".join(lines)


def render_stat_block(block: str) -> str:
    stats, _ = extract_stats_and_body(block)
    if not stats:
        return ""
    return "\n".join(f"{line}  " for line in stats.splitlines())


def sort_key(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", name.lower())


def build_markdown(entries: list[Entry]) -> str:
    out: list[str] = [
        "---",
        'title: "B/X Book of Monsters"',
        'subtitle: "A merged and deduplicated monster chapter from the Basic and Expert rulebooks"',
        'author: "Compiled from the 1981 Basic and Expert Sets"',
        'date: "April 28, 2026"',
        'lang: "en-US"',
        "---",
        "",
        "> This document merges the monster material from the B/X Basic and Expert books into one continuous reference chapter. The shared monster-entry rules are stated once, Basic and Expert entries are combined into one alphabetical sequence, and selected illustration plates from the original books are retained where they materially improve the presentation.",
        "",
        "## Using This Chapter",
        "",
        "The monsters are arranged alphabetically for quick reference.",
        "",
        "Some monster names are followed by an asterisk (`*`). This means that special or magical weapons are needed to fight them, and such monsters should be used with caution.",
        "",
        "All non-human monsters have infravision unless a description says otherwise. They can detect heat out to `60'` in darkness. Hot objects appear bright, warm things appear in shades of gray, cold things appear dark, and large heat sources can interfere with this sense.",
        "",
        "`Armor Class:` Armor Class is given in the same general way as for player characters and is based on both protection and agility.",
        "",
        "`Hit Dice:` Hit Dice show how many `d8` are rolled for hit points, including any pluses or minuses. Hit Dice also indicate a monster's rough level, the dungeon level where it is most commonly found, its attack ability, and its experience value. In general, a monster's level is equal to its Hit Dice, ignoring pluses and minuses, though especially dangerous monsters may be treated as a level higher. As a rule of thumb, monsters fit best within about two dungeon levels of their Hit Dice, with fewer appearing above that range and more below it.",
        "",
        "An asterisk after Hit Dice matters for experience awards. `*` means the special-abilities bonus is added once, and `**` means it is added twice.",
        "",
        "`Move:` Move gives the number of feet a monster may travel in one turn. The number in parentheses is the number of feet it may move in one combat round. If two movement rates are given, the first is ordinary movement and the second is a special mode such as swimming, flying, or climbing.",
        "",
        "`Attacks:` Attacks gives the number and kind of attacks a monster may make in one round.",
        "",
        "`Damage:` Damage gives the matching damage values in the same order as the attacks listed.",
        "",
        "`Poison:` A poisoned hit is often fatal if the victim fails a save versus Poison.",
        "",
        "`Paralysis:` A failed save versus Paralysis leaves the victim helpless but aware, usually for `2-8` turns unless cured. Attacks against a paralyzed target hit automatically.",
        "",
        "`Energy Drain:` Energy drain removes a level of experience or one hit die with no saving throw. The loss cannot normally be cured.",
        "",
        "`Charm:` A charmed victim cannot act freely, cannot attack the charming monster, and will obey simple commands if they can be understood.",
        "",
        "`Acid:` Acid may continue to burn after the initial hit and can destroy armor as well as flesh.",
        "",
        "`No. Appearing:` This gives the suggested number encountered on the dungeon level that matches the monster's Hit Dice or level. Numbers in parentheses give the usual lair or wilderness total, and a `0` means the monster is not normally found in that setting.",
        "",
        "`Save As:` This gives the class and level used for saving throws. Intelligent monsters usually save at full monster level, often as fighters unless the description says otherwise. Unintelligent monsters often save at half level, rounded up.",
        "",
        "`Morale:` Morale is the B/X optional morale score. The DM rolls `2d6`; if the roll is higher than the adjusted morale, the monster tries to flee.",
        "",
        "`Treasure Type:` Treasure Type refers to the standard B/X treasure tables. Lair monsters are more likely to have treasure than wandering monsters, and unintelligent animals often have little or none unless circumstance explains it.",
        "",
        "`Alignment:` Alignment shows whether a monster is Lawful, Neutral, or Chaotic. Unintelligent animals are usually Neutral.",
        "",
        "When a monster entry includes multiple varieties, the original grouped presentation has been kept rather than split into many near-duplicate entries. This is especially true for dragons, lycanthropes, living statues, giant animals, sharks, whales, and similar related families.",
        "",
        "## Monster Descriptions",
        "",
    ]

    for entry in sorted(entries, key=lambda item: sort_key(item.name)):
        if entry.name == "NPC Party":
            continue
        if entry.name in MANUAL_INSERTED_NAMES:
            continue
        _, body = extract_stats_and_body(entry.block)
        if entry.name in BODY_OVERRIDE:
            body = BODY_OVERRIDE[entry.name]
        stat_table = render_stat_table(entry.name, entry.block)
        stat_block = "" if stat_table else render_stat_block(entry.block)
        out.append(f"### {entry.name}")
        out.append(f"*Source:* `{entry.source}`  ")
        # For corrected plate placement, certain images must come after the entry body
        # and immediately before the next monster heading.
        if entry.name in ART_BY_NAME and entry.name not in POST_BODY_ART_NAMES:
            out.append("")
            out.append(ART_BY_NAME[entry.name].strip())
        if stat_table:
            out.append("")
            out.append(stat_table)
        elif stat_block:
            out.append("")
            out.append(stat_block)
        if body:
            out.append("")
            if "![" in body:
                out.append(body)
            else:
                out.append(normalize_body(body))
        if entry.name in POST_BODY_ART_NAMES and entry.name in ART_BY_NAME:
            out.append("")
            out.append(ART_BY_NAME[entry.name].strip())
        if entry.name == "Acolyte":
            out.append("")
            out.append("### Animals, Normal and Giant")
            out.append("")
            out.append("See Antelope, Ape, Bat, Bear, Boar, Camel, Cat, Crab, Giant, Crocodile, Elephant, Ferret, Fish, Giant, Hawk, Horse, Lizards, Prehistoric, Rat, Rhinoceros, Rock Baboon, Shark, Shrew, Snake, Spider, Toad, Weasel, and Wolf.")
        if entry.name == "Hobgoblin":
            out.append("")
            out.append("### Horse")
            out.append("*Source:* `Expert`  ")
            out.append("")
            out.append(MANUAL_RENDER["Horse"])
            out.append("")
            out.append(BODY_OVERRIDE["Horse"])
            out.append("")
            out.append("### Hydra")
            out.append("*Source:* `Expert`  ")
            out.append("")
            out.append(MANUAL_RENDER["Hydra"])
            out.append("")
            out.append(BODY_OVERRIDE["Hydra"])
            out.append("")
            out.append(ART_BY_NAME["Hydra"].strip())
            out.append("")
            out.append("### Insect")
            out.append("")
            out.append("See Beetle, Cave Locust, Insect Swarms, Killer Bee, Robber Fly, Scorpion, and Termite.")
        if entry.name == "Cave Locust":
            out.append("")
            out.append("### Centaur")
            out.append("*Source:* `Expert`  ")
            out.append("")
            out.append(MANUAL_RENDER["Centaur"])
            out.append("")
            out.append(BODY_OVERRIDE["Centaur"])
        if entry.name == "Centipede, Giant":
            out.append("")
            out.append("### Chimera")
            out.append("*Source:* `Expert`  ")
            out.append("")
            out.append(MANUAL_RENDER["Chimera"])
            out.append("")
            out.append(BODY_OVERRIDE["Chimera"])
            out.append("")
            out.append("### Cockatrice")
            out.append("*Source:* `Expert`  ")
            out.append("")
            out.append(MANUAL_RENDER["Cockatrice"])
            out.append("")
            out.append(BODY_OVERRIDE["Cockatrice"])
            out.append("")
            out.append(ART_BY_NAME["Cockatrice"].strip())
            out.append("")
            out.append("### Crab, Giant")
            out.append("*Source:* `Expert`  ")
            out.append("")
            out.append(MANUAL_RENDER["Crab, Giant"])
            out.append("")
            out.append(BODY_OVERRIDE["Crab, Giant"])
            out.append("")
            out.append("### Crocodile")
            out.append("*Source:* `Expert`  ")
            out.append("")
            out.append(MANUAL_RENDER["Crocodile"])
            out.append("")
            out.append(BODY_OVERRIDE["Crocodile"])
            out.append("")
            out.append("### Cyclops")
            out.append("*Source:* `Expert`  ")
            out.append("")
            out.append(MANUAL_RENDER["Cyclops"])
            out.append("")
            out.append(BODY_OVERRIDE["Cyclops"])
            out.append("")
            out.append("### Devil Swine")
            out.append("*Source:* `Expert`  ")
            out.append("")
            out.append(MANUAL_RENDER["Devil Swine"])
            out.append("")
            out.append(BODY_OVERRIDE["Devil Swine"])
            out.append("")
            out.append("### Displacer Beast")
            out.append("*Source:* `Expert`  ")
            out.append("")
            out.append(MANUAL_RENDER["Displacer Beast"])
            out.append("")
            out.append(BODY_OVERRIDE["Displacer Beast"])
            out.append("")
            out.append("### Djinni (Lesser)")
            out.append("*Source:* `Expert`  ")
            out.append("")
            out.append(MANUAL_RENDER["Djinni (Lesser)"])
            out.append("")
            out.append(BODY_OVERRIDE["Djinni (Lesser)"])
        if entry.name == "Efreeti (Lesser)":
            out.append("")
            out.append("### Elemental")
            out.append("*Source:* `Expert`  ")
            out.append("")
            out.append(MANUAL_RENDER["Elemental"])
            out.append("")
            out.append(BODY_OVERRIDE["Elemental"])
            out.append("")
            out.append("### Elephant")
            out.append("*Source:* `Expert`  ")
            out.append("")
            out.append(MANUAL_RENDER["Elephant"])
            out.append("")
            out.append(BODY_OVERRIDE["Elephant"])
        if entry.name == "Ferret, Giant":
            out.append("")
            out.append("### Fish, Giant")
            out.append("*Source:* `Expert`  ")
            out.append("")
            out.append(MANUAL_RENDER["Fish, Giant"])
            out.append("")
            out.append(BODY_OVERRIDE["Fish, Giant"])
        if entry.name == "Giant" and entry.name in ART_BY_NAME:
            out.append("")
            out.append(ART_BY_NAME[entry.name].strip())
        if entry.name == "Goblin":
            out.append("")
            out.append("### Golem")
            out.append("*Source:* `Expert`  ")
            out.append("")
            out.append(MANUAL_RENDER["Golem"])
            out.append("")
            out.append(BODY_OVERRIDE["Golem"])
        if entry.name == "Green Slime":
            out.append("")
            out.append("### Griffon")
            out.append("*Source:* `Expert`  ")
            out.append("")
            out.append(MANUAL_RENDER["Griffon"])
            out.append("")
            out.append(BODY_OVERRIDE["Griffon"])
        if entry.name == "Hawk":
            out.append("")
            out.append("### Hellhound")
            out.append("*Source:* `Expert`  ")
            out.append("")
            out.append(MANUAL_RENDER["Hellhound"])
            out.append("")
            out.append(BODY_OVERRIDE["Hellhound"])
        if entry.name == "Hippogriff":
            pass
        if entry.name == "Insect Swarms":
            out.append("")
            out.append("### Invisible Stalker")
            out.append("*Source:* `Expert`  ")
            out.append("")
            out.append(MANUAL_RENDER["Invisible Stalker"])
            out.append("")
            out.append(BODY_OVERRIDE["Invisible Stalker"])
        if entry.name == "Kobold":
            out.append("")
            out.append("### Leech, Giant")
            out.append("*Source:* `Expert`  ")
            out.append("")
            out.append(MANUAL_RENDER["Leech, Giant"])
            out.append("")
            out.append(BODY_OVERRIDE["Leech, Giant"])
        if entry.name == "Pixie":
            out.append("")
            out.append("### Prehistorical animal")
            out.append("")
            out.append("See Mastodon, Pterodactyl, Stegosaurus, Titanothere, Triceratops, and Tyrannosaurus Rex.")
        if entry.name == "Triceratops":
            out.append("")
            out.append("### Troglodyte")
            out.append("*Source:* `Basic`  ")
            out.append("")
            out.append(MANUAL_RENDER["Troglodyte"])
            out.append("")
            out.append(BODY_OVERRIDE["Troglodyte"])
            out.append("")
            out.append(ART_BY_NAME["Troglodyte"].strip())
        if entry.name == "Tyrannosaurus Rex":
            out.append("")
            out.append("### Undead")
            out.append("")
            out.append("See Skeleton, Zombie, Ghoul, Wight, Wraith, Mummy, Spectre, and Vampire.")
            out.append("")
            out.append("Undead are evil creatures created through dark magic. They are unaffected by things that affect living creatures, such as poison, and are not affected by spells which influence the mind, such as sleep and charm person. They do not make noise.")
        if entry.name == "Vampire":
            out.append("")
            out.append("### Veteran")
            out.append("*Source:* `Basic`  ")
            out.append("")
            out.append(MANUAL_RENDER["Veteran"])
            out.append("")
            out.append(BODY_OVERRIDE["Veteran"])
        if entry.name == "Weasel, Giant":
            out.append("")
            out.append("### Were-creature")
            out.append("")
            out.append("See Lycanthropes.")
        if entry.name == "Whale":
            out.append("")
            out.append("### Wight")
            out.append("*Source:* `Basic`  ")
            out.append("")
            out.append(MANUAL_RENDER["Wight"])
            out.append("")
            out.append(BODY_OVERRIDE["Wight"])
            out.append("")
            out.append("### Wolf")
            out.append("*Source:* `Basic`  ")
            out.append("")
            out.append(MANUAL_RENDER["Wolf"])
            out.append("")
            out.append(BODY_OVERRIDE["Wolf"])
        if entry.name == "Wyvern":
            out.append("")
            out.append("### Yellow Mold")
            out.append("*Source:* `Basic`  ")
            out.append("")
            out.append(MANUAL_RENDER["Yellow Mold"])
            out.append("")
            out.append(BODY_OVERRIDE["Yellow Mold"])
            out.append("")
            out.append("### Zombie")
            out.append("*Source:* `Basic`  ")
            out.append("")
            out.append(MANUAL_RENDER["Zombie"])
            out.append("")
            out.append(BODY_OVERRIDE["Zombie"])
        if entry.name == "Lizard Man":
            out.append("")
            out.append("### Lizards, Giant")
            out.append("*Source:* `Basic`  ")
            out.append("")
            out.append(MANUAL_RENDER["Lizards, Giant"])
            out.append("")
            out.append(BODY_OVERRIDE["Lizards, Giant"])
            out.append("")
            out.append(ART_BY_NAME["Lizards, Giant"].strip())
        if entry.name == "Dragon":
            out.append("")
            out.append("### Dragon Turtle")
            out.append("*Source:* `Expert`  ")
            out.append("")
            out.append(MANUAL_RENDER["Dragon Turtle"])
            out.append("")
            out.append(BODY_OVERRIDE["Dragon Turtle"])
        if entry.name == "Ant, Driver":
            out.append("")
            out.append("### Dryad")
            out.append("*Source:* `Expert`  ")
            out.append("")
            out.append(MANUAL_RENDER["Dryad"])
            out.append("")
            out.append(BODY_OVERRIDE["Dryad"])
        if entry.name == "Lycanthropes":
            out.append("")
            out.append("### Manticore")
            out.append("*Source:* `Expert`  ")
            out.append("")
            out.append(MANUAL_RENDER["Manticore"])
            out.append("")
            out.append(BODY_OVERRIDE["Manticore"])
            out.append("")
            out.append("### Mastodon")
            out.append("*Source:* `Expert`  ")
            out.append("")
            out.append(MANUAL_RENDER["Mastodon"])
            out.append("")
            out.append(BODY_OVERRIDE["Mastodon"])
        out.append("")

    return "\n".join(out).rstrip() + "\n"


def main() -> None:
    basic_text = load_text("basic-monsters-layout.txt")
    expert_text = load_text("expert-monsters-layout.txt")
    expert_raw_text = load_text("expert-monsters-raw.txt")
    entries = split_entries(basic_text, BASIC_ORDER, "Basic")
    expert_entries = {entry.name: entry for entry in split_entries(expert_text, EXPERT_ORDER, "Expert")}
    for entry in split_entries(expert_raw_text, EXPERT_ORDER, "Expert"):
        expert_entries.setdefault(entry.name, entry)
    entries.extend(expert_entries.values())
    markdown = build_markdown(entries)
    (ROOT / "combined-monsters.md").write_text(markdown)


if __name__ == "__main__":
    main()
