---
title: Rune Synergy
subtitle: Devblog 1
date: '14 January 2023'
publish: true
icon: /images/rune-synergy.png
---
<script>
import Image from '$lib/components/Image.svelte';
</script>

I’ve finally gotten a dedicated space to work in, and I’ve been using it. This
past week I’ve put in nearly 9-10 hours a day planning and strategizing what I’m
going to do for Rune Synergy. I’ve decided to stick with the Go backend (server)
and frontend (client).

# Audio Synthesizer

The client I’m rewriting has its own audio synthesizer and format for sound
effects. It’s a great idea since raw waveforms can be pretty large in size. The
space savings are pretty insane honestly. The sounds.dat file is roughly 929,467
bytes and when all the sounds are rendered out as 16bit mono waveforms that size
becomes 131 MB (138,060,534 bytes). That’s like 148x more bytes.

<div class="row gap-1">
<div class="col gap-1">Packed<Image src="/posts/devblog-1/sounds.dat.png"/></div>
<div class="col gap-1">Synthesized<Image src="/posts/devblog-1/sounds.folder.png"/></div>
</div>

I don’t plan on rendering out the sound effects and shipping them though.
Instead I’d like to recreate the tool used to create them. There is an inhouse
tool used by Jagex called JagFX.

<div class="col gap-1 center">
<Image src="/posts/devblog-1/jagfx-1.png"/>
<span>A screenshot of JagFX as shown by <a href="https://twitter.com/JagexIanT/status/920674521304260609" target="_blank">@JagexIanT</a></span>
</div>

Some information is not present in any of the sounds, such as the gap on/off
curves and loop count. 

<div class="row gap-1">

<div class="col">

Here's the data for the screenshot. Oddly enough there is an inconsistency between this data and the screenshot. The
data has a length of 900 as opposed to 1200. I’m not sure if this is
due to some post-processing or something. I looked at the waveform in Audacity
to compare it to their preview and it’s *basically* identical.

</div>

<div class="col">

```json
{
  "id": 3,
  "tones": {
    "0": {
      "length": 900,
      "reverb_volume": 100,
      "harmonics": [
        {
          "volume": 100
        },
        {
          "volume": 60,
          "semitone": 133
        }
      ],
      "freq_base": {
        "form": "sine",
        "start": 30,
        "end": 300,
        "peaks": [
          {
            "x": 0,
            "y": 0
          },
          {
            "x": 5566,
            "y": 22283
          },
          {
            "x": 22982,
            "y": 46662
          },
          {
            "x": 35012,
            "y": 18613
          },
          {
            "x": 65535,
            "y": 0
          }
        ]
      },
      "freq_mod_rate": {
        "form": "square",
        "end": 150,
        "peaks": [
          {
            "x": 0,
            "y": 32244
          },
          {
            "x": 65535,
            "y": 31720
          }
        ]
      },
      "freq_mod_range": {
        "form": "default",
        "end": 100,
        "peaks": [
          {
            "x": 0,
            "y": 1573
          },
          {
            "x": 13286,
            "y": 19923
          },
          {
            "x": 65535,
            "y": 65535
          }
        ]
      },
      "amp_base": {
        "form": "default",
        "end": 100,
        "peaks": [
          {
            "x": 0,
            "y": 31720
          },
          {
            "x": 12029,
            "y": 46400
          },
          {
            "x": 36089,
            "y": 33817
          },
          {
            "x": 49017,
            "y": 10224
          },
          {
            "x": 65535,
            "y": 0
          }
        ]
      }
    }
  }
}
```

</div>

</div>

<Image src="/posts/devblog-1/audacity.png" alt="cow_death in Audacity" class="rounded"/>

<audio controls src="/posts/devblog-1/cow_death.wav"/>

Another inconsistency is that there are two sounds that use a fifth tone type.
In the screenshots of JagFX above you can see there are only four. I googled
“basic waveform types” and came to the conclusion that Triangle was the only one
missing while looking at this wiki. They’re present in the freq_mod_rate curve
for the verac_stab sound, but unfortunately are not utilized. They were probably
scrapped because they just sound like crusty sine waves. Here is a 220Hz sine
wave and a triangle wave:

<audio controls src="/posts/devblog-1/sine-triangle.wav"/>

# Data

For now the datasets I'm compiling are stored in JSON as an intermediary until I
find a proper solution for my target capabilities. All of the data is based on
what is found in the original game cache, combined with [OSRS](http://osrsbox.com/) data to fill in
the gaps.

I plan on configurations being a first-class citizen in the development
environment for Rune Synergy, which should hopefully supply auto-completion to
ensure correctness and provide a root to stem interactions and in-game scripts
off of.

Here are some samples of each dataset:

<details>
<summary>identikits.json</summary>

I sourced the names from the OSRS wiki manually.

```json
{
  "kind": "male_hair",
  "kits": [
    {
      "id": 0,
      "name": "bald",
      "model": {
        "id": 230
      },
      "chat_model": {
        "id": 63
      }
    },
    {
      "id": 1,
      "name": "dreadlocks",
      "model": {
        "id": 210
      },
      "chat_model": {
        "id": 49
      }
    },
    {
      "id": 2,
      "name": "long",
      "model": {
        "id": 214
      },
      "chat_model": {
        "id": 52
      }
    },
    {
      "id": 3,
      "name": "medium",
      "model": {
        "id": 217
      },
      "chat_model": {
        "id": 55
      }
    },
    {
      "id": 4,
      "name": "tonsure",
      "model": {
        "id": 223
      },
      "chat_model": {
        "id": 59
      }
    },
    {
      "id": 5,
      "name": "short",
      "model": {
        "id": 215
      },
      "chat_model": {
        "id": 53
      }
    },
    {
      "id": 6,
      "name": "cropped",
      "model": {
        "id": 235
      },
      "chat_model": {
        "id": 67
      }
    },
    {
      "id": 7,
      "name": "wild_spikes",
      "model": {
        "id": 206
      },
      "chat_model": {
        "id": 46
      }
    },
    {
      "id": 8,
      "name": "spikes",
      "model": {
        "id": 203
      },
      "chat_model": {
        "id": 45
      }
    },
    {
      "id": 9,
      "name": "spikes_unused",
      "unselectable": true,
      "model": {
        "id": 203
      },
      "chat_model": {
        "id": 45
      }
    }
  ]
}
```
</details>

<details>
<summary>items.json</summary>

```json
{
  "id": 4151,
  "internal_name": "abyssal_whip",
  "name": "Abyssal whip",
  "examine": "A weapon from the abyss.",
  "linked": 4152,
  "members": true,
  "tradeable": true,
  "noteable": true,
  "cost": 100000,
  "weight": 0.453,
  "inventory_options": {
    "1": "Wield"
  },
  "equipment": {
    "slot": "rhand",
    "weapon_speed": 4,
    "weapon_category": "whip",
    "bonuses": {
      "attack": {
        "slash": 82
      },
      "melee_strength": 82
    },
    "requirements": {
      "attack": 70
    }
  },
  "model": {
    "id": 5412
  },
  "male_worn_model": {
    "id": 5409
  },
  "female_worn_model": {
    "id": 5409,
    "translate_y": 6
  },
  "icon": {
    "zoom": 840,
    "pitch": 280,
    "offset_x": -2,
    "offset_y": 56
  }
},
{
  "id": 4152,
  "internal_name": "noted_abyssal_whip",
  "linked": 4151,
  "certificate": 799
}
```
</details>

<details>
<summary>objects.json</summary>

```json
{
  "id": 6310,
  "internal_name": "black_mushrooms1",
  "name": "black mushrooms",
  "examine": "not good for eating.",
  "options": {
    "0": "pick"
  },
  "size_x": 4,
  "size_z": 2,
  "model": {
    "id": 6160,
    "recolors": [
      {
        "src": 6261,
        "dst": 10442
      },
      {
        "src": 5351,
        "dst": 10553
      }
    ]
  },
  "varbit": 346,
  "overrides": [
    6363,
    6363,
    6363,
    6363,
    6363,
    6364,
    6364,
    6364,
    6364,
    6364
  ],
  "interactable": true
}
```
</details>

<details>
<summary>interfaces.json</summary>

```json
{
  "id": 668,
  "parent_id": 638,
  "kind": "text",
  "op": "Recruitment Drive",
  "op_type": "ok",
  "width": 100,
  "height": 14,
  "shadowed": true,
  "font": 1,
  "text": "Recruitment Drive",
  "color": 16711680,
  "hover_color": 16777215
},
{
  "id": 669,
  "parent_id": 6575,
  "kind": "text",
  "op": "Toggle option",
  "op_type": "ok",
  "width": 74,
  "height": 14,
  "hover_delegate": 8277,
  "shadowed": true,
  "font": 1,
  "text": "Fun Weapons",
  "color": 11175970
},
{
  "id": 670,
  "parent_id": 6575,
  "kind": "image",
  "op": "Toggle option",
  "op_type": "ok",
  "width": 14,
  "height": 15,
  "hover_delegate": 8277,
  "image": "miscgraphics,10",
  "active_image": "miscgraphics,11",
  "scripts": [
    {
      "comparator": 1,
      "operand": 1,
      "code": [
        13,
        286,
        12,
        0
      ]
    }
  ]
}
```
</details>

<details>
<summary>npcs.json</summary>

```json
{
  "id": 50,
  "name": "King black dragon",
  "internal_name": "king_black_dragon",
  "examine": "The biggest, meanest dragon around.",
  "options": {
    "1": "Attack"
  },
  "category": [
    "black dragons",
    "bosses"
  ],
  "attributes": [
    "dragon",
    "fiery"
  ],
  "size": 5,
  "members": true,
  "combat": {
    "level": 276,
    "hitpoints": 240,
    "attack_level": 240,
    "strength_level": 240,
    "defense_level": 240,
    "ranged_level": 1,
    "magic_level": 240,
    "attack_type": [
      "stab",
      "dragonfire"
    ],
    "attack_rate": 4,
    "aggressive": true,
    "poisonous": true,
    "max_hit": 25,
    "defence_stab": 70,
    "defence_slash": 90,
    "defence_crush": 90,
    "defence_magic": 80,
    "defence_ranged": 70,
    "slayer_monster": true,
    "slayer_level": 1,
    "slayer_xp": 258,
    "slayer_masters": [
      "konar",
      "nieve",
      "duradel"
    ]
  },
  "model": {
    "join": [
      2853,
      2855
    ],
    "scale_x": 160,
    "scale_y": 160,
    "scale_z": 160,
    "recolors": [
      {
        "src": 61,
        "dst": 11140
      },
      {
        "src": 41,
        "dst": 11138
      },
      {
        "src": 0,
        "dst": 937
      },
      {
        "src": 115,
        "dst": 7853
      },
      {
        "src": 127,
        "dst": 7853
      }
    ]
  },
  "sequences": {
    "idle": 90,
    "move": 79
  }
}
```
</details>

<details>
<summary>variables.json</summary>

```json
{
  "name": "barrows",
  "vars": [
    {
      "slot": 452,
      "transmit": true,
      "bits": [
        {
          "name": "ladder_a",
          "bits": 1,
          "offset": 6
        },
        {
          "name": "ladder_c",
          "bits": 1,
          "offset": 7
        },
        {
          "name": "ladder_g",
          "bits": 1,
          "offset": 8
        },
        {
          "name": "ladder_i",
          "bits": 1,
          "offset": 9
        },
        {
          "name": "door_a",
          "bits": 1,
          "offset": 10
        },
        {
          "name": "door_b",
          "bits": 1,
          "offset": 11
        },
        {
          "name": "door_c",
          "bits": 1,
          "offset": 12
        },
        {
          "name": "door_d",
          "bits": 1,
          "offset": 13
        },
        {
          "name": "door_e",
          "bits": 1,
          "offset": 14
        },
        {
          "name": "door_f",
          "bits": 1,
          "offset": 15
        },
        {
          "name": "door_g",
          "bits": 1,
          "offset": 16
        },
        {
          "name": "door_h",
          "bits": 1,
          "offset": 17
        },
        {
          "name": "door_i",
          "bits": 1,
          "offset": 18
        },
        {
          "name": "door_j",
          "bits": 1,
          "offset": 19
        },
        {
          "name": "door_k",
          "bits": 1,
          "offset": 20
        },
        {
          "name": "door_l",
          "bits": 1,
          "offset": 21
        },
        {
          "name": "door_m",
          "bits": 1,
          "offset": 22
        },
        {
          "name": "door_n",
          "bits": 1,
          "offset": 23
        },
        {
          "name": "door_o",
          "bits": 1,
          "offset": 24
        },
        {
          "name": "door_p",
          "bits": 1,
          "offset": 25
        },
        {
          "name": "",
          "bits": 3,
          "offset": 29
        }
      ]
    }
  ]
}
```
</details>

# What's next?

After I finish breaking all the data down into a human-readable format and
further completing the data using external sources, I should have a good idea of
how I’ll want to organize said data into the Rune Synergy scripting language. I
want data and code to coexist so that it’s easier to relate data later on… More
on that later.

I’ve mentioned a scripting language but I haven’t specified which. I considered
the following languages:
- [Lua](https://lua.org/)
- [Wren](https://wren.io/)
- [Anko](https://github.com/mattn/anko)
- [Tengo](https://tengolang.com/)
- JavaScript


One of my biggest issues is that I’d like to have the game client also work
as an Integrated Development Environment ([IDE](https://en.wikipedia.org/wiki/Integrated_development_environment))
and respond in real-time to script and configuration changes. The goal is
to make development fun, easy, and fast. Since the backend (server) will be
actually running the scripts and the frontend (client) will be reading/writing
the scripts, I need to establish some communication between the two that can
facilitate that.

It might be easier just to allow the game client to open a desired text editor
whether it be VSCode or Vim or whatever else, and then have a Language Server on
both the client and game server working together.

I might just have to write my own interpreter and go down the rabbit hole…
Luckily I’ve already been experimenting with that idea exactly with something I
call Norskript.

To be continued…