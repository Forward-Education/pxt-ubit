/**
 * Use this file to define custom functions and blocks.
 * Read more at https://makecode.microbit.org/blocks/custom
 */

let _remoteLight: number = -999; // Variable to store the last received light level
let _waitingForLight: boolean = false; // Flag to indicate if we are currently waiting for a response
let _responseLight: boolean = false; // Flag to indicate if a response came back during the wait

let _remoteTemperature: number = -999; // Variable to store the last received temperature
let _waitingForTemperature: boolean = false; // Flag to indicate if we are currently waiting for a response
let _responseTemperature: boolean = false; // Flag to indicate if a response came back during the wait

let _remoteDirection: number = -999; // Variable to store the last received direction
let _waitingForDirection: boolean = false; // Flag to indicate if we are currently waiting for a response
let _responseDirection: boolean = false; // Flag to indicate if a response came back during the wait

let _remoteSound: number = -999; // Variable to store the last received sound level
let _waitingForSound: boolean = false; // Flag to indicate if we are currently waiting for a response
let _responseSound: boolean = false; // Flag to indicate if a response came back during the wait

// Stores the last received number
let lastReceivedNumber = "";

let BUFF_LEN = 50;
let I2C_TIME_INTERVAL = 500;
let col = 0;
let row = 0;
let str = "";
let StopI2CScreen = 0;

let newLedMatrix = pins.createBuffer(25);
let lastLedMatrix = pins.createBuffer(25);

// Padding function
function padEnd(message: string, length: number, char: string) {
    while (message.length < length) {
        message = "" + message + char;
    }
    return message;
}

// Transforms string to buffer, pads it, and sends it to the UBit
function sendWiFiBuffer(message1: string, message2: string) {
    // Construct the formatted message with '?' at positions
    let finalMessage = "?" + message1 + "?" + message2 + "?";

    // Pad the message to BUFF_LEN with spaces
    finalMessage = padEnd(finalMessage, BUFF_LEN, " ");

    // Create the buffer
    let buffer2 = pins.createBuffer(BUFF_LEN);
    for (let i = 0; i < BUFF_LEN; i++) {
        buffer2.setNumber(NumberFormat.UInt8LE, i, finalMessage.charCodeAt(i));
    }

    // Send buffer via I2C
    pins.i2cWriteBuffer(7, buffer2, false);
}

// Transforms string to buffer, pads it, and sends it to the UBit
function sendTextBuffer(message: string) {
    // Ensure the message does not exceed BUFF_LEN - 1 to make space for '%'
    if (message.length > BUFF_LEN - 1) {
        message = message.slice(0, BUFF_LEN - 1);
    }

    // Add '%' at the start and shift the message
    message = "%" + message + "%";

    // Pad the message to BUFF_LEN with spaces
    message = padEnd(message, BUFF_LEN, " ");

    let buffer2 = pins.createBuffer(BUFF_LEN);
    for (let i = 0; i < BUFF_LEN; i++) {
        buffer2.setNumber(NumberFormat.UInt8LE, i, message.charCodeAt(i));
    }

    // Send buffer via I2C
    pins.i2cWriteBuffer(7, buffer2, false);
}

function copyBuffer(original: Buffer): Buffer {
    let copy = pins.createBuffer(original.length);
    copy.write(0, original);
    return copy;
}

function isAllZero(buffer: Buffer) {
    // Iterates through the buffer and returns true if all values are 0
    for (let i = 0; i < buffer.length; i++) {
        if (buffer[i] !== 0) {
            return false; // If a non-zero value is found, return false
        }
    }
    return true; // If all values are 0, return true
}

// Transforms the string to buffer, pads it, and sends it to the UBit.
// Ensures the first character is # as it is an icon.
function sendIconBuffer() {
    let LedMatrix = pins.createBuffer(25);
    let buffer2 = pins.createBuffer(BUFF_LEN);

    for (let i = 0; i <= 24; i++) {
        row = Math.floor(i / 5);
        col = i % 5;
        LedMatrix.setNumber(
            NumberFormat.UInt8LE,
            i,
            led.point(row, col) ? 1 : 0,
        );
    }

    if (!LedMatrix.equals(lastLedMatrix) || isAllZero(LedMatrix)) {
        lastLedMatrix = copyBuffer(LedMatrix);
        return;
    }

    // Place '#' at the first position
    buffer2.setNumber(NumberFormat.UInt8LE, 0, "#".charCodeAt(0));

    // Copy the 25-byte matrixBuffer into buffer2, shifting to the right
    for (let i = 0; i < 25; i++) {
        buffer2.setNumber(
            NumberFormat.UInt8LE,
            i + 1,
            LedMatrix.getNumber(NumberFormat.UInt8LE, i),
        );
    }

    // Fill the rest with spaces (ASCII 32)
    for (let i = 26; i < BUFF_LEN; i++) {
        buffer2.setNumber(NumberFormat.UInt8LE, i, " ".charCodeAt(0));
    }

    // Send the buffer via I2C
    pins.i2cWriteBuffer(7, buffer2, false);
}

// Function to handle different messages
function handleMessage(msg: string): void {
    if (msg == "Tem") {
        radio.sendValue("Tem", input.temperature());
    } else if (msg == "Lig") {
        radio.sendValue("Lig", input.lightLevel());
    } else if (msg == "Sou") {
        radio.sendValue("Sou", input.soundLevel());
    } else if (msg == "Dir") {
        radio.sendValue("Dir", input.compassHeading());
    } else if (msg == "-1") {
        radio.sendString("Hello!");
    }
}

/**
 * Custom blocks for UBit extension
 */
//% weight=100 color=#226F54 icon="\uf29a"
namespace UBit {
    /**
     * Plays the text or number via audio on the UBit and displays it on the screen.
     */
    //% block="Show string $message with audio"
    //% message.shadow="text"
    export function RepTextwithScreen(message: string | number) {
        let textString;
        if (typeof message !== "string") {
            textString = message.toString();
        } else {
            textString = message;
        }
        StopI2CScreen = 1;
        sendTextBuffer(textString);
        basic.showString(textString);
        StopI2CScreen = 0;
    }

    /**
     * Plays the written text via audio on the UBit.
     */
    //% block="Play $message via audio"
    //% message.shadow="text"
    export function RepText(message: string) {
        StopI2CScreen = 1;
        sendTextBuffer(message);
        StopI2CScreen = 0;
    }

    /**
     * Connects the UBit to the desired network.
     * If this block is not used, it will connect to the Ceibal network.
     */
    //% block="Connect to network $WiFi with password $Pssw"
    export function ConWiFi(WiFi: string, Pssw: string) {
        StopI2CScreen = 1;
        sendWiFiBuffer(WiFi, Pssw);
        StopI2CScreen = 0;
        str = "";
    }

    /**
     * Plays the number via audio on the UBit and displays it on the screen.
     */
    //% block="Show number $message with audio"
    export function RepNumtwithScreen(message: number) {
        let textString = message.toString();
        StopI2CScreen = 1;
        sendTextBuffer(textString);
        basic.showString(textString);
        StopI2CScreen = 0;
    }

    /**
     * Enables/disables audio output for the
     * icons shown on the micro:bit display.
     */
    //% block="Enable icons with audio $yes"
    //% yes.shadow="toggleOnOff"
    export function Icon(yes: boolean) {
        if (yes) {
            loops.everyInterval(I2C_TIME_INTERVAL, function () {
                if (StopI2CScreen == 0) {
                    sendIconBuffer();
                }
            });
        }
    }

    /**
     * Get the temperature in Celsius from a specified remote micro:bit.
     */
    //% block="Temperature (°C) from external micro:bit"
    export function getTemperature(): number {
        _remoteTemperature = -999;
        _waitingForTemperature = true;
        _responseTemperature = false;

        radio.sendString("Tem");

        const startTime = control.millis();
        const timeout = 1000;

        while (control.millis() - startTime < timeout) {
            if (_responseTemperature) {
                return _remoteTemperature;
            }
            basic.pause(20);
        }

        _waitingForTemperature = false;
        return -999;
    }

    /**
     * Get the light level from an external micro:bit.
     */
    //% block="Light level from external micro:bit"
    export function getLight(): number {
        _remoteLight = -999;
        _waitingForLight = true;
        _responseLight = false;

        radio.sendString("Lig");

        const startTime = control.millis();
        const timeout = 1000;

        while (control.millis() - startTime < timeout) {
            if (_responseLight) {
                return _remoteLight;
            }
            basic.pause(20);
        }

        _waitingForLight = false;
        return -999;
    }

    /**
     * Get the sound level from an external micro:bit.
     */
    //% block="Sound level from external micro:bit"
    export function getSound(): number {
        _remoteSound = -999;
        _waitingForSound = true;
        _responseSound = false;

        radio.sendString("Sou");

        const startTime = control.millis();
        const timeout = 1000;

        while (control.millis() - startTime < timeout) {
            if (_responseSound) {
                return _remoteSound;
            }
            basic.pause(20);
        }

        _waitingForSound = false;
        return -999;
    }

    /**
     * Get the compass heading from an external micro:bit.
     */
    //% block="Compass heading from external micro:bit"
    export function getDirection(): number {
        _remoteDirection = -999;
        _waitingForDirection = true;
        _responseDirection = false;

        radio.sendString("Dir");

        const startTime = control.millis();
        const timeout = 1000;

        while (control.millis() - startTime < timeout) {
            if (_responseDirection) {
                return _remoteDirection;
            }
            basic.pause(20);
        }

        _waitingForDirection = false;
        return -999;
    }

    /**
     * Use sensors from an external micro:bit on the specified channel.
     */
    //% block="Use sensors from external micro:bit $channel"
    //% channel.min=1 channel.max=255
    export function ExternalSensors(channel: number) {
        radio.setGroup(channel);

        radio.onReceivedValue(function (tag, value) {
            if (_waitingForLight && tag == "Lig") {
                _remoteLight = value;
                _responseLight = true;
                _waitingForLight = false;
            }
            if (_waitingForTemperature && tag == "Tem") {
                _remoteTemperature = value;
                _responseTemperature = true;
                _waitingForTemperature = false;
            }
            if (_waitingForDirection && tag == "Dir") {
                _remoteDirection = value;
                _responseDirection = true;
                _waitingForDirection = false;
            }
            if (_waitingForSound && tag == "Sou") {
                _remoteSound = value;
                _responseSound = true;
                _waitingForSound = false;
            }
        });
    }

    /**
     * Executes an action when a specific gesture is received via radio.
     */
    //% block="When external micro:bit is $gesture"
    //% gesture.defl=Gesture.Shake
    export function onGestureReceived(
        gesture: Gesture,
        handler: () => void,
    ): void {
        control.onEvent(4001, EventBusValue.MICROBIT_EVT_ANY, function () {
            let receivedGesture = control.eventValue();
            if (receivedGesture === gesture) {
                handler();
            }
        });
    }

    /**
     * Selects a radio channel to send the data requested by
     * the micro:bit connected to the UBit.
     */
    //% block="Share sensors with UBit $int"
    //% int.min=1 int.max=255
    export function shareSensorsWithUBit(int: number): void {
        radio.setGroup(int);

        radio.onReceivedString(function (msg: string) {
            handleMessage(msg);
        });

        control.onEvent(
            EventBusSource.MICROBIT_ID_GESTURE,
            EventBusValue.MICROBIT_EVT_ANY,
            function () {
                let gesture = control.eventValue();
                radio.raiseEvent(4001, gesture);
            },
        );
    }
}
