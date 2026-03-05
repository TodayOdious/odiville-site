/**
 * Unified artwork registry for Odiville.
 * Powers the archive page, chapter galleries, and any future display surface.
 *
 * Fields:
 *   id          – unique slug
 *   name        – display name
 *   project     – 'duu' | 'whispers' | 'owt'
 *   projectName – human-readable project label
 *   chapter     – phase/chapter label, or null
 *   type        – 'artwork' | 'lot' | 'resident'
 *   src         – full-resolution asset path (gif/png/mp4)
 *   tags        – searchable tags array
 *   tokenId     – on-chain token ID (number), or null
 *   contract    – contract name ('DUU' | 'Tickets' | 'Key'), or null
 *   shadeCost   – shade cost value, or null for N/A
 *   shadeValue  – shade value, or null for N/A
 */
window.ARTWORK_REGISTRY = [

  /* ============================================================
     THE BOOK — DUU (Don't Underestimate Us)
     10 Phases / Chapters
  ============================================================ */

  // Phase I — The Arrival
  { id: 'duu-c1-the-arrival',            name: 'The Arrival',              project: 'duu', projectName: 'The Book', chapter: 'Phase I',    type: 'artwork', src: 'images/Book/Chapter 1/The-Arrival-Jitter_v3_resized.gif',                         tags: ['animated', 'phase-i'],   tokenId: 0,  contract: 'DUU',     shadeCost: null, shadeValue: null },

  // Phase II — Meet The Puppets
  { id: 'duu-c2-ticket-booth',           name: 'Ticket Booth',             project: 'duu', projectName: 'The Book', chapter: 'Phase II',   type: 'artwork', src: 'images/Book/Chapter 2/Ticket-Booth-Jitter_v3.gif',                                    tags: ['animated', 'phase-ii'],  tokenId: 1,  contract: 'DUU',     shadeCost: 1,    shadeValue: 1    },
  { id: 'duu-c2-blend-in',               name: 'Blend In',                 project: 'duu', projectName: 'The Book', chapter: 'Phase II',   type: 'artwork', src: 'images/Book/Chapter 2/Blend-In-Jitter.gif',                                          tags: ['animated', 'phase-ii'],  tokenId: 2,  contract: 'DUU',     shadeCost: 1,    shadeValue: 1    },
  { id: 'duu-c2-ticket',                 name: 'Ticket',                   project: 'duu', projectName: 'The Book', chapter: 'Phase II',   type: 'artwork', src: 'images/Book/Chapter 2/ticket.png',                                                   tags: ['phase-ii'],              tokenId: 3,  contract: 'Tickets', shadeCost: null, shadeValue: 1    },
  { id: 'duu-c2-the-apprentice',         name: 'The Apprentice',           project: 'duu', projectName: 'The Book', chapter: 'Phase II',   type: 'artwork', src: 'images/Book/Chapter 2/the-apprentice.png',                                           tags: ['phase-ii'],              tokenId: 4,  contract: 'DUU',     shadeCost: null, shadeValue: null },
  { id: 'duu-c2-meet-the-puppets',       name: 'Meet The Puppets',         project: 'duu', projectName: 'The Book', chapter: 'Phase II',   type: 'artwork', src: 'images/Book/Chapter 2/Meet-The-Puppets.gif',                                          tags: ['animated', 'phase-ii'],  tokenId: 5,  contract: 'DUU',     shadeCost: 1,    shadeValue: 1    },
  { id: 'duu-c2-the-invite',             name: 'The Invite',               project: 'duu', projectName: 'The Book', chapter: 'Phase II',   type: 'artwork', src: 'images/Book/Chapter 2/the invite.png',                                              tags: ['phase-ii'],              tokenId: 53, contract: 'DUU',     shadeCost: null, shadeValue: null },
  { id: 'duu-c2-inescapable-end',        name: 'Inescapable End',          project: 'duu', projectName: 'The Book', chapter: 'Phase II',   type: 'artwork', src: 'images/Book/Chapter 2/inescapable-end.png',                                          tags: ['phase-ii'],              tokenId: 52, contract: 'DUU',     shadeCost: 1,    shadeValue: 1    },

  // Phase III — Whispering Winds
  { id: 'duu-c3-four-horsemen',          name: 'Four Horsemen',            project: 'duu', projectName: 'The Book', chapter: 'Phase III',  type: 'artwork', src: 'images/Book/Chapter 3/Four-Horsemen-Jitter.gif',                                       tags: ['animated', 'phase-iii'], tokenId: 6,  contract: 'DUU',     shadeCost: 2,    shadeValue: 2    },
  { id: 'duu-c3-pink-balloon',           name: 'Pink Balloon',             project: 'duu', projectName: 'The Book', chapter: 'Phase III',  type: 'artwork', src: 'images/Book/Chapter 3/Pink_Balloon.png',                                              tags: ['phase-iii'],             tokenId: 7,  contract: 'DUU',     shadeCost: 1,    shadeValue: 2    },
  { id: 'duu-c3-blue-balloon',           name: 'Blue Balloon',             project: 'duu', projectName: 'The Book', chapter: 'Phase III',  type: 'artwork', src: 'images/Book/Chapter 3/Blue_Balloon.png',                                              tags: ['phase-iii'],             tokenId: 8,  contract: 'DUU',     shadeCost: 1,    shadeValue: 2    },
  { id: 'duu-c3-green-balloon',          name: 'Green Balloon',            project: 'duu', projectName: 'The Book', chapter: 'Phase III',  type: 'artwork', src: 'images/Book/Chapter 3/Green_Balloon.png',                                             tags: ['phase-iii'],             tokenId: 9,  contract: 'DUU',     shadeCost: 1,    shadeValue: 2    },
  { id: 'duu-c3-cyclone',                name: 'Cyclone',                  project: 'duu', projectName: 'The Book', chapter: 'Phase III',  type: 'artwork', src: 'images/Book/Chapter 3/cyclone.png',                                                   tags: ['phase-iii'],             tokenId: 10, contract: 'DUU',     shadeCost: 2,    shadeValue: 2    },
  { id: 'duu-c3-play-to-learn',          name: 'Play to Learn',            project: 'duu', projectName: 'The Book', chapter: 'Phase III',  type: 'artwork', src: 'images/Book/Chapter 3/play-to-learn.png',                                             tags: ['phase-iii'],             tokenId: 11, contract: 'DUU',     shadeCost: 1,    shadeValue: 0.1  },
  { id: 'duu-c3-the-rose-petal-garden',  name: 'The Rose Petal Garden',    project: 'duu', projectName: 'The Book', chapter: 'Phase III',  type: 'artwork', src: 'images/Book/Chapter 3/The Rose Petal Garden.gif',                                      tags: ['animated', 'phase-iii'], tokenId: 12, contract: 'DUU',     shadeCost: 2,    shadeValue: 2    },
  { id: 'duu-c3-the-verdant-veil',       name: 'The Verdant Veil',         project: 'duu', projectName: 'The Book', chapter: 'Phase III',  type: 'artwork', src: 'images/Book/Chapter 3/The Verdant Veil.gif',                                           tags: ['animated', 'phase-iii'], tokenId: 13, contract: 'DUU',     shadeCost: 2,    shadeValue: 2    },
  { id: 'duu-c3-the-lost-lagoon',        name: 'The Lost Lagoon',          project: 'duu', projectName: 'The Book', chapter: 'Phase III',  type: 'artwork', src: 'images/Book/Chapter 3/The Lost Lagoon.gif',                                            tags: ['animated', 'phase-iii'], tokenId: 14, contract: 'DUU',     shadeCost: 2,    shadeValue: 2    },
  { id: 'duu-c3-the-abyssal-void',       name: 'The Abyssal Void',         project: 'duu', projectName: 'The Book', chapter: 'Phase III',  type: 'artwork', src: 'images/Book/Chapter 3/The Abyssal Void.gif',                                           tags: ['animated', 'phase-iii'], tokenId: 15, contract: 'DUU',     shadeCost: 2,    shadeValue: 2    },
  { id: 'duu-c3-redemption',             name: 'Redemption',               project: 'duu', projectName: 'The Book', chapter: 'Phase III',  type: 'artwork', src: 'images/Book/Chapter 3/Copy of Redemption-Event-Jitter.gif',                            tags: ['animated', 'phase-iii'], tokenId: 16, contract: 'DUU',     shadeCost: 2,    shadeValue: 2    },
  { id: 'duu-c3-blue-reverie',           name: 'Blue Reverie',             project: 'duu', projectName: 'The Book', chapter: 'Phase III',  type: 'artwork', src: 'images/Book/Chapter 3/Blue Reverie.png',                                              tags: ['phase-iii'],             tokenId: 17, contract: 'DUU',     shadeCost: null, shadeValue: null },
  { id: 'duu-c3-hush',                   name: 'Hush',                     project: 'duu', projectName: 'The Book', chapter: 'Phase III',  type: 'artwork', src: 'images/Book/Chapter 3/Copy of Hush_v2.png',                                            tags: ['phase-iii'],             tokenId: 18, contract: 'DUU',     shadeCost: 2,    shadeValue: 2    },
  { id: 'duu-c3-play-to-burn',           name: 'Play to Burn',             project: 'duu', projectName: 'The Book', chapter: 'Phase III',  type: 'artwork', src: 'images/Book/Chapter 3/play-to-burn.png',                                              tags: ['phase-iii'],             tokenId: 19, contract: 'DUU',     shadeCost: null, shadeValue: null },

  // Phase IV — Tread Lightly
  { id: 'duu-c4-whispers-in-the-glade',  name: 'Whispers in the Glade',    project: 'duu', projectName: 'The Book', chapter: 'Phase IV',   type: 'artwork', src: 'images/Book/Chapter 4/whispers in the glade v2.png',                                  tags: ['phase-iv'],              tokenId: 20, contract: 'DUU',     shadeCost: 4,    shadeValue: 6    },
  { id: 'duu-c4-map-of-the-glade',       name: 'Map of The Glade',         project: 'duu', projectName: 'The Book', chapter: 'Phase IV',   type: 'artwork', src: 'images/Book/Chapter 4/Map of The Glade.png',                                          tags: ['phase-iv'],              tokenId: 21, contract: 'DUU',     shadeCost: 6,    shadeValue: 6    },
  { id: 'duu-c4-barn',                   name: 'Barn',                     project: 'duu', projectName: 'The Book', chapter: 'Phase IV',   type: 'artwork', src: 'images/Book/Chapter 4/Barn.png',                                                     tags: ['phase-iv'],              tokenId: 22, contract: 'DUU',     shadeCost: 12,   shadeValue: 12   },
  { id: 'duu-c4-carnival',               name: 'Carnival',                 project: 'duu', projectName: 'The Book', chapter: 'Phase IV',   type: 'artwork', src: 'images/Book/Chapter 4/Carnival.png',                                                 tags: ['phase-iv'],              tokenId: 23, contract: 'DUU',     shadeCost: 12,   shadeValue: 16   },
  { id: 'duu-c4-forest',                 name: 'Forest',                   project: 'duu', projectName: 'The Book', chapter: 'Phase IV',   type: 'artwork', src: 'images/Book/Chapter 4/Forest.png',                                                   tags: ['phase-iv'],              tokenId: 24, contract: 'DUU',     shadeCost: 12,   shadeValue: 16   },
  { id: 'duu-c4-uninvited',              name: 'Uninvited',                project: 'duu', projectName: 'The Book', chapter: 'Phase IV',   type: 'artwork', src: 'images/Book/Chapter 4/Unwanted_Guest v2.png',                                         tags: ['phase-iv'],              tokenId: 25, contract: 'DUU',     shadeCost: 16,   shadeValue: 0    },
  { id: 'duu-c4-a-gift',                 name: 'A Gift',                   project: 'duu', projectName: 'The Book', chapter: 'Phase IV',   type: 'artwork', src: 'images/Book/Chapter 4/a-gift-v4.gif',                                                tags: ['animated', 'phase-iv'],  tokenId: 26, contract: 'DUU',     shadeCost: 16,   shadeValue: null },
  { id: 'duu-c4-no-air',                 name: 'No Air',                   project: 'duu', projectName: 'The Book', chapter: 'Phase IV',   type: 'artwork', src: 'images/Book/Chapter 4/no air.png',                                                   tags: ['phase-iv'],              tokenId: 27, contract: 'DUU',     shadeCost: 16,   shadeValue: 16   },

  // Phase V — A Gift
  { id: 'duu-c5-broken',                 name: 'Broken',                   project: 'duu', projectName: 'The Book', chapter: 'Phase V',    type: 'artwork', src: 'images/Book/Chapter 5/Broken-Shards.png',                                             tags: ['phase-v'],               tokenId: 28, contract: 'DUU',     shadeCost: 16,   shadeValue: 16   },
  { id: 'duu-c5-light-keeper',           name: 'Light Keeper',             project: 'duu', projectName: 'The Book', chapter: 'Phase V',    type: 'artwork', src: 'images/Book/Chapter 5/light-keeper-v3.gif',                                           tags: ['animated', 'phase-v'],   tokenId: 29, contract: 'DUU',     shadeCost: 16,   shadeValue: 16   },
  { id: 'duu-c5-foreboding-tree',        name: 'Foreboding Tree',          project: 'duu', projectName: 'The Book', chapter: 'Phase V',    type: 'artwork', src: 'images/Book/Chapter 5/Forboding Tree.png',                                            tags: ['phase-v'],               tokenId: 30, contract: 'DUU',     shadeCost: 16,   shadeValue: 12   },
  { id: 'duu-c5-wasteland',              name: 'Wasteland',                project: 'duu', projectName: 'The Book', chapter: 'Phase V',    type: 'artwork', src: 'images/Book/Chapter 5/Wasteland_V6_Final_V4.gif',                                      tags: ['animated', 'phase-v'],   tokenId: 31, contract: 'DUU',     shadeCost: 16,   shadeValue: 16   },
  { id: 'duu-c5-the-maw-is-starving',    name: 'The Maw is Starving',      project: 'duu', projectName: 'The Book', chapter: 'Phase V',    type: 'artwork', src: 'images/Book/Chapter 5/the-maw-is-starving-final_small.gif',                            tags: ['animated', 'phase-v'],   tokenId: 32, contract: 'DUU',     shadeCost: 16,   shadeValue: 16   },
  { id: 'duu-c5-mutual-pact',            name: 'Mutual Pact',              project: 'duu', projectName: 'The Book', chapter: 'Phase V',    type: 'artwork', src: 'images/Book/Chapter 5/Mutual Pact_v4.png',                                            tags: ['phase-v'],               tokenId: 33, contract: 'DUU',     shadeCost: 32,   shadeValue: 32   },
  { id: 'duu-c5-marked',                 name: 'Marked',                   project: 'duu', projectName: 'The Book', chapter: 'Phase V',    type: 'artwork', src: 'images/Book/Chapter 5/Marked.png',                                                    tags: ['phase-v'],               tokenId: 34, contract: 'DUU',     shadeCost: 32,   shadeValue: 40   },
  { id: 'duu-c5-stone-tiles',            name: 'Stone Tiles',              project: 'duu', projectName: 'The Book', chapter: 'Phase V',    type: 'artwork', src: 'images/Book/Chapter 5/stone-tiles.gif',                                               tags: ['animated', 'phase-v'],   tokenId: 54, contract: 'DUU',     shadeCost: 16,   shadeValue: 16   },

  // Phase VI — Choice in the Clouds
  { id: 'duu-c6-a-choice-in-the-clouds', name: 'A Choice in the Clouds',   project: 'duu', projectName: 'The Book', chapter: 'Phase VI',   type: 'artwork', src: 'images/Book/Chapter 6/1-1/a choice in the clouds.png',                                tags: ['phase-vi'],              tokenId: 35, contract: 'DUU',     shadeCost: null, shadeValue: null },
  { id: 'duu-c6-key-of-the-collective',  name: 'Key of the Collective',    project: 'duu', projectName: 'The Book', chapter: 'Phase VI',   type: 'artwork', src: 'images/Book/Chapter 6/The Collective/Keys of the Collective.gif',                      tags: ['animated', 'phase-vi'],  tokenId: 36, contract: 'Key',     shadeCost: null, shadeValue: null },
  { id: 'duu-c6-empty',                  name: 'Empty',                    project: 'duu', projectName: 'The Book', chapter: 'Phase VI',   type: 'artwork', src: 'images/Book/Chapter 6/Empty/Empty.png',                                               tags: ['phase-vi'],              tokenId: 37, contract: 'DUU',     shadeCost: null, shadeValue: 0    },
  { id: 'duu-c6-error',                  name: 'Error',                    project: 'duu', projectName: 'The Book', chapter: 'Phase VI',   type: 'artwork', src: 'images/Book/Chapter 6/Error/Ch6_Error.gif',                                           tags: ['animated', 'phase-vi'],  tokenId: 38, contract: 'DUU',     shadeCost: null, shadeValue: 0    },
  { id: 'duu-c6-extract',                name: 'Extract',                  project: 'duu', projectName: 'The Book', chapter: 'Phase VI',   type: 'artwork', src: 'images/Book/Chapter 6/Extract/Ch6_Extract.png',                                       tags: ['phase-vi'],              tokenId: 39, contract: 'DUU',     shadeCost: null, shadeValue: 0    },
  { id: 'duu-c6-etched',                 name: 'Etched',                   project: 'duu', projectName: 'The Book', chapter: 'Phase VI',   type: 'artwork', src: 'images/Book/Chapter 6/The Collective/etched_v9.gif',                                   tags: ['animated', 'phase-vi'],  tokenId: 40, contract: 'DUU',     shadeCost: null, shadeValue: 0    },

  // Phase VII — Crossroads
  { id: 'duu-c7-green-door',             name: 'Green Door',               project: 'duu', projectName: 'The Book', chapter: 'Phase VII',  type: 'artwork', src: 'images/Book/Chapter 7/Ch7_Empty/green door.png',                                      tags: ['phase-vii'],             tokenId: 41, contract: 'DUU',     shadeCost: 11,   shadeValue: null },
  { id: 'duu-c7-white-door',             name: 'White Door',               project: 'duu', projectName: 'The Book', chapter: 'Phase VII',  type: 'artwork', src: 'images/Book/Chapter 7/Ch7_Empty/white door.png',                                      tags: ['phase-vii'],             tokenId: 42, contract: 'DUU',     shadeCost: 11,   shadeValue: null },
  { id: 'duu-c7-antithesis',             name: 'Antithesis',               project: 'duu', projectName: 'The Book', chapter: 'Phase VII',  type: 'artwork', src: 'images/Book/Chapter 7/Ch7_Empty/antithesis.png',                                      tags: ['phase-vii'],             tokenId: 43, contract: 'DUU',     shadeCost: null, shadeValue: null },
  { id: 'duu-c7-room-of-lights',         name: 'Room of Lights',           project: 'duu', projectName: 'The Book', chapter: 'Phase VII',  type: 'artwork', src: 'images/Book/Chapter 7/Ch7_Empty/room of lights b v2.png',                             tags: ['phase-vii'],             tokenId: 44, contract: 'DUU',     shadeCost: 11,   shadeValue: null },
  { id: 'duu-c7-room-of-shadows',        name: 'Room of Shadows',          project: 'duu', projectName: 'The Book', chapter: 'Phase VII',  type: 'artwork', src: 'images/Book/Chapter 7/Ch7_Empty/Room of shadows b v2.png',                            tags: ['phase-vii'],             tokenId: 45, contract: 'DUU',     shadeCost: 11,   shadeValue: null },

  // Phase VIII — Pool of Doubt
  { id: 'duu-c8-pool-of-doubt',          name: 'Pool of Doubt',            project: 'duu', projectName: 'The Book', chapter: 'Phase VIII', type: 'artwork', src: 'images/Book/Chapter 8/Ch8_pool_of_doubt.png',                                         tags: ['phase-viii'],            tokenId: 46, contract: 'DUU',     shadeCost: 22,   shadeValue: null },
  { id: 'duu-c8-garden-of-reflection',   name: 'Garden of Reflection',     project: 'duu', projectName: 'The Book', chapter: 'Phase VIII', type: 'artwork', src: 'images/Book/Chapter 8/Ch8_garden_of_embrace.png',                                     tags: ['phase-viii'],            tokenId: 47, contract: 'DUU',     shadeCost: 22,   shadeValue: null },

  // Phase IX — A Ticket Home
  { id: 'duu-c9-a-ticket-home',          name: 'A Ticket Home',            project: 'duu', projectName: 'The Book', chapter: 'Phase IX',   type: 'artwork', src: 'images/Book/Chapter 9/A Ticket Home/Ch9_A_Ticket_Home_Part_2.gif',                    tags: ['animated', 'phase-ix'],  tokenId: 48, contract: 'DUU',     shadeCost: 44,   shadeValue: null },
  { id: 'duu-c9-farewell-to-odiville',   name: 'Farewell to Odiville',     project: 'duu', projectName: 'The Book', chapter: 'Phase IX',   type: 'artwork', src: 'images/Book/Chapter 9/1-1/Ch9_Farewell_To_Odiville_resized.gif',                     tags: ['animated', 'phase-ix'],  tokenId: 49, contract: 'DUU',     shadeCost: null, shadeValue: null },
  { id: 'duu-c9-an-echo-of-sacrifice',   name: 'An Echo of Sacrifice',     project: 'duu', projectName: 'The Book', chapter: 'Phase IX',   type: 'artwork', src: 'images/Book/Chapter 9/An Echo of Sacrifice/Ch9_An_Echo_of_Sacrifice_Part_2.gif',     tags: ['animated', 'phase-ix'],  tokenId: 50, contract: 'DUU',     shadeCost: 44,   shadeValue: null },

  // Phase X — Welcome to Odiville
  { id: 'duu-c10-welcome-to-odiville',   name: 'Welcome to Odiville',      project: 'duu', projectName: 'The Book', chapter: 'Phase X',    type: 'artwork', src: 'images/Book/Chapter 10/Ch10_Welcome_To_Odiville.gif',                                 tags: ['animated', 'phase-x'],   tokenId: 51, contract: 'DUU',     shadeCost: null, shadeValue: null },

  /* ============================================================
     WHISPERS — Lots (6 auction pieces)
  ============================================================ */

  { id: 'wh-the-arrival',                name: 'The Arrival',              project: 'whispers', projectName: 'Whispers', chapter: null, type: 'lot', src: 'images/Whispers/Whispers_Art/the_arrival.gif',              tags: ['animated', 'lot', 'whispers'],   tokenId: null, contract: null, shadeCost: null, shadeValue: null },
  { id: 'wh-blue-reverie',               name: 'Blue Reverie',             project: 'whispers', projectName: 'Whispers', chapter: null, type: 'lot', src: 'images/Whispers/Whispers_Art/blue_reverie.png',             tags: ['lot', 'whispers'],               tokenId: null, contract: null, shadeCost: null, shadeValue: null },
  { id: 'wh-a-choice-in-the-clouds',     name: 'A Choice in the Clouds',   project: 'whispers', projectName: 'Whispers', chapter: null, type: 'lot', src: 'images/Whispers/Whispers_Art/a_choice_in_the_clouds.png',  tags: ['lot', 'whispers'],               tokenId: null, contract: null, shadeCost: null, shadeValue: null },
  { id: 'wh-youre-wrong-about-them',     name: "You're Wrong About Them",  project: 'whispers', projectName: 'Whispers', chapter: null, type: 'lot', src: 'images/Whispers/Whispers_Art/you_re_wrong_about_them.gif', tags: ['animated', 'lot', 'whispers'],   tokenId: null, contract: null, shadeCost: null, shadeValue: null },
  { id: 'wh-antithesis',                 name: 'Antithesis',               project: 'whispers', projectName: 'Whispers', chapter: null, type: 'lot', src: 'images/Whispers/Whispers_Art/antithesis.png',              tags: ['lot', 'whispers'],               tokenId: null, contract: null, shadeCost: null, shadeValue: null },
  { id: 'wh-farewell-to-odiville',       name: 'Farewell to Odiville',     project: 'whispers', projectName: 'Whispers', chapter: null, type: 'lot', src: 'images/Whispers/Whispers_Art/farewell_to_odiville.gif',    tags: ['animated', 'lot', 'whispers'],   tokenId: null, contract: null, shadeCost: null, shadeValue: null },

  /* ============================================================
     WHISPERS — Residents (6 pieces)
  ============================================================ */

  { id: 'wh-res-the-end',                name: 'The End',                  project: 'whispers', projectName: 'Whispers', chapter: 'Chapter 1',  type: 'resident', src: 'images/Whispers/Residents/The End.gif',             tags: ['animated', 'resident', 'whispers'], tokenId: null, contract: null, shadeCost: null, shadeValue: null },
  { id: 'wh-res-neverwas',               name: 'Neverwas',                 project: 'whispers', projectName: 'Whispers', chapter: 'Chapter 6',  type: 'resident', src: 'images/Whispers/Residents/Neverwas.gif',            tags: ['animated', 'resident', 'whispers'], tokenId: null, contract: null, shadeCost: null, shadeValue: null },
  { id: 'wh-res-one-lie',                name: 'One Lie',                  project: 'whispers', projectName: 'Whispers', chapter: 'Chapter 7A', type: 'resident', src: 'images/Whispers/Residents/One Lie.gif',             tags: ['animated', 'resident', 'whispers'], tokenId: null, contract: null, shadeCost: null, shadeValue: null },
  { id: 'wh-res-one-truth',              name: 'One Truth',                project: 'whispers', projectName: 'Whispers', chapter: 'Chapter 7',  type: 'resident', src: 'images/Whispers/Residents/One Truth.gif',           tags: ['animated', 'resident', 'whispers'], tokenId: null, contract: null, shadeCost: null, shadeValue: null },
  { id: 'wh-res-inbetween',              name: 'Inbetween',                project: 'whispers', projectName: 'Whispers', chapter: 'Chapter 9',  type: 'resident', src: 'images/Whispers/Residents/Inbetween.gif',           tags: ['animated', 'resident', 'whispers'], tokenId: null, contract: null, shadeCost: null, shadeValue: null },
  { id: 'wh-res-ferryman',               name: 'Ferryman',                 project: 'whispers', projectName: 'Whispers', chapter: 'Chapter 3',  type: 'resident', src: 'images/Whispers/Residents/Ferryman_resized.gif',    tags: ['animated', 'resident', 'whispers'], tokenId: null, contract: null, shadeCost: null, shadeValue: null },

  /* ============================================================
     ONE-WAY TICKET
  ============================================================ */

  { id: 'owt-main',                      name: 'One-Way Ticket',           project: 'owt', projectName: 'One-Way Ticket', chapter: null, type: 'artwork', src: 'images/One-way Ticket/One-way Ticket.mp4',          tags: ['video', 'owt'],    tokenId: null, contract: null, shadeCost: null, shadeValue: null },
  { id: 'owt-slideshow',                 name: 'One-Way Ticket Slideshow',  project: 'owt', projectName: 'One-Way Ticket', chapter: null, type: 'artwork', src: 'images/One-way Ticket/One-way-Ticket-Slideshow-v3-gif.gif', tags: ['animated', 'owt'], tokenId: null, contract: null, shadeCost: null, shadeValue: null },
  { id: 'owt-void',                      name: 'Void',                     project: 'owt', projectName: 'One-Way Ticket', chapter: null, type: 'artwork', src: 'images/One-way Ticket/owt_void.gif',               tags: ['animated', 'owt'], tokenId: null, contract: null, shadeCost: null, shadeValue: null },
  { id: 'owt-none',                      name: 'None',                     project: 'owt', projectName: 'One-Way Ticket', chapter: null, type: 'artwork', src: 'images/One-way Ticket/owt_none.gif',               tags: ['animated', 'owt'], tokenId: null, contract: null, shadeCost: null, shadeValue: null }

];
