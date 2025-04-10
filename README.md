# Laby bot
This is a fork of Ropeybot (https://github.com/FriendsOfBC/ropeybot)

Additions/modifications :
- Loggers
- Labyrinth type game
- Trigger management for map games (walk on zones od coordinates)
- Resource management, to get game data from a file (ex : maps, bot description and position, triggers list)
- Bot management, to restart bot, or game without restarting the whole thing
- Administration client for a more visual aproach to the bot data and game status
- Modifications to some core files for easier use in games


Original features :

A node-based BC bot based on the old bot-api. Its functionality is divided up into
'games' and you configure the bot to run one of them via its config file.

Most code here is free to use (Apache licensed) but some is taken with
permission from the original bot hub (eg. kidnappers game, roleplay challenge).

We hope that this will be useful for people to make fun and interesting bots
for the club! You're also welcome to run the bots included yourself.

To make a new game, you can copy the 'petspa' game file and use that as a base, and add
your new file into bot.ts.

Usual club ettiquette applies, eg:
 * Make sure people know your bot is a bot, not a real player
 * Make sure people consent before your bot binds them / changes their clothing etc.
 * Watch how many messages your bot sends. Even if it stays under the ratelimit, constantly
   sending messages will affect the server.
 * Make bots fun / interesting / useful, rather than to just sit in rooms.

## Code layout

Anything in src/hub is from the original bot hub. This includes the 'kidnappers' game and the
roleplay challenge bot. These are copied in as they were, but with additions since.

Things in src/games use a newer, more event-based API. If you write new bots, they should
probably look like the ones in here.

Some things are unfinished and imperfect, but there should be enough here to make working and
fun bots! Improvements and fixes are always welcome.

## Running

The bot can either be run locally or via the Docker image.

### Running Locally
 * Get an environment with NodeJS, pnpm (https://pnpm.io/installation) and git
 * Check out the bot's code
   `git clone https://github.com/FriendsOfBC/ropeybot.git`
 * Copy `config.sample.json` to `config.json` and customise it: you'll need to provide
   at least a username and password for an account that the bot can log in as. You can
   also choose what game the bot will run.
 * Enter the directory and install the dependencies:
   `cd ropeybot`
   `pnpm install`
 * Start the bot!
   `pnpm start`

### Running with Docker (Laby bot tested with Docker Desktop)
 * Install docker
 * Create a config file as in the steps for running locally
 * Build your container (the dockerfile build it and then run it on a lighter Alpine image)
  docker build -t labybot:0.0.6 .

* Run the bot 
    + setup in  in the config file you just made
    + the resources (for Laby) and the save volume (for Laby Hall of Fame)
    + the port for the React Administration Web page
+ Using the docker image through a command line:

  docker run --rm -it -v %cd%\config.json:/bot/config.json -v %cd%\resources:/bot/resources -v labybot_data:/bot/save -p 3000:3000 labybot:0.0.6

+ Or using the docker-compose file (check the config file name according to yours):
  docker compose up


## Games (Added on Laby bot)
This bot version gets some new games, based on Pet Spa.
In brackets is the value to use for 'game' in the config file to run that game.

### Home ('home')
This is a small home, with different ways of using triggers. Try to *push* the candelabra
in the bedroom, and maybe avoid the bondage devices.

### Laby ('laby')
This is a labyrinth kind of game, whith an entry and an exit, and different mechanisms that
can be triggered according to yous resource file configuration.


## Games (Originals)
The bot comes with some built games.
In brackets is the value to use for 'game' in the config file to run that game.

### Dare Game ('dare')
A very simple game where players add dares and then draw them without knowing who added
each dare.
The dares added by players are stored in two files in the bot's working directory:
dares.json and unuseddares.json: delete both of these files to reset the dares.

### Pet Spa ('petspa')
This is an example of how to use the API to make an interactive map room, but also
applies to non map rooms. You can use this file as a base for things like how to react
when players enter areas on a map, adding restraints and setting their properties, sending
and reacting to messages.

### Kidnappers ('kidnappers')
From the original bot hub. Code is mostly unmodified from its original state.

### Roleplay challenge ('roleplay')
Also from the original bot hub.

### Maid's Party Night ('maidspartynight')
Also from the original bot hub, a single player adventure. Needs a second bot account
(user2 and password2 in the config). Probably buggy!

