const EventEmitter = require('events');
const Midi = require('midi');
const { runInThisContext } = require('vm');
const Controls = require('./controls');

const CMD_CC = 176;
const CMD_NOTE = 144;
const CHANNEL_COUNT = 16;
const JOG_PIVOT_VAL = 64;

class KorgNanoKontrolStudio extends EventEmitter
{
    constructor()
    {
        super();

        // Midi devices
        this.input = new Midi.Input();
        this.output = new Midi.Output();

        this.input.on("message", this.onMidiMessage.bind(this));
    }

    /**
     * Gets the available MIDI devices.
     * 
     * @returns object The list of available devices as an object with "input" and "output" keys for sorting.
     */
    getDevices()
    {
        let count = 0;
        let i;
        let devices = {input: {}, output: {}};


        // Count the available input ports.
        this.emit("debug", "Discovering input devices:");
        count = this.input.getPortCount();

        for(i = 0; i < count; i++) {
            let deviceName = this.input.getPortName(i);
            let debugMsg = i + ": " + deviceName;

            if(deviceName.match(/nanoKONTROL Studio/i)) {
                devices.input[i] = deviceName;
                debugMsg += " (match)";
            }

            this.emit("debug", debugMsg);
        }

        // Count the available output ports.
        this.emit("debug", "Discovering output devices:");
        count = this.output.getPortCount();

        for(i = 0; i < count; i++) {
            var deviceName = this.output.getPortName(i);
            let debugMsg = i + ": " + deviceName;

            if(deviceName.match(/nanoKONTROL Studio/i)) {
                devices.output[i] = deviceName;
                debugMsg += " (match)";
            }

            this.emit("debug", debugMsg);
        }

        return devices;
    }

    /**
     * Connects to the X-Touch. If no input/output device is provided, it will be auto-guessed.
     * 
     * @param {int} midiInput Midi input device number.
     * @param {int} midiOutput Midi output device number.
     */
    connect(midiInput = null, midiOutput = null)
    {
        // Auto-discover devices if needed
        if(!midiInput || !midiOutput) {
            let devices = this.getDevices();
            
            if(!midiInput) {
                this.emit("debug", "No input device ID provided, auto-discovering it.");
                midiInput = parseInt(Object.keys(devices.input)[0]);
            }
            
            if(!midiOutput) {
                this.emit("debug", "No output device ID provided, auto-discovering it.");
                midiOutput = parseInt(Object.keys(devices.output)[0]);
            }
        }
        
        if(!midiInput || !midiOutput) {
            this.emit("error", "No device discovered.");
            return;
        }

        this.emit("debug", "Input device: " + midiInput);
        this.emit("debug", "Output device: " + midiOutput);

        try {
            this.input.openPort(midiInput);
            this.output.openPort(midiOutput);
        } catch(e) {
            this.emit("error", e);
            this.emit("debug", "Cannot open MIDI port: " + e.message);
        }

        // Allow catching SysEx messages 
        this.input.ignoreTypes(false, true, true);
        this.currentScene = null;
    }

    /**
     * Callback on MIDI message received.
     * 
     * @param {float} deltaTime Time since last event on the track
     * @param {array} msg The received message
     */
    onMidiMessage(deltaTime, msg)
    {
        switch(msg.length) {
            // SysEx message 
            case 12: this.handleSysExMessage(msg); break;
            // Standard MIDI message
            case 3: this.handleStdMessage(msg); break;
        }
    }

    /**
     * Handles SysEx messages, which are only scene changes.
     * 
     * @param msg The message to handle
     */
    handleSysExMessage(msg)
    {
        this.emit("debug", "SysEx message: " + msg);

        let newScene = msg[10] + 1;
        this.currentScene = newScene;
        this.emit("debug", "Scene change: " + newScene)
        this.emit("sceneChange", newScene);
    }

    /**
     * Handles all standard messages, which means button presses, jogwheel, rotary & slider moves
     * 
     * @param {array} msg The message
     * @returns void
     */
    handleStdMessage(msg)
    {
        // Extract components from the MIDI command
        let [cmdType, target, value] = msg;
        let channel = null; 

        this.emit("debug", "MIDI message: " + msg);

        if((cmdType >= CMD_CC && cmdType < CMD_CC + CHANNEL_COUNT)) {
            channel = cmdType - CMD_CC + 1; // Add 1 to set the MIDI channel to 1-16
        } else if (cmdType >= CMD_NOTE && cmdType < CMD_NOTE + CHANNEL_COUNT) {
            channel = cmdType - CMD_NOTE + 1; // Add 1 to set the MIDI channel to 1-16
        } else {
            return; // Midi message is not understood, stop handling.
        }

        // Button presses
        if(Controls.Buttons.match(target)) {
            let eventName = value == Controls.PressStatus.ON ? "btnpress" : "btnrelease";
            this.emit("debug", "Button " + eventName.substring(3) + ": " + Controls.ButtonNames[target]);
            this.emit(eventName, target);
        } else if (Controls.Rotaries.includes(target)) {
            let rotary = Controls.Rotaries.indexOf(target);
            this.emit("debug", "Rotary " + rotary + ": " + value);
            this.emit("rotary", rotary, value);
        } else if (Controls.Sliders.includes(target)) {
            let slider = Controls.Sliders.indexOf(target);
            this.emit("debug", "Slider " + slider + ": " + value);
            this.emit("slider", slider, value);
        } else if(target == Controls.Jogwheel) {
            let direction = value < JOG_PIVOT_VAL ? Controls.JogwheelDirection.RIGHT : Controls.JogwheelDirection.LEFT;

            this.emit("debug", "Jogwheel: " + direction);
            this.emit("jogwheel", direction);
        }
    }

    /**
     * Gets the current scene.
     * 
     * @returns int The current scene
     */
    getCurrentScene()
    {
        return this.currentScene;
    }

    /**
     * Sets the scene on the device.
     * 
     * @param int scene The scene number, between 1 and 5.
     */
    setCurrentScene(scene)
    {
        this.currentScene = scene;
        let sysExCommand = [0x02, 0x00, 0x00, 0x14, scene - 1];
        this.sendSysExMessage(sysExCommand);
    }

    /**
     * Changes the light status of a button. Use the Controls constants to select the button and its status.
     * 
     * @param {int} button The button to light up (or down).
     * @param {int} status The button status. 
     */
    light(button, status)
    {
        this.emit("debug", "Setting button light: " + Controls.ButtonNames[button] + " to " + (status ? "on" : "off"));
        this.output.sendMessage([CMD_CC, button, status ? Controls.PressStatus.ON : Controls.PressStatus.OFF]);
    }

    /**
     * Sends a SysEx message to the device.
     * 
     * @param {array} msg The SysEx msg.
     */
     sendSysExMessage(msg)
     {
         // Build the SysEx frame
         let frame = [0xF0, 0x42, 0x40, 0x00, 0x01, 0x37];
 
         for(let byte of msg) {
             frame.push(byte);
         }
 
         frame.push(0xF7);
 
         // Send it
         this.output.sendMessage(frame);
     }
}

module.exports = KorgNanoKontrolStudio;