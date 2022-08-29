# Korg NanoKONTROL Studio NodeJS Interface

This library is a NodeJS interface to the Korg NanoKONTROL MIDI control surface.
It allows to capture button presses, rotary and sliders moves, and jogwheel action.
It also allows to read scene changes and set the current scene on the device scene function.

This library assumes for all its settings that the used Korg NanoKONTROL Studio is using the
default configuration in the Assignable mode (direct MIDI). For lighting from the library to
be available, the device must be configured to use External LED lighting on the Common scene
configuration (for each scene where it is wanted).

## Install

Install it through npm:

```bash
npm install korg-nanokontrol-studio
```

## Usage

Using the interface is done through the main KorgNanoKontrolStudio class, that exposes 
EventEmitter event binding for actions and some control methods.

You can also use the `controls` object to access quickly constants to identify controls.

```javascript
const KorgNanoKontrolStudio = require('korg-nanokontrol-studio');

// By default, the library will try to auto-discover the 
let dev = new KorgNanoKontrolStudio();
dev.connect();

// Basic test: light up whatever button the user is pressing
dev.on('btnpress', (btn) => dev.light(btn, true));
dev.on('btnrelease', (btn) => dev.light(btn, false));
```

To debug the communication and internal working of the library, you can use the `debug`
event to track messages:

```javascript
dev.on('debug', (msg) => console.log(msg));
```