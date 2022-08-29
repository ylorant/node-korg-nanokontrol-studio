const KorgNanoKontrolStudio = require('../index');
const Controls = require('../controls');

let dev = new KorgNanoKontrolStudio();

// Log debug messages
dev.on("debug", (msg) => console.log(msg));
dev.on("btnpress", (button) => dev.light(button, true));
dev.on("btnrelease", (button) => dev.light(button, false));
dev.on("jogwheel", (direction) => {
    let newScene = (dev.getCurrentScene() ?? 1);
    if(direction == Controls.JogwheelDirection.LEFT) {
        newScene--;
        if(newScene < 1) {
            newScene = 5;
        }
    } else {
        newScene++;
        
        if(newScene > 5) {
            newScene = 1;
        }
    }
    
    dev.setCurrentScene(newScene);
});

dev.connect();