"use strict";

/*

TODO

• fix score not displaying initially if screen is narrower than first phrase
• add expressivity control

• add colors
• add mute / solo button

• hosting - https://www.heroku.com/
• test robustness and rewrite state tracking code accordingly
• move script out -  node static

*/

function Player() {
    this.id = null;              // session id of player
    this.phraseIndex = -1;       // phrase index in phraseSequence
    this.phraseIndexNext = null; // next phrase index in phraseSequence (jumped to at end of phrase if not null)
    this.phraseStep = 0;         // phrase step (overall step)
    this.noteIndex = 0;          // note index in phrase
    this.noteStep = 0;           // note step (step within note)
    this.noteClass = null;       // note pitch class
    this.noteOctave = 4;         // note noteOctave
    this.noteTrigger = false;    // note trigger
    this.noteMute = false;       // note mute
}

Player.prototype = {
    dumpOut: function() {
        // returns stripped properties of object
        return [this.id, this.phraseIndex, this.phraseIndexNext, this.phraseStep, this.noteIndex, this.noteStep, this.noteClass, this.noteOctave, this.noteTrigger, this.noteMute];
    },
    dumpIn: function(array) {
        // applies stipped properties to object
        this.id = array[0];
        this.phraseIndex = array[1];
        this.phraseIndexNext = array[2];
        this.phraseStep = array[3];
        this.noteIndex = array[4];
        this.noteStep = array[5];
        this.noteClass = array[6];
        this.noteOctave = array[7];
        this.noteTrigger = array[8];
        this.noteMute = array[9];
    },
    play: function() {
        // triggers audio based on current state
        if(this.noteTrigger) {
            // trigger new note
            audio.playNoteForPlayer(this);
        }
        if(this.noteMute) {
            // mute current note
            audio.muteNoteForPlayer(this);
        }
    },
    tick: function() {
        // updates the current state to the next state
        if(this.phraseIndex > -1 && this.phraseIndex < this.phraseSequence.length) {
            // valid phraseIndex
            this.noteStep++;
            this.phraseStep++;
            if(this.noteStep >= this.phraseSequence[this.phraseIndex][this.noteIndex][0]) {
                // note done, go to next note
                this.noteStep = 0;
                this.noteIndex++;
                if(this.noteIndex >= this.phraseSequence[this.phraseIndex].length) {
                    // phrase done, go back to begining
                    if(this.phraseIndexNext != null) {
                        this.phraseIndex = this.phraseIndexNext;
                        this.phraseIndexNext = null;
                    }
                    this.noteIndex = 0;
                    this.phraseStep = 0;
                }
                // assigning phraseIndexNext may have pushed phraseIndex out of bounds
                if(this.phraseIndex > -1 && this.phraseIndex < this.phraseSequence.length) {
                    // valid phraseIndex
                    if(this.phraseSequence[this.phraseIndex][this.noteIndex].length == 2) {
                        // new note is not a silence; trigger, no mute
                        this.noteClass = this.phraseSequence[this.phraseIndex][this.noteIndex][1];
                        this.noteTrigger = true;
                        this.noteMute = false;
                    } else {
                        // new note is a silence; mute, no trigger
                        this.noteClass = null;
                        this.noteTrigger = false;
                        this.noteMute = true;
                    }
                } else {
                    // invalid phraseIndex; mute, no trigger
                    this.noteClass = null;
                    this.noteTrigger = false;
                    this.noteMute = true;
                }
            } else {
                // no new note; no trigger, no mute
                this.noteTrigger = false;
                this.noteMute = false;
            }
        } else {
            // invalid phraseIndex; mute, no trigger
            this.noteClass = null;
            this.noteTrigger = false;
            this.noteMute = true;
        }
    },
    setPhrase: function(phraseIndex) {
        // sets phraseIndex to a new value and updates rest of state data accordingly
        this.phraseStep = 0;
        this.noteIndex = 0;
        this.noteStep = 0;
        if(phraseIndex >= 0 && phraseIndex < this.phraseSequence.length) {
            // valid phraseIndex
            this.phraseIndex = phraseIndex;
            if(this.phraseSequence[this.phraseIndex][this.noteIndex].length == 2) {
                // new note is not a silence; trigger, no mute
                this.noteClass = this.phraseSequence[this.phraseIndex][this.noteIndex][1];
                this.noteTrigger = true;
                this.noteMute = false;
            } else {
                // new note is a silence; mute, no trigger
                this.noteClass = null;
                this.noteTrigger = false;
                this.noteMute = true;
            }
        } else {
            // invalid phraseIndex; mute, no trigger
            if(phraseIndex < 0) {
                this.phraseIndex = -1;
            } else {
                this.phraseIndex = this.phraseSequence.length;
            }
            this.noteClass = null;
            this.noteTrigger = false;
            this.noteMute = true;
        }
    },
    nextPhrase: function() {
        // increments the phraseIndex the end of the currently playing phrase. If called twice before the end of the phrase, the jump is immediate.
        if(this.phraseIndexNext == this.phraseIndex + 1) {
            // phraseIndexNext has already been set to next phrase, jump directly to it
            this.phraseIndexNext = null;
            this.setPhrase(this.phraseIndex + 1);
        } else {
            if(this.phraseIndex < 0) {
                // must reset index manually because phraseIndexNext cannot be reached through tick()
                this.phraseIndex = 0;
            } else {
                this.phraseIndexNext = this.phraseIndex + 1;
            }
        }
    },
    prevPhrase: function() {
        // decrements the phraseIndex the end of the currently playing phrase. If called twice before the end of the phrase, the jump is immediate.
        if(this.phraseIndexNext == this.phraseIndex - 1) {
            // phraseIndexNext has already been set to prev phrase, jump directly to it
            this.phraseIndexNext = null;
            this.setPhrase(this.phraseIndex - 1);
        } else {
            if(this.phraseIndex >= this.phraseSequence.length) {
                // must reset index manually because phraseIndexNext cannot be reached through tick()
                this.phraseIndex = this.phraseSequence.length - 1;
            } else {
                this.phraseIndexNext = this.phraseIndex - 1;
            }
        }
    },
    restartPhrase: function() {
        // restarts the phrase to it's begining
        this.phraseStep = 0;
        this.noteIndex = 0;
        this.noteStep = 0;
        if(this.phraseSequence[this.phraseIndex][this.noteIndex].length == 2) {
            // new note is not a silence; trigger, no mute
            this.noteClass = this.phraseSequence[this.phraseIndex][this.noteIndex][1];
            this.noteTrigger = true;
            this.noteMute = false;
        } else {
            // new note is a silence; mute, no trigger
            this.noteClass = null;
            this.noteTrigger = false;
            this.noteMute = true;
        }
    },
    octaveUp: function() {
        // increases the register of sound
        this.noteOctave = this.noteOctave + 1 > 5 ? 6 : this.noteOctave + 1;
    },
    octaveDown: function() {
        // decreases the register of sound
        this.noteOctave = this.noteOctave - 1 < 2 ? 2 : this.noteOctave - 1;
    },
    /*
    [score
        [musical phrase
            [note duration, note number], [note duration (this is a silence)]
        ]
    ]
    */
    phraseSequence: [
        [ // 1
            [4,4], [4,4], [4,4]
        ],
        [ // 2
            [2,4], [2,5], [4,4]
        ],
        [ // 3
            [2], [2,4], [2,5], [2,4]
        ],
        [ // 4
            [2], [2,4], [2,5], [2,7]
        ],
        [ // 5
            [2,4], [2,5], [2,7], [2]
        ],
        [ // 6
            [32,12]
        ],
        [ // 7
            [14], [1,0], [1,0], [2,0], [18]
        ],
        [ // 8
            [18,7], [32,5]
        ],
        [ // 9
            [1,11], [1,7], [14]
        ],
        [ // 10
            [1,11], [1,7]
        ],
        [ // 11
            [1,5], [1,7], [1,11], [1,7], [1,11], [1,7]
        ],
        [ // 12
            [1,5], [1,7], [16,11], [4,12]
        ],
        [ // 13
            [1,11], [3,7], [1,7], [1,5], [2,7], [3], [7,7]
        ],
        [ // 14
            [16,12], [16,11], [16,7], [16,6]
        ],
        [ // 15
            [1,7], [15]
        ],
        [ // 16
            [1,7], [1,11], [1,12], [1,11]
        ],
        [ // 17
            [1,11], [1,12], [1,11], [1,12], [1,11], [1]
        ],
        [ // 18
            [1,4], [1,6], [1,4], [1,6], [3,4], [1,4]
        ],
        [ // 19
            [6], [6,19]
        ],
        [ // 20
            [1,4], [1,6], [1,4], [1,6], [3,-1], [1,4], [1,6], [1,4], [1,6], [1,4]
        ],
        [ // 21
            [6,6]
        ],
        [ // 22
            [6,4], [6,4], [6,4], [6,4], [6,4], [6,6], [6,7], [6,9], [2,11]
        ],
        [ // 23
            [2,4], [6,6], [6,6], [6,6], [6,6], [6,6], [6,7], [6,9], [4,11],
        ],
        [ // 24
            [2,4], [2,6], [6,7], [6,7], [6,7], [6,7], [6,7], [6,9], [2,11]
        ],
        [ // 25
            [2,4], [2,6], [2,7], [6,9], [6,9], [6,9], [6,9], [6,9], [6,11]
        ],
        [ // 26
            [2,4], [2,6], [2,7], [2,9], [6,11], [6,11], [6,11], [6,11], [6,11]
        ],
        [ // 27
            [1,4], [1,6], [1,4], [1,6], [2,7], [1,4], [1,7], [1,6], [1,4], [1,6], [1,4]
        ],
        [ // 28
            [1,4], [1,6], [1,4], [1,6], [3,4], [1,4]
        ],
        [ // 29
            [6,4], [6,7], [6,12]
        ],
        [ // 30
            [18,12]
        ],
        [ // 31
            [1,7], [1,5], [1,7], [1,11], [1,7], [1,11]
        ],
        [ // 32
            [1,5], [1,7], [1,5], [1,7], [1,11], [7,5], [6,7]
        ],
        [ // 33
            [1,7], [1,5], [2]
        ],
        [ // 34
            [1,7], [1,5]
        ],
        [ // 35
            [1,5], [1,7], [1,11], [1,7], [1,11], [1,7], [1,11], [1,7], [1,11], [1,7], [14], [4,10], [6,19], [2,21], [4,19], [2,23], [6,21], [2,19], [6,16], [2,19], [8,18], [10], [4,16], [6,17]
        ],
        [ // 36
            [1,5], [1,7], [1,11], [1,7], [1,11], [1,7]
        ],
        [ // 37
            [1,5], [1,7]
        ],
        [ // 38
            [1,5], [1,7], [1,11]
        ],
        [ // 39
            [1,11], [1,7], [1,5], [1,7], [1,11], [1,12]
        ],
        [ // 40
            [1,11], [1,5]
        ],
        [ // 41
            [1,11], [1,7]
        ],
        [ // 42
            [16,12], [16,11], [16,9], [16,12]
        ],
        [ // 43
            [1,17], [1,16], [1,17], [1,16], [2,16], [2,16], [2,16], [1,17], [1,16]
        ],
        [ // 44
            [2,17], [4,16], [2,16], [4,12]
        ],
        [ // 45
            [4,14], [4,14], [4,7]
        ],
        [ // 46
            [1,7], [1,14], [1,16], [1,14], [2], [2,7], [2], [2,7], [2], [2,7], [1,7], [1,14], [1,16], [1,14]
        ],
        [ // 47
            [1,14], [1,16], [2,14]
        ],
        [ // 48
            [18,7], [16,7], [20,5]
        ],
        [ // 49
            [1,5], [1,7], [1,10], [1,7], [1,10], [1,7]
        ],
        [ // 50
            [1,5], [1,7]
        ],
        [ // 51
            [1,5], [1,7], [1,10]
        ],
        [ // 52
            [1,7], [1,10]
        ],
        [ // 53
            [1,10], [1,7]
        ]
    ],
    // length of the phrase of the corresponding index
    phraseLength: [12, 8, 8, 8, 8, 32, 36, 50, 16, 2, 6, 22, 18, 64, 16, 4, 6, 8, 12, 12, 6, 50, 48, 42, 42, 38, 12, 8, 18, 18, 6, 18, 4, 2, 86, 6, 2, 3, 6, 2, 2, 64, 12, 12, 12, 20, 4, 54, 6, 2, 3, 2, 2],
    // length of the sum of all phrases of index less than the corresponding index
    phraseLengthCummulative: [0, 12, 20, 28, 36, 44, 76, 112, 162, 178, 180, 186, 208, 226, 290, 306, 310, 316, 324, 336, 348, 354, 404, 452, 494, 536, 574, 586, 594, 612, 630, 636, 654, 658, 660, 746, 752, 754, 757, 763, 765, 767, 831, 843, 855, 867, 887, 891, 945, 951, 953, 956, 958],
    // lowest note of the score
    lowestNote: -1,
    // highest note of the score
    highestNote: 23,
    // algorithms used to generate phraseLength, phraseLengthCummulative, lowestNote and highestNote in case they must be recalculated
    /*
    phraseLength: function() {
        let array = [];
        for(let i = 0; i < this.phraseSequence.length; i++) {
            let length = 0;
            for(let j = 0; j < this.phraseSequence[i].length; j++) {
                length += this.phraseSequence[i][j][0];
            }
            array[i] = length;
        }
        return array;
    },
    */
    /*
    phraseLengthCummulative: function() {
        let array = [0];
        for(let i = 1; i < this.phraseLength.length; i++) {
            array[i] = this.phraseLength[i - 1] + array[i - 1];
        }
        return array;
    },
    */
    /*
    highestNote: function() {
        let temp = null;
        for(let i = 1; i < this.phraseSequence.length; i++) {
            for(let j = 0; j < this.phraseSequence[i].length; j++) {
                if(this.phraseSequence[i][j].length > 1 && (temp == null || this.phraseSequence[i][j][1] > temp)) {
                    // the note is not a silence, temp is null or the note is higher than temp
                    temp = this.phraseSequence[i][j][1];
                }
            }
        }
        return temp;
    },
    */
    /*
    lowestNote: function() {
        let temp = null;
        for(let i = 1; i < this.phraseSequence.length; i++) {
            for(let j = 0; j < this.phraseSequence[i].length; j++) {
                if(this.phraseSequence[i][j].length > 1 && (temp == null || this.phraseSequence[i][j][1] < temp)) {
                    // the note is not a silence, temp is null or the note is lower than temp
                    temp = this.phraseSequence[i][j][1];
                }
            }
        }
        return temp;
    }
    */
}

// encapsulation of all audio-related things
function Audio() {
    let audio = this;

    // configures audio for same-room setup using a pair of speakers per computer
    this.selfOutputOnly = true;

    // configures gain-compensation for bass-weak speakers
    this.compensateLows = true;

    // returns amplitude for given note number (given by log2(freq /16.35)). not a filter, just a hack to mimick one when generating voice envelopes. set up to compensate poor bass performance of exhibition speakers
    // see https://www.desmos.com/calculator/a26zreyh5d
    this.gainForNote = function(note) {
        let gain = 1.0;
        if(audio.compensateLows) {
            let gainHighShelf = 0.7;
            let gainLowShelf = 1.0;
            let cutoff = 3.6;
            let steepness = 1.2;
            let p = (Math.tanh((note - cutoff) * steepness) + 1) / 2.0;
            gain = gainHighShelf * p + gainLowShelf * (1 - p);
        }
        return gain;
    }

    this.playNoteForPlayer = function(player) {
        if(audio.contextReady) {
            if(!audio.selfOutputOnly || player == players[0]) {
                let note = player.noteClass / 12.0 + player.noteOctave;
                let frequency = Math.pow(2, player.noteClass / 12.0 + player.noteOctave) * 16.35;
                let attack = 5.0 / frequency;
                let decay = 900.0 / frequency;
                let gain = audio.gainForNote(note);

                player.voice.carrier.oscillator.frequency.value = frequency;
                player.voice.modulator.oscillator.frequency.value = frequency;

                player.voice.carrier.gain.gain.cancelAndHoldAtTime(audio.context.currentTime);
                player.voice.carrier.gain.gain.exponentialRampToValueAtTime(gain, audio.context.currentTime + attack);
                player.voice.carrier.gain.gain.setValueAtTime(gain, audio.context.currentTime + attack);
                player.voice.carrier.gain.gain.exponentialRampToValueAtTime(0.0000001, audio.context.currentTime + attack + decay);

                player.voice.modulator.gain.gain.cancelAndHoldAtTime(audio.context.currentTime);
                player.voice.modulator.gain.gain.exponentialRampToValueAtTime(100, audio.context.currentTime + attack);
                player.voice.modulator.gain.gain.setValueAtTime(100, audio.context.currentTime + attack);
                player.voice.modulator.gain.gain.exponentialRampToValueAtTime(0.0000001, audio.context.currentTime + attack + decay);
            }
        }
    }

    this.muteNoteForPlayer = function(player) {
        if(audio.contextReady) {
            if(!audio.selfOutputOnly || player == players[0]) {
                player.voice.carrier.gain.gain.cancelAndHoldAtTime(audio.context.currentTime);
                player.voice.carrier.gain.gain.exponentialRampToValueAtTime(0.0000001, audio.context.currentTime + 0.1);

                player.voice.modulator.gain.gain.cancelAndHoldAtTime(audio.context.currentTime);
                player.voice.modulator.gain.gain.exponentialRampToValueAtTime(0.0000001, audio.context.currentTime + 0.1);
            }
        }
    }

    function Modulator(type, frequency, index) {
        if(audio.contextReady) {
            this.oscillator = audio.context.createOscillator();
            this.gain = audio.context.createGain();
            this.oscillator.type = type;
            this.oscillator.frequency.value = frequency;
            this.gain.gain.value = index;

            this.oscillator.connect(this.gain);
            this.oscillator.start(0);
        }
    }

    function Carrier(type, frequency) {
        if(audio.contextReady) {
            this.oscillator = audio.context.createOscillator();
            this.gain = audio.context.createGain();
            this.oscillator.type = type;
            this.oscillator.frequency.value = frequency;

            this.oscillator.connect(this.gain);
            this.oscillator.start(0);
        }
    }

    function Voice(carrierFrequency, modulatorFrequency, index) {
        if(audio.contextReady) {
            this.carrierFrequency = carrierFrequency;
            this.modulatorFrequency = modulatorFrequency;
            this.modulator = new Modulator("sine", modulatorFrequency, index);
            this.carrier = new Carrier("sine", carrierFrequency);
            this.panner = audio.context.createStereoPanner();

            this.modulator.gain.connect(this.carrier.oscillator.frequency);
            this.carrier.gain.connect(this.panner);
        }
    }

    this.contextReady = false;

    this.createContext = function() {
        audio.context = new AudioContext();
        audio.contextReady = true;

        audio.delay = audio.context.createDelay(0.1);
        audio.drywet = audio.context.createGain();
        audio.drywet.gain.value = 0.5;
        audio.gain = audio.context.createGain();

        audio.delayModulator = new Modulator("sine", 0.05, 0.003);
        audio.delayModulator.gain.connect(audio.delay.delayTime);

        audio.delay.delayTime.value = 0.001;
        audio.delay.connect(audio.drywet);
        audio.drywet.connect(audio.gain);
        audio.gain.connect(audio.context.destination);

        audio.updateNodes();
    }

    this.updateNodes = function() {
        console.log("Updating audio nodes");
        if(audio.contextReady) {
            if(audio.selfOutputOnly) {
                if(typeof players[0].voice == "undefined") {
                    players[0].voice = new Voice(0, 0, 0);
                    players[0].voice.panner.connect(audio.delay);
                    players[0].voice.panner.connect(audio.gain);
                }
            } else {
                let newVoice = false;
                // at least one undefined voice, need to adjust gains and create voice
                for(let i = 0; i < players.length; i++) {
                    if(typeof players[i].voice == "undefined") {
                        newVoice = true;
                        players[i].voice = new Voice(0, 0, 0);
                        players[i].voice.panner.connect(audio.delay);
                        players[i].voice.panner.connect(audio.gain);
                    }
                }
                if(newVoice) {
                    // automatic constant-power gain control
                    audio.gain.gain.cancelAndHoldAtTime(audio.context.currentTime);
                    audio.gain.gain.exponentialRampToValueAtTime(Math.sqrt(1.0 / (players.length)), audio.context.currentTime + 1)
                }
            }
        }
    }

    this.updatePan = function() {
        if(!audio.selfOutputOnly) {
            if(audio.contextReady) {
                let step = players[0].phraseLengthCummulative[players[0].phraseIndex] + players[0].phraseStep;
                for(let i = 0; i < players.length; i++) {
                    let pan = 0;
                    if(players[i].phraseIndex >= 0 && players[i].phraseIndex < players[0].phraseSequence.length) {
                        let delta = players[0].phraseLengthCummulative[players[i].phraseIndex] + players[i].phraseStep - step;
                        pan = 0.7 * Math.tanh(delta / 40.0);
                    } else {
                        if(players[i].phraseIndex < 0) {
                            pan = -0.7;
                        } else {
                            pan = 0.7;
                        }
                    }
                    if(pan == 0) {
                        pan = 0.000001;
                    }
                    players[i].voice.panner.pan.cancelAndHoldAtTime(audio.context.currentTime);
                    players[i].voice.panner.pan.linearRampToValueAtTime(pan, audio.context.currentTime + 0.125);
                }
            }
        }
    }
}

// encapsulation of all graphics-related things
function Graphics() {
    let graphics = this;
    let canvas = this.canvas;
    let context = this.context;

    this.language = "english";

    this.pixelRatio = null;

    this.canvas = null;
    this.context = null;
    this.contextReady = false;
    this.animationFrameRequest = null;

    this.timeFineStep = 0;
    this.timeTickLast = null;
    this.timeTickDelta = null;

    this.textScale = null;
    this.xOffset = null;
    this.yOffset = null;
    this.xOffsetTarget = null;
    this.yOffsetTarget = null;
    this.xScale = null;
    this.yScale = null;
    this.xScaleTarget = null;
    this.yScaleTarget = null;
    this.xScaleBasis = null;
    this.yScaleBasis = null;
    this.xScaleSetting = 0;

    this.stepTutorial = 0;
    this.stepTutorialLast = 0;
    this.ySplitTarget = null;
    this.ySplit = null;

    this.tick = function() {
        // updates internal time span measurement to interpolate the position of the cursor
        if(graphics.timeTickLast == null) {
            graphics.timeTickLast = Date.now();
        } else {
            graphics.timeTickDelta = Date.now() - graphics.timeTickLast;
            graphics.timeTickLast = graphics.timeTickDelta + graphics.timeTickLast;
        }
    }

    this.switchLanguage = function() {
        if(graphics.language == "french") {
            graphics.language = "english";
        } else if (graphics.language == "english") {
            graphics.language = "french";
        }
    }

    this.setTutorial = function(number) {
        graphics.stepTutorial = number;
    }

    this.nextTutorial = function() {
        graphics.stepTutorial++;
    }

    this.prevTutorial = function() {
        graphics.stepTutorial--;
    }

    this.xScaleCycle = function() {
        // cycles the xScale
        this.xScaleSetting = (this.xScaleSetting + 1) % 4;
        this.xScaleTarget = this.xScaleBasis * 1.0 / (1 << this.xScaleSetting);
    }

    this.getPixelRatio = function() {
      var backingStore = graphics.context.backingStorePixelRatio ||
            graphics.context.webkitBackingStorePixelRatio ||
            graphics.context.mozBackingStorePixelRatio ||
            graphics.context.msBackingStorePixelRatio ||
            graphics.context.oBackingStorePixelRatio ||
            graphics.context.backingStorePixelRatio || 1;
      return (window.devicePixelRatio || 1) / backingStore;
    }

    this.createContext = function() {
        // creates graphics context
        graphics.canvas = document.getElementById('canvas');
        graphics.context = graphics.canvas.getContext('2d');
        graphics.pixelRatio = graphics.getPixelRatio();
        graphics.canvas.style.width = document.body.clientWidth + "px";
        graphics.canvas.style.height = document.body.clientHeight + "px";
        graphics.canvas.width = graphics.pixelRatio * document.body.clientWidth;
        graphics.canvas.height = graphics.pixelRatio * document.body.clientHeight;
        //graphics.context.scale(graphics.pixelRatio, graphics.pixelRatio);
        graphics.textScale = Math.min(graphics.canvas.width, graphics.canvas.height / 3 * 2) * 0.05;
        graphics.xScaleTarget = 30;
        graphics.yScaleTarget = graphics.canvas.height / (players[0].highestNote - players[0].lowestNote + 2);
        graphics.xScaleBasis = graphics.xScaleTarget;
        graphics.yScaleBasis = graphics.yScaleTarget;
        graphics.yOffsetBasis = graphics.canvas.height - graphics.yScaleBasis * 2;
        graphics.context.font = "" + graphics.textScale + "px Futura,Trebuchet MS,Arial,sans-serif";
        graphics.context.lineWidth = 2;
        graphics.contextReady = true;
        graphics.startAnimationFrame();
    }

    this.startAnimationFrame = function() {
        // takes care of animation frames
        if(graphics.timeTickLast != null && graphics.timeTickDelta != null && graphics.timeTickDelta != 0) {
            graphics.timeFineStep = (Date.now() - graphics.timeTickLast) / graphics.timeTickDelta;
        } else {
            graphics.timeFineStep = 0;
        }
        graphics.animationFrameRequest = window.requestAnimationFrame(graphics.startAnimationFrame);
        for(let i = 0; i < graphics.onAnimationFrame.length; i++) {
            graphics.onAnimationFrame[i]();
        }
    }

    this.stopAnimationFrame = function() {
        window.cancelAnimationFrame(graphics.animationFrameRequest);
    }

    this.onAnimationFrame = [];
    // stack of graphics functions executed at every animation frame

    this.clear = function() {
        // clears the contents of the graphics window
        graphics.context.clearRect(0,0, graphics.canvas.width, graphics.canvas.height);
    }

    this.drawTextFromArray = function(textArray, xCenter, yCenter) {
        // draws text centered from array
        graphics.context.fillStyle = "#FFFFFF";
        graphics.context.textAlign = "center";
        let yCount = (textArray.length % 2 == 0 ? 0.5 : 0) - Math.floor(textArray.length / 2);
        for(let i = 0; i < textArray.length; i++) {
            graphics.context.fillText(textArray[i], xCenter, yCenter + yCount * graphics.textScale * 2);
            yCount = yCount + 1.0;
        }
    }

    this.drawKey = function(key, highlight, xCenter, yCenter) {
        // draws keys
        let rectScale = 2 * graphics.textScale;
        switch(key) {
            case "space":
                if(highlight) {
                    graphics.context.fillStyle = "#FFFFFF";
                    graphics.context.fillRect(xCenter - rectScale * 2, yCenter - rectScale / 2, rectScale * 4, rectScale);
                } else {
                    graphics.context.fillStyle = "#000000";
                    graphics.context.strokeStyle = "#FFFFFF";
                    graphics.context.strokeRect(xCenter - rectScale / 2, yCenter - rectScale / 2, rectScale, rectScale);
                }
                break;
            case "shift":
                if(highlight) {
                    graphics.context.fillStyle = "#FFFFFF";
                    graphics.context.fillRect(xCenter - rectScale, yCenter - rectScale / 2, rectScale * 2, rectScale);
                    graphics.context.fillStyle = "#000000";
                } else {
                    graphics.context.fillStyle = "#000000";
                    graphics.context.strokeStyle = "#FFFFFF";
                    graphics.context.fillRect(xCenter - rectScale, yCenter - rectScale / 2, rectScale * 2, rectScale);
                    graphics.context.fillStyle = "#FFFFFF";
                }
                graphics.context.textAlign = "center";
                graphics.context.fillText("SHIFT", xCenter, yCenter + graphics.textScale * 0.4);
                break;
            default:
                if(highlight) {
                    graphics.context.fillStyle = "#FFFFFF";
                    graphics.context.fillRect(xCenter - rectScale / 2, yCenter - rectScale / 2, rectScale, rectScale);
                    graphics.context.fillStyle = "#000000";
                } else {
                    graphics.context.fillStyle = "#000000";
                    graphics.context.strokeStyle = "#FFFFFF";
                    graphics.context.strokeRect(xCenter - rectScale / 2, yCenter - rectScale / 2, rectScale, rectScale);
                    graphics.context.fillStyle = "#FFFFFF";
                }
                graphics.context.textAlign = "center";
                graphics.context.fillText(key.toUpperCase(), xCenter, yCenter + graphics.textScale * 0.4);
        }
    }

    this.drawArrowKeys = function(highlightArray, xCenter, yCenter) {
        // draws arrow keys
        // highlight array is an array of length 4 containing booleans indicating wether each arrow key is highlighted.
        // order is ◀, ▶, ▲, ▼
        let rectScale = 2 * graphics.textScale;
        let spaceScale = 0.3 * graphics.textScale;
        graphics.drawKey("◀", highlightArray[0], xCenter - rectScale - spaceScale, yCenter);
        graphics.drawKey("▼", highlightArray[3], xCenter, yCenter);
        graphics.drawKey("▶", highlightArray[1], xCenter + rectScale + spaceScale, yCenter);
        graphics.drawKey("▲", highlightArray[2], xCenter, yCenter - rectScale - spaceScale);
    }

    this.drawLanguageError = function() {
        // draws unsupported language text
        graphics.context.fillStyle = "#000000";
        graphics.context.fillRect(0, 0, graphics.canvas.width, graphics.canvas.height);
        graphics.drawTextFromArray([
            "Error: language \"" + graphics.language + "\" is unsupported."], graphics.canvas.width / 2, graphics.canvas.height / 2);
    }

    this.drawBrowserError = function() {
        // draws unsupported browser text
        graphics.context.fillStyle = "#000000";
        graphics.context.fillRect(0, 0, graphics.canvas.width, graphics.canvas.height);
        if(graphics.language == "french") {
            graphics.drawTextFromArray([
                "Désolé, votre navigateur web n'est pas supporté.",
                "Veuillez utiliser Google Chrome!"], graphics.canvas.width / 2, graphics.canvas.height / 2);
        } else if (graphics.language == "english"){
            graphics.drawTextFromArray([
                "Sorry, your browser is not supported.",
                "Please use Google Chrome!"], graphics.canvas.width / 2, graphics.canvas.height / 2);
        } else {
            graphics.drawLanguageError();
            throw new Error("unsupported language")
        }
    }

    this.drawTutorial = function() {
        // draws tutorial screens
        if(graphics.ySplit == null) {
            graphics.ySplit = 0;
        }
        if(graphics.ySplitTarget == null) {
            graphics.ySplitTarget = 0;
        }
        if(graphics.stepTutorial != graphics.stepTutorialLast) {
            // set easing target if tutorial step changed
            graphics.stepTutorialLast = graphics.stepTutorial;
            switch(graphics.stepTutorial) {
                case -1:
                    graphics.ySplitTarget = graphics.canvas.height;
                    graphics.yScaleTarget = graphics.yScaleBasis;
                    graphics.yOffsetTarget = graphics.yOffsetBasis;
                    break;
                case 0:
                    graphics.ySplitTarget = 0;
                    break;
                case 1:
                case 2:
                case 3:
                case 4:
                    graphics.ySplitTarget = graphics.canvas.height / 2;
                    graphics.yScaleTarget = graphics.yScaleBasis / 2;
                    graphics.yOffsetTarget = graphics.yOffsetBasis / 2;
                    break;
                case 5:
                    graphics.ySplitTarget = graphics.canvas.height;
                    graphics.yScaleTarget = graphics.yScaleBasis;
                    graphics.yOffsetTarget = graphics.yOffsetBasis;
                    break;
            }
        }
        if(Math.abs(graphics.ySplitTarget - graphics.ySplit) < 1) {
            // done easing
            graphics.ySplit = graphics.ySplitTarget;
        } else {
            // not done easing
            graphics.ySplit += (graphics.ySplitTarget - graphics.ySplit) * 0.1;
        }
        switch(graphics.stepTutorial) {
            case -1:
                // tutorial exit screen (from first)
                graphics.context.fillStyle = "#000000";
                graphics.context.fillRect(0, graphics.ySplit, graphics.canvas.width, graphics.canvas.height - graphics.ySplit);
                break;
            case 0:
                // first tutorial screen
                graphics.context.fillStyle = "#000000";
                graphics.context.fillRect(0, graphics.ySplit, graphics.canvas.width, graphics.canvas.height - graphics.ySplit);
                if(graphics.language == "french") {
                    graphics.drawTextFromArray([
                        "Press L to switch to English",
                    ], graphics.canvas.width / 2, graphics.canvas.height * 0.1);
                    graphics.drawKey("L", true, graphics.canvas.width / 2, graphics.canvas.height * 0.17)
                    graphics.drawTextFromArray([
                        "Bonjour! Ceci est une version interactive",
                        "de la pièce In-C de Terry Riley, un incontournable",
                        "de la musique minimaliste classique.",
                    ], graphics.canvas.width / 2, graphics.canvas.height * 0.37);
                    graphics.drawTextFromArray([
                        "Utilisez plusieurs ordinateurs pour jouer la pièce en groupe!"
                    ], graphics.canvas.width / 2, graphics.canvas.height * 0.55);
                    graphics.drawTextFromArray([
                        "Appuyez sur la flèche droite pour continuer"
                    ], graphics.canvas.width / 2, graphics.canvas.height * 2 / 3);
                } else if (graphics.language == "english") {
                    graphics.drawTextFromArray([
                        "Appuyez sur L pour les instructions en français",
                    ], graphics.canvas.width / 2, graphics.canvas.height * 0.1);
                    graphics.drawKey("L", true, graphics.canvas.width / 2, graphics.canvas.height * 0.17)
                    graphics.drawTextFromArray([
                        "Hello! This is web-based rendition of",
                        "Terry Riley's piece In-C, a foundational",
                        "piece in classic minimalist music."
                    ], graphics.canvas.width / 2, graphics.canvas.height * 0.37);
                    graphics.drawTextFromArray([
                        "Use multiple computers to play the piece collaboratively!"
                    ], graphics.canvas.width / 2, graphics.canvas.height * 0.55);
                    graphics.drawTextFromArray([
                        "Press the right arrow key to continue"
                    ], graphics.canvas.width / 2, graphics.canvas.height * 2 / 3);
                } else {
                    graphics.drawLanguageError();
                    throw new Error("unsupported language")
                }
                graphics.drawArrowKeys([false, true, false, false], graphics.canvas.width / 2, graphics.canvas.height * 7 / 8);
                break;
            case 1:
                // second tutorial screen
                graphics.context.fillStyle = "#000000";
                graphics.context.fillRect(0, graphics.ySplit, graphics.canvas.width, graphics.canvas.height - graphics.ySplit);
                if(graphics.language == "french") {
                    graphics.drawTextFromArray([
                        "Appuyez sur la flèche droite ou gauche pour",
                        "sélectionner une phrase musicale"
                    ], graphics.canvas.width / 2, graphics.canvas.height * 2 / 3);
                } else if (graphics.language == "english") {
                    graphics.drawTextFromArray([
                        "Press the left and right arrows to",
                        "select a musical phrase"
                    ], graphics.canvas.width / 2, graphics.canvas.height * 2 / 3);
                } else {
                    graphics.drawLanguageError();
                    throw new Error("unsupported language")
                }
                graphics.drawArrowKeys([true, true, false, false], graphics.canvas.width / 2, graphics.canvas.height * 7 / 8);
                break;
            case 2:
                // third tutorial screen
                graphics.context.fillStyle = "#000000";
                graphics.context.fillRect(0, graphics.ySplit, graphics.canvas.width, graphics.canvas.height - graphics.ySplit);
                if(graphics.language == "french") {
                    graphics.drawTextFromArray([
                        "Appuyez sur la flèche haute ou basse",
                        "pour changer d'octave"
                    ], graphics.canvas.width / 2, graphics.canvas.height * 2 / 3);
                } else if (graphics.language == "english") {
                    graphics.drawTextFromArray([
                        "Press the up and down arrows to ",
                        "change octaves"
                    ], graphics.canvas.width / 2, graphics.canvas.height * 2 / 3);
                } else {
                    graphics.drawLanguageError();
                    throw new Error("unsupported language")
                }
                graphics.drawArrowKeys([false, false, true, true], graphics.canvas.width / 2, graphics.canvas.height * 7 / 8);
                break;
            case 3:
                // fourth tutorial screen
                graphics.context.fillStyle = "#000000";
                graphics.context.fillRect(0, graphics.ySplit, graphics.canvas.width, graphics.canvas.height - graphics.ySplit);
                if(graphics.language == "french") {
                    graphics.drawTextFromArray([
                        "Appuyez sur l'espace pour redémarrer",
                        "une phrase"
                    ], graphics.canvas.width / 2, graphics.canvas.height * 2 / 3);
                } else if (graphics.language == "english") {
                    graphics.drawTextFromArray([
                        "Press the space bar to restart",
                        "a phrase"
                    ], graphics.canvas.width / 2, graphics.canvas.height * 2 / 3);
                } else {
                    graphics.drawLanguageError();
                    throw new Error("unsupported language")
                }
                graphics.drawKey("space", true, graphics.canvas.width / 2, graphics.canvas.height * 7 / 8);
                break;
            case 4:
                // fifth tutorial screen
                graphics.context.fillStyle = "#000000";
                graphics.context.fillRect(0, graphics.ySplit, graphics.canvas.width, graphics.canvas.height - graphics.ySplit);
                if(graphics.language == "french") {
                    graphics.drawTextFromArray([
                        "Appuyez sur shift pour",
                        "zoomer"
                    ], graphics.canvas.width / 2, graphics.canvas.height * 2 / 3);
                } else if (graphics.language == "english") {
                    graphics.drawTextFromArray([
                        "Press the shift key to zoom",
                        "in or out"
                    ], graphics.canvas.width / 2, graphics.canvas.height * 2 / 3);
                } else {
                    graphics.drawLanguageError();
                    throw new Error("unsupported language")
                }
                graphics.drawKey("shift", true, graphics.canvas.width / 2, graphics.canvas.height * 7 / 8);
                break;
            case 5:
                // tutorial exit screen (from fifth)
                graphics.context.fillStyle = "#000000";
                graphics.context.fillRect(0, graphics.ySplit, graphics.canvas.width, graphics.canvas.height - graphics.ySplit);
        }
    }

    this.drawScore = function() {
        // plots the score with cursors
        if(graphics.yScale == null) {
            // assign initial yScale value
            graphics.yScale = graphics.yScaleTarget;
        } else {
            // exponentially ease-in xScale to xScaleTarget
            graphics.yScale += (graphics.yScaleTarget - graphics.yScale) * 0.1;
        }
        if(graphics.xScale == null) {
            // assign initial xScale value
            graphics.xScale = graphics.xScaleTarget;
        } else {
            // exponentially ease-in xScale to xScaleTarget
            let temp = graphics.xScale;
            graphics.xScale += (graphics.xScaleTarget - graphics.xScale) * 0.1;
            // rescale xOffset accordingly to avoid weird jumps
            graphics.xOffset = (graphics.xOffset - graphics.canvas.width / 2) / temp * graphics.xScale + graphics.canvas.width / 2;
        }
        if(graphics.yOffsetTarget == null) {
            graphics.yOffsetTarget = graphics.yOffsetBasis;
        }

        let phraseIndexCenter = 0;
        let noteIndex = 0;

        // clamps phraseIndexCenter to a vaild range
        if(players[0].phraseIndex < 0) {
            phraseIndexCenter = 0;
        } else if (players[0].phraseIndex >= players[0].phraseSequence.length) {
            phraseIndexCenter = players[0].phraseSequence.length - 1;
        } else {
            phraseIndexCenter = players[0].phraseIndex;
        }

        if(players[0].phraseLength[phraseIndexCenter] * graphics.xScale > graphics.canvas.width) {
            // phrase is larger than screen, use follow-along plotting mode
            graphics.xOffsetTarget = graphics.canvas.width / 2 - (players[0].phraseLengthCummulative[players[0].phraseIndex] + players[0].phraseStep + graphics.timeFineStep) * graphics.xScale;

            if(graphics.xOffset == null) {
                // assign initial yOffset value
                graphics.xOffset = graphics.xOffsetTarget;
            } else {
                // exponentially ease-in xOffset to graphics.xOffsetTarget
                if(Math.abs(graphics.xOffsetTarget - graphics.xOffset) > 1) {
                    let delta = graphics.xOffsetTarget - graphics.xOffset;
                    graphics.xOffset += delta * 0.1;
                } else {
                    graphics.xOffset = graphics.xOffsetTarget;
                }
            }
            if(graphics.yOffset == null) {
                // assign initial yOffset value
                graphics.yOffset = graphics.yOffsetTarget;
            } else {
                // exponentially ease-in yOffset to graphics.yOffsetTarget
                graphics.yOffset += (graphics.yOffsetTarget - graphics.yOffset) * 0.1;
            }
        } else {
            // phrase is shorter than screen, use static plotting mode
            graphics.xOffsetTarget = graphics.canvas.width / 2 - players[0].phraseLength[phraseIndexCenter] * graphics.xScale / 2 - players[0].phraseLengthCummulative[phraseIndexCenter] * graphics.xScale;
            if(graphics.xOffset == null) {
                // assign initial xOffset value
                graphics.xOffset = graphics.xOffsetTarget;
            } else {
                // exponentially ease-in xOffset to graphics.xOffsetTarget
                graphics.xOffset += (graphics.xOffsetTarget - graphics.xOffset) * 0.1;
            }
            if(graphics.yOffset == null) {
                // assign initial yOffset value
                graphics.yOffset = graphics.yOffsetTarget;
            } else {
                // exponentially ease-in yOffset to graphics.yOffsetTarget
                graphics.yOffset += (graphics.yOffsetTarget - graphics.yOffset) * 0.1;
            }
        }

        // draw live bars
        for(let i = 0; i < players.length ; i++) {
            let xPos = graphics.xOffset + (players[i].phraseLengthCummulative[players[i].phraseIndex] + players[i].phraseStep + graphics.timeFineStep) * graphics.xScale;
            graphics.context.strokeStyle = "#000000";
            graphics.context.beginPath();
            graphics.context.moveTo(xPos, 0);
            graphics.context.lineTo(xPos, graphics.canvas.height);
            graphics.context.stroke();
        }

        graphics.context.fillStyle = "#000000";
        graphics.context.strokeStyle = "#000000";

        // draw center phrase
        let stepEnd = 0;
        let stepStart = 0;
        for(noteIndex = 0; noteIndex < players[0].phraseSequence[phraseIndexCenter].length; noteIndex++)  {
            stepStart = stepEnd;
            stepEnd += players[0].phraseSequence[phraseIndexCenter][noteIndex][0];
            if(players[0].phraseSequence[phraseIndexCenter][noteIndex].length == 2) {
                let xPos = graphics.xOffset + (players[0].phraseLengthCummulative[phraseIndexCenter] + stepStart) * graphics.xScale;
                let yPos = graphics.yOffset - players[0].phraseSequence[phraseIndexCenter][noteIndex][1] * graphics.yScale;
                let xSize = (stepEnd - stepStart) * graphics.xScale - (noteIndex == players[0].phraseSequence[phraseIndexCenter].length - 1 ? 0 : 2);
                let ySize = graphics.yScale;
                graphics.context.fillRect(xPos, yPos, xSize, ySize);
            }
        }
        // draw central phrase separator line
        let xPos = graphics.xOffset + players[0].phraseLengthCummulative[phraseIndexCenter] * graphics.xScale;
        graphics.context.beginPath();
        graphics.context.moveTo(xPos, 0);
        graphics.context.lineTo(xPos, graphics.canvas.height);
        graphics.context.stroke();

        let phraseIndex = phraseIndexCenter + 1;
        let visible = true;
        noteIndex = 0;
        while(visible && phraseIndex < players[0].phraseSequence.length) {
            // loop through phrase indicies until not visible, incrementing from the center
            stepEnd = 0;
            stepStart = 0;
            while(visible && noteIndex < players[0].phraseSequence[phraseIndex].length) {
                // draw visible notes
                // loop through note indicies & draw them until not visible
                stepStart = stepEnd;
                stepEnd += players[0].phraseSequence[phraseIndex][noteIndex][0];
                let xPos = graphics.xOffset + (players[0].phraseLengthCummulative[phraseIndex] + stepStart) * graphics.xScale;
                let yPos = graphics.yOffset - players[0].phraseSequence[phraseIndex][noteIndex][1] * graphics.yScale;
                let xSize = (stepEnd - stepStart) * graphics.xScale - (noteIndex == players[0].phraseSequence[phraseIndex].length - 1 ? 0 : 2);
                let ySize = graphics.yScale;
                graphics.context.fillRect(xPos, yPos, xSize, ySize);
                // set as non-visible if last note starts out of screen
                visible = xPos < graphics.canvas.width;
                noteIndex++;
            }
            // draw phrase separation line
            let xPos = graphics.xOffset + players[0].phraseLengthCummulative[phraseIndex] * graphics.xScale;
            graphics.context.beginPath();
            graphics.context.moveTo(xPos, 0);
            graphics.context.lineTo(xPos, graphics.canvas.height);
            graphics.context.stroke();

            noteIndex = 0;
            phraseIndex++;
        }

        if(visible) {
            // this is only true if the last phrase is entirely visible
            // draw the last phrase separation bar
            let xPos = graphics.xOffset + (players[0].phraseLengthCummulative[players[0].phraseSequence.length - 1] + players[0].phraseLength[players[0].phraseSequence.length - 1]) * graphics.xScale;
            graphics.context.beginPath();
            graphics.context.moveTo(xPos, 0);
            graphics.context.lineTo(xPos, graphics.canvas.height);
            graphics.context.stroke();
        }

        phraseIndex = phraseIndexCenter - 1;
        visible = true;
        while(visible && phraseIndex > -1) {
            // loop through phrase indicies until not visible, decrementing from the center
            noteIndex = players[0].phraseSequence[phraseIndex].length - 1;
            stepEnd = players[0].phraseLength[phraseIndex];
            stepStart = 0;
            while(visible && noteIndex > -1) {
                // draw visible notes
                // loop through note indicies & draw them until not visible
                stepStart = stepEnd;
                stepEnd -= players[0].phraseSequence[phraseIndex][noteIndex][0];
                let xPos = graphics.xOffset + (players[0].phraseLengthCummulative[phraseIndex] + stepStart) * graphics.xScale;
                let yPos = graphics.yOffset - players[0].phraseSequence[phraseIndex][noteIndex][1] * graphics.yScale;
                let xSize = (stepEnd - stepStart) * graphics.xScale + (noteIndex == 0 ? 0 : 2);
                let ySize = graphics.yScale;
                graphics.context.fillRect(xPos, yPos, xSize, ySize);
                // set as non-visible if last note ended out of screen
                visible = xPos > 0;
                noteIndex--;
            }
            // draw phrase separation line
            let xPos = graphics.xOffset + players[0].phraseLengthCummulative[phraseIndex] * graphics.xScale;
            graphics.context.beginPath();
            graphics.context.moveTo(xPos, 0);
            graphics.context.lineTo(xPos, graphics.canvas.height);
            graphics.context.stroke();

            noteIndex = 0;
            phraseIndex--;
        }
    }
}

// encapsulation of all bindings-related things
function Bindings() {
    var bindings = this;

    this.inactivityTimer = null;

    this.resetInactivityTimer = function() {
        // resets inactivity timer
        clearTimeout(this.inactivityTimer);
        this.inactivityTimer = setTimeout(this.onInactivtyDetected, 120000);
    }

    this.onInactivtyDetected = function() {
        // called when user is inactive
        console.log("Inactivity detected");
        players[0].setPhrase(-1);
        communications.setPhraseRequest(-1);
        graphics.setTutorial(0);
        bindings.tutorial(0);
    }

    this.score = function() {
        // bindings for score player
        document.onkeydown = function(event) {
            bindings.resetInactivityTimer();
            event = event || window.event;

            if (event.keyCode == '38') {
                // up arrow
                players[0].octaveUp();
                communications.octaveUpRequest();
            } else if (event.keyCode == '40') {
                // down arrow
                players[0].octaveDown();
                communications.octaveDownRequest();
            } else if (event.keyCode == '37') {
                // left arrow
                players[0].prevPhrase();
                communications.prevPhraseRequest();
            } else if (event.keyCode == '39') {
                // right arrow
                players[0].nextPhrase();
                communications.nextPhraseRequest();
            } else if (event.keyCode == '32') {
                // space bar
                players[0].restartPhrase();
                communications.restartPhraseRequest();
            } else if (event.shiftKey) {
                // shift
                graphics.xScaleCycle();
            }
        }
    }
    this.tutorial = function(step) {
        switch(step) {
            case 0:
                // bindings for first tutorial screen
                document.onkeydown = function(event) {
                    bindings.resetInactivityTimer();
                    event = event || window.event;
                    if(event.key == "l") {
                        graphics.switchLanguage();
                    } else if (event.keyCode == '39') {
                        // right arrow
                        graphics.onAnimationFrame = [
                            function() {graphics.clear()},
                            function() {graphics.drawScore()},
                            function() {graphics.drawTutorial()}
                        ];
                        if(!audio.contextReady) {
                            audio.createContext();
                        }
                        players[0].setPhrase(0);
                        communications.nextPhraseRequest();
                        graphics.nextTutorial();
                        bindings.tutorial(1);
                    } else if (event.keyCode == '27') {
                        // escape
                        graphics.onAnimationFrame = [
                            function() {graphics.clear()},
                            function() {graphics.drawScore()},
                            function() {graphics.drawTutorial()}
                        ];
                        if(!audio.contextReady) {
                            audio.createContext();
                        }
                        players[0].setPhrase(0);
                        communications.nextPhraseRequest();
                        graphics.prevTutorial();
                        bindings.score();
                    }
                }
                break;
            case 1:
                // bindings for second tutorial screen
                document.onkeydown = function(event) {
                    bindings.resetInactivityTimer();
                    event = event || window.event;

                    if (event.keyCode == '37') {
                        // left arrow
                        players[0].prevPhrase();
                        communications.prevPhraseRequest();
                        graphics.nextTutorial();
                        bindings.tutorial(2);
                    }
                    else if (event.keyCode == '39') {
                        // right arrow
                        players[0].nextPhrase();
                        communications.nextPhraseRequest();
                        graphics.nextTutorial();
                        bindings.tutorial(2);
                    }
                }
                break;
            case 2:
                // bindings for third tutorial screen
                document.onkeydown = function(event) {
                    bindings.resetInactivityTimer();
                    event = event || window.event;

                    if (event.keyCode == '38') {
                        // up arrow
                        players[0].octaveUp();
                        communications.octaveUpRequest();
                        graphics.nextTutorial();
                        bindings.tutorial(3);
                    } else if (event.keyCode == '40') {
                        // down arrow
                        players[0].octaveDown();
                        communications.octaveDownRequest();
                        graphics.nextTutorial();
                        bindings.tutorial(3);
                    } else if (event.keyCode == '37') {
                        // left arrow
                        players[0].prevPhrase();
                        communications.prevPhraseRequest();
                    }
                    else if (event.keyCode == '39') {
                        // right arrow
                        players[0].nextPhrase();
                        communications.nextPhraseRequest();
                    }
                }
                break;
            case 3:
                // bindings for fourth tutorial screen
                document.onkeydown = function(event) {
                    bindings.resetInactivityTimer();
                    event = event || window.event;

                    if (event.keyCode == '38') {
                        // up arrow
                        players[0].octaveUp();
                        communications.octaveUpRequest();
                    } else if (event.keyCode == '40') {
                        // down arrow
                        players[0].octaveDown();
                        communications.octaveDownRequest();
                    } else if (event.keyCode == '37') {
                        // left arrow
                        players[0].prevPhrase();
                        communications.prevPhraseRequest();
                    }
                    else if (event.keyCode == '39') {
                        // right arrow
                        players[0].nextPhrase();
                        communications.nextPhraseRequest();
                    } else if (event.keyCode == '32') {
                        // space bar
                        players[0].restartPhrase();
                        communications.restartPhraseRequest();
                        graphics.nextTutorial();
                        bindings.tutorial(4);
                    }
                }
                break;
            case 4:
                // bindings for fifth tutorial screen
                document.onkeydown = function(event) {
                    bindings.resetInactivityTimer();
                    event = event || window.event;

                    if (event.keyCode == '38') {
                        // up arrow
                        players[0].octaveUp();
                        communications.octaveUpRequest();
                    } else if (event.keyCode == '40') {
                        // down arrow
                        players[0].octaveDown();
                        communications.octaveDownRequest();
                    } else if (event.keyCode == '37') {
                        // left arrow
                        players[0].prevPhrase();
                        communications.prevPhraseRequest();
                    }
                    else if (event.keyCode == '39') {
                        // right arrow
                        players[0].nextPhrase();
                        communications.nextPhraseRequest();
                    } else if (event.keyCode == '32') {
                        // space bar
                        players[0].restartPhrase();
                        communications.restartPhraseRequest();
                    } else if (event.shiftKey) {
                        // shift
                        graphics.yOffsetTarget = graphics.yOffsetBasis;
                        graphics.yScaleTarget = graphics.yScaleBasis;
                        graphics.xScaleCycle();
                        graphics.nextTutorial();
                        bindings.score();
                    }
                }
                break;
        }
    }
}

// encapsulation of all communications-related things
function Communications() {
    var socket = io();

    this.setPhraseRequest = function(phrase) {
        socket.emit("setPhraseRequest", players[0].id, phrase);
    }

    this.nextPhraseRequest = function() {
        socket.emit("nextPhraseRequest", players[0].id);
    }

    this.prevPhraseRequest = function() {
        socket.emit("prevPhraseRequest", players[0].id);
    }

    this.restartPhraseRequest = function() {
        socket.emit("restartPhraseRequest", players[0].id);
    }

    this.octaveUpRequest = function() {
        socket.emit("octaveUpRequest", players[0].id);
    }

    this.octaveDownRequest = function() {
        socket.emit("octaveDownRequest", players[0].id);
    }

    socket.on("setPhraseRequest", function(target, phrase) {
        let found = false;
        let i = 0;
        while(!found && i < players.length) {
            if(players[i].id == target) {
                found = true;
                players[i].setPhrase(phrase);
            }
            i++;
        }
        if(found) {
            console.log("Recieved valid set phrase request for " + target);
        } else {
            console.log("Recieved invalid set phrase request for " + target);
        }
        console.log(players);
    })

    socket.on("nextPhraseRequest", function(target) {
        let found = false;
        let i = 0;
        while(!found && i < players.length) {
            if(players[i].id == target) {
                found = true;
                players[i].nextPhrase();
            }
            i++;
        }
        if(found) {
            console.log("Recieved valid next phrase request for " + target);
        } else {
            console.log("Recieved invalid next phrase request for " + target);
        }
        console.log(players);
    })

    socket.on("prevPhraseRequest", function(target) {
        let found = false;
        let i = 0;
        while(!found && i < players.length) {
            if(players[i].id == target) {
                found = true;
                players[i].prevPhrase();
            }
            i++;
        }
        if(found) {
            console.log("Recieved valid next phrase request for " + target);
        } else {
            console.log("Recieved invalid next phrase request for " + target);
        }
        console.log(players);
    })

    socket.on("restartPhraseRequest", function(target) {
        let found = false;
        let i = 0;
        while(!found && i < players.length) {
            if(players[i].id == target) {
                found = true;
                players[i].restartPhrase();
            }
            i++;
        }
        if(found) {
            console.log("Recieved valid restart phrase request for " + target);
        } else {
            console.log("Recieved invalid restart phrase request for " + target);
        }
        console.log(players);
    })

    socket.on("octaveUpRequest", function(target) {
        let found = false;
        let i = 0;
        while(!found && i < players.length) {
            if(players[i].id == target) {
                found = true;
                players[i].octaveUp();
            }
            i++;
        }
        if(found) {
            console.log("Recieved valid octave up request for " + target);
        } else {
            console.log("Recieved invalid octave up request for " + target);
        }
        console.log(players);
    })

    socket.on("octaveDownRequest", function(target) {
        let found = false;
        let i = 0;
        while(!found && i < players.length) {
            if(players[i].id == target) {
                found = true;
                players[i].octaveDown();
            }
            i++;
        }
        if(found) {
            console.log("Recieved valid octave down request for " + target);
        } else {
            console.log("Recieved invalid octave down request for " + target);
        }
        console.log(players);
    })

    socket.on("connect", function() {
        players[0].id = socket.id;
        socket.emit("dumpOutInitial", players[0].dumpOut());

        console.log("Player connected " + socket.id);
    });

    socket.on("dumpRequest", function(target) {
        // data dump request
        socket.emit("dumpOutRequested", [players[0].dumpOut(), target]);

        console.log("Recieved dump request for target " + target);
        console.log(players);

    });

    socket.on("dumpInInitial", function(data) {
        // data dump from new player recieved by old player
        let temp = new Player();
        temp.dumpIn(data);
        players.push(temp);
        audio.updateNodes();

        console.log("Recieved initial dump in from player " + data[0]);
        console.log(players);
    });

    socket.on("dumpInRequested", function(data) {
        // data dump from new player recieved by old player
        let temp = new Player();
        temp.dumpIn(data);
        players.push(temp);
        audio.updateNodes();

        console.log("Recieved requested dump in from player " + data[0]);
        console.log(players);
    });

    socket.on("dumpInGlobal", function(data) {
        // data dump from all old players recieved by new player
        players = [players[0]];
        for(let i = 0; i < data.length; i++) {
            let temp = new Player();
            temp.dumpIn(data[i]);
            players.push(temp);
        }
        audio.updateNodes();

        console.log("Recieved global dump");
        console.log(players);
    });

    socket.on("remove", function(target) {
        let found = false;
        let i = 0;
        while(!found && i < players.length) {
            if(players[i].id == target) {
                found = true;
                players.splice(i, 1);
                break;
            }
            i++;
        }
        if(found) {
            audio.updateNodes();
            console.log("Recieved valid removal of " + target);
        } else {
            console.log("Recieved invalid removal of " + target);
        }
        console.log(players);
    });

    socket.on("tick", function() {
        if(graphics.contextReady) {
            graphics.tick();
        }
        for(let i = 0; i < players.length; i++) {
            players[i].play();
            players[i].tick();
        }
        if(audio.contextReady) {
            audio.updatePan();
        }
    })
}

// initializing

var players = [new Player()];
var audio = new Audio();
var graphics = new Graphics();
var bindings = new Bindings();
var communications = null;

graphics.createContext();

if(!!window.chrome) {
    // supported browser
    graphics.onAnimationFrame = [
        function() {graphics.clear()},
        function() {graphics.drawTutorial()}
    ];

    communications = new Communications();
    bindings.tutorial(0);
} else {
    // unsupported browser
    graphics.onAnimationFrame = [
        function() {graphics.clear()},
        function() {graphics.drawBrowserError()},
        function() {graphics.stopAnimationFrame()},
        function() {throw new Error("unsupported browser")}
    ];
}
