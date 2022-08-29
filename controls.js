const { Console } = require("console");

const Controls = {};

Controls.Buttons = {
    CYCLE: 54,
    SET: 55,
    MARKER_PREV: 56,
    MARKER_NEXT: 57,
    REWIND: 58,
    FASTFORWARD: 59,
    TRACK_PREV: 60,
    TRACK_NEXT: 61,
    PREVIOUS: 62,
    STOP: 63,
    PLAY: 80,
    RECORD: 81,
};

Controls.Jogwheel = 82;
Controls.Buttons.Lanes = [];
Controls.Rotaries = [];
Controls.Sliders = [];

let laneTemplate = {
    MUTE: 21,
    SOLO: 29,
    REC: 38,
    SELECT: 46
};

let rotaryBaseIndex = 13;
let sliderBaseIndex = 2;

// Fill all the lanes with their controls
for(let i = 0; i < 8; i++) {
    let lane = Object.assign({}, laneTemplate);

    for(let j in lane) {
        lane[j] += i;
    }

    Controls.Buttons.Lanes[i] = lane;
    Controls.Rotaries[i] = rotaryBaseIndex + i;
    Controls.Sliders[i] = sliderBaseIndex + i;
}

// Specific case: Solo for lanes 4-8 are up 1 from usual to free up CC 32
for(let i = 0; i <= 4; i++) {
    Controls.Buttons.Lanes[3 + i].SOLO++;
}

// Specific case: by default the code for the 8th lane slider is not following the pattern
// so we have to set it manually
Controls.Sliders[5] = 8;
Controls.Sliders[6] = 9;
Controls.Sliders[7] = 12;

Controls.PressStatus = {
    OFF: 0,
    ON: 127
};

Controls.JogwheelDirection = {
    LEFT: "left",
    RIGHT: "right"
};

Controls.ButtonNames = {};

for(let [buttonName, buttonCode] of Object.entries(Controls.Buttons)) {
    if(buttonName != "Lanes") {
        Controls.ButtonNames[buttonCode] = buttonName[0] + buttonName.toLowerCase().substring(1);
    }
}

for(let lane of Controls.Buttons.Lanes.keys()) {
    for(let [buttonName, buttonCode] of Object.entries(Controls.Buttons.Lanes[lane])) {
        Controls.ButtonNames[buttonCode] = "Lane" + lane + buttonName[0] + buttonName.toLowerCase().substring(1);
    }
}

// Checks if a code is identifying a button press
Controls.Buttons.match = function(code) {
    return Object.keys(Controls.ButtonNames).includes(code.toString());
};

module.exports = Controls;