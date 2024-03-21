(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
// browserify app.js -o bundle.js
window.MediaRecorder = require("audio-recorder-polyfill");


// DOM elements
var recordingsSubtitle = document.getElementById('recordings-subtitle')
var recordings = document.getElementById('recordings')
var recordprogress =  document.getElementById('recordprogress');
var uploadprogress =  document.getElementById('uploadprogress');
var submit = document.getElementById('submit');
var currentword =  document.getElementById('currentword');
var recstart = document.getElementById('recstart');
var recstop = document.getElementById('recstop');
var recicon = document.getElementById('recicon');
var errornotification = document.getElementById('errornotification');
var errormsg = document.getElementById('errormsg');
var stopicon = document.getElementById('stopicon');
var recmessage = document.getElementById('recmessage');
var stopmessage = document.getElementById('stopmessage');
var canvas = document.getElementById('visualizer');
var recordingscompletemsg = document.getElementById('recordingscompletemsg');

// // Word variables
const wantedWords = [' '];
//   'Testing 1, 2, 3.',
//   'Yes',
//   'No',
//   'Hey Swansea',
//   'Abertawe',
//   'Question',
//   'Answer',
//   'OK',
// ];

//create a copy to keep track of remaining words
var remainingWords = wantedWords.slice();
// Number of recorded words
var recordedWords = 0;

// Audio Recording Variables
var microphone = null;
var analyzerNode = null;
var frequencyBins = null;
var AudioContext = window.AudioContext || window.webkitAudioContext;
var audioContext = new AudioContext();
var sourceNode = null;
var outputNode = null;
var recorder = null;
var chunks = [];
var frequencyBins =null;
var jsNode = null;

var recorderStartListener = null;
var recorderStopListener = null;
var recorderDataAvailableListener = null;

// var preferredFormat = 'audio/ogg; codecs=opus';
// var audioFormatTest = document.createElement('audio');
// var audioFormat = audioFormatTest.canPlayType(preferredFormat) ? preferredFormat : 'audio/wave';
// Sticking to wav for max compatibility
var audioFormat = 'audio/wav';
var blob = null;
var constraints = { audio: true };

// Visualizer
var canvasCtx = canvas.getContext("2d");

// function sleep(ms) {
//   return new Promise(resolve => setTimeout(resolve, ms));
// }

// Util functions
function debugLog(message) {
  console.log(message);
  //document.querySelector('.debug').innerText += message + "\n";
}
function isAllRecorded() {
  return remainingWords.length === 0;
}
function startRecording() {
  if (microphone === null) {
    initmic();
  } else {
    recordAudio();
  }
}

function isRecording() {
  if(recorder != null) {
    return recorder.state === 'recording';
  }
  return false;
}
var isUploading = false;

function updateUI() {
  recordingsSubtitle.classList.toggle("is-hidden", recordings.childNodes.length > 0 );
  recstart.classList.toggle("is-hidden", isAllRecorded());
  visualizer.classList.toggle("is-hidden", isAllRecorded());
  recordprogress.classList.toggle("is-hidden", isAllRecorded());
  recordingscompletemsg.classList.toggle("is-hidden", !isAllRecorded());
  submit.classList.toggle("is-hidden", !isAllRecorded());
  submit.classList.toggle("is-loading", isUploading);
  uploadprogress.classList.toggle("is-hidden", !isUploading);
  recmessage.classList.toggle("is-hidden", isRecording() || isAllRecorded());
  stopmessage.classList.toggle("is-hidden", !isRecording() || isAllRecorded());
  recstart.classList.toggle("is-hidden", isRecording() || isAllRecorded());
  recstop.classList.toggle("is-hidden", !isRecording() || isAllRecorded());
  // recordprogress.innerHTML = `Clip: ` + `${wantedWords.length - remainingWords.length + 1} / ${wantedWords.length}`.bold();
  currentword.classList.toggle("is-hidden", isAllRecorded());
  currentword.innerText = remainingWords[0];
}
// Call on page load.
updateUI();

// start recording on click
recstart.addEventListener('click', () => {
  console.log("Rec Start Clicked");
  startRecording();
});
recstop.addEventListener('click', () => {
  console.log("Rec Stop Clicked");
  if(isRecording()) {
    // sleep(2000);
    stopRecording(remainingWords[0]);
    remainingWords = remainingWords.slice(1);
  }
  updateUI();
});
function initmic() {
  debugLog("Querying for mic ...");
  if (navigator.mediaDevices.getUserMedia) {
    debugLog("Trying mediaDevices.getUserMedia");
    navigator.mediaDevices
             .getUserMedia(constraints)
             .then(onMicSuccess)
             .catch(onMicError);
  } else if (navigator.getUserMedia) {
    debugLog("Trying getUserMedia");
    navigator.getUserMedia(constraints, onMicSuccess, onMicError);
  } else if (navigator.webkitGetUserMedia) {
    debugLog("Trying webkitGetUserMedia");
    navigator.webkitGetUserMedia(constraints, onMicSuccess, onMicError);
  } else if (navigator.mozGetUserMedia) {
    debugLog("Trying mozGetUserMedia");
    navigator.mozGetUserMedia(constraints, onMicSuccess, onMicError);
  } else {
    // Browser does not support getUserMedia
    onMicError("No Support")
  }
}

var onMicError = function(err) {
  debugLog('Mic error occured: ' + err.name);
  if (err.name === 'NotAllowedError') {
    errormsg.innerHTML = "Swansea Voices".bold() + " needs to access your microphone in order to record your voice. Please refresh this page and try again."
    errornotification.classList.toggle("is-hidden", false);
  } else {
    errormsg.innerHTML = "An error occurred. You'll probably need to refresh this page and try again."
    alert(`An error occurred. You'll probably need to refresh this page and try again.`)
  }
}
var onMicSuccess = function(stream) {
  debugLog("Got Mic")

  sourceNode = audioContext.createMediaStreamSource(stream);
  analyzerNode = audioContext.createAnalyser();
  outputNode = audioContext.createMediaStreamDestination();

  debugLog("Created audio processing nodes");

  // Make sure we're doing mono everywhere.
  sourceNode.channelCount = 1;
  outputNode.channelCount = 1;
  analyzerNode.channelCount = 1;
  debugLog("Configured mono audio");

  // Connect the nodes together
  sourceNode.connect(analyzerNode);
  analyzerNode.connect(outputNode);


  debugLog("Connected audio processing nodes");

  debugLog("Creating Media Recorder");
  let options = { mimeType: audioFormat };
  recorder = new MediaRecorder(outputNode.stream);


  debugLog("Creating analyzer");
    analyzerNode.fftSize = 2048;
    analyzerNode.smoothingTimeConstant = 0.96;
    frequencyBins = new Uint8Array(analyzerNode.frequencyBinCount);
  debugLog("Created analyzer");

  debugLog("Creating jsNode");
  jsNode = audioContext.createScriptProcessor(256, 1, 1);
  debugLog("Connecting jsNode");
  jsNode.connect(audioContext.destination);
  debugLog("Created recorder & jsNode");
  microphone = stream;
  recordAudio();
}

function recordAudio() {
  chunks = [];
  //Remove old listeners
  recorder.removeEventListener('start', recorderStartListener);
  recorder.removeEventListener(
    'dataavailable',
    recorderDataAvailableListener
  );
  recorderStartListener = e => {
    debugLog(`Recorder is ${recorder.state}`);
    updateUI();
  };
  recorderDataAvailableListener = e => {
    chunks.push(e.data);
    debugLog("Audio data available");
  };
  recorder.addEventListener('start', recorderStartListener)
  // Set record to <audio> when recording will be finished
  recorder.addEventListener('dataavailable', recorderDataAvailableListener);
  // recorder.ondataavailable = function(e) {
  //   chunks.push(e.data);
  //   debugLog("Audio data available");
  // }
  // Finally, start it up.
  // We want to be able to record up to 10 minutes of audio in a single blob.
  // Without this argument to start(), Chrome will call dataavailable
  // very frequently.
  debugLog("Starting recorder");

  jsNode.onaudioprocess = analyze;
  recorder.start(600000);
}

function stopRecording(word) {
  jsNode.onaudioprocess = undefined;

  recorder.removeEventListener('stop', recorderStopListener);
  recorderStopListener = e => {
    debugLog(`Recorder is ${recorder.state}`);
    updateUI();
    createBlob(word);
  };
  recorder.addEventListener('stop', recorderStopListener);
  recorder.stop();
}

function createBlob(word) {
  debugLog("Assembling " + chunks.length + " chunks")
  blob = new Blob(chunks, {'type': recorder.mimeType});
  chunks = [];

  var audioURL = URL.createObjectURL(blob);
  debugLog("Created " + audioFormat + " blob url");
  addRecordedWord(word, audioURL)
}

function addRecordedWord(word, url) {
  console.log("Appending " + word);
  var mediaContainer = document.createElement('div');
  var mediaContentContainer = document.createElement('div');
  var audio = document.createElement('audio');
  var clipLabel = document.createElement('p');
  var buttonContainer = document.createElement('div');
  var deleteButton = document.createElement('button');

  mediaContainer.classList.add('media');
  mediaContainer.classList.add('pt-5');
  mediaContentContainer.classList.add('media-content');
  audio.setAttribute('controls', '');
  audio.src = url;
  clipLabel.textContent = word;
  buttonContainer.classList.add('media-right');
  deleteButton.className = 'delete';

  deleteButton.onclick = function(e) {
    evtTgt = e.target;
    evtTgt.parentNode.parentNode.parentNode.removeChild(evtTgt.parentNode.parentNode);
    remainingWords.push(word);
    updateUI();
  }
  mediaContentContainer.appendChild(audio);
  mediaContentContainer.appendChild(clipLabel);
  mediaContainer.appendChild(mediaContentContainer);
  buttonContainer.appendChild(deleteButton);
  mediaContainer.appendChild(buttonContainer);

  document.getElementById('recordings').appendChild(mediaContainer)
  updateUI()
}

function analyze() {
  WIDTH = canvas.width
  HEIGHT = canvas.height;
  analyzerNode.getByteTimeDomainData(frequencyBins);

  var bufferLength = analyzerNode.frequencyBinCount;
  canvasCtx.fillStyle = 'rgb(200, 200, 200)';
  canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);

  canvasCtx.lineWidth = 2;
  canvasCtx.strokeStyle = 'rgb(0, 0, 0)';

  canvasCtx.beginPath();

  var sliceWidth = WIDTH * 1.0 / bufferLength;
  var x = 0;

  for(var i = 0; i < bufferLength; i++) {

    var v = frequencyBins[i] / 128.0;
    var y = v * HEIGHT/2;

    if(i === 0) {
      canvasCtx.moveTo(x, y);
    } else {
      canvasCtx.lineTo(x, y);
    }

    x += sliceWidth;
  }

  canvasCtx.lineTo(canvas.width, canvas.height/2);
  canvasCtx.stroke();
}

submit.onclick = function() {
  saveRecordings();
}

var allClips;
var clipIndex;

function saveRecordings() {
  //TODO tidy up mic
  allClips = document.querySelectorAll('.media');
  clipIndex = 0;
  uploadNextClip();
}

function uploadNextClip() {
  debugLog(`Uploading Clip ${clipIndex}`);
  isUploading = true;
  updateUI();
  var clip = allClips[clipIndex];
  clip.style.display = 'None';
  var audioBlobUrl = clip.querySelector('audio').src;
  var word = clip.querySelector('p').innerText;
  var image_id = document.querySelector("[name='image_id']");
  var xhr = new XMLHttpRequest();
  xhr.open('GET', audioBlobUrl, true);
  xhr.responseType = 'blob';
  xhr.onload = function(e) {
    if (this.status == 200) {
      var blob = this.response;
      var ajaxRequest = new XMLHttpRequest();
      var uploadUrl = '/upload?image_id=' + image_id.value
      ajaxRequest.open('POST', uploadUrl, true);
      ajaxRequest.setRequestHeader('Content-Type', 'application/json');
      ajaxRequest.onreadystatechange = function() {
        if (ajaxRequest.readyState == 4) {
          if (ajaxRequest.status === 200) {
            clipIndex += 1;
            uploadprogress.value = clipIndex * 100 / wantedWords.length;
            if (clipIndex < allClips.length) {
              uploadNextClip();
            } else {
              allDone();
            }
          } else {
            alert('Uploading failed with error code ' + ajaxRequest.status);
            isUploading = false;
            updateUI();
          }
        }
      };
      ajaxRequest.send(blob);
    }
  };
  xhr.send();
}

function allDone() {
  isUploading = false;
  document.cookie = 'all_done=true; path=/';
  location.reload(true);
}
// https://bulma.io/documentation/elements/notification/#javascript-example
document.addEventListener('DOMContentLoaded', () => {
  (document.querySelectorAll('.notification .delete') || []).forEach(($delete) => {
    $notification = $delete.parentNode;

    $delete.addEventListener('click', () => {
      $notification.classList.add('is-hidden');

    });
  });
});

},{"audio-recorder-polyfill":2}],2:[function(require,module,exports){
let waveEncoder = require('./wave-encoder/index.cjs')

let AudioContext = window.AudioContext || window.webkitAudioContext

function createWorker (fn) {
  let js = fn
    .toString()
    .replace(/^(\(\)\s*=>|function\s*\(\))\s*{/, '')
    .replace(/}$/, '')
  let blob = new Blob([js])
  return new Worker(URL.createObjectURL(blob))
}

function error (method) {
  let event = new Event('error')
  event.data = new Error('Wrong state for ' + method)
  return event
}

let context, processor

/**
 * Audio Recorder with MediaRecorder API.
 *
 * @example
 * navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
 *   let recorder = new MediaRecorder(stream)
 * })
 */
class MediaRecorder {
  /**
   * @param {MediaStream} stream The audio stream to record.
   */
  constructor (stream) {
    /**
     * The `MediaStream` passed into the constructor.
     * @type {MediaStream}
     */
    this.stream = stream

    /**
     * The current state of recording process.
     * @type {"inactive"|"recording"|"paused"}
     */
    this.state = 'inactive'

    this.em = document.createDocumentFragment()
    this.encoder = createWorker(MediaRecorder.encoder)

    let recorder = this
    this.encoder.addEventListener('message', e => {
      let event = new Event('dataavailable')
      event.data = new Blob([e.data], { type: recorder.mimeType })
      recorder.em.dispatchEvent(event)
      if (recorder.state === 'inactive') {
        recorder.em.dispatchEvent(new Event('stop'))
      }
    })
  }

  /**
   * Begins recording media.
   *
   * @param {number} [timeslice] The milliseconds to record into each `Blob`.
   *                             If this parameter isn’t included, single `Blob`
   *                             will be recorded.
   *
   * @return {undefined}
   *
   * @example
   * recordButton.addEventListener('click', () => {
   *   recorder.start()
   * })
   */
  start (timeslice) {
    if (this.state !== 'inactive') {
      return this.em.dispatchEvent(error('start'))
    }

    this.state = 'recording'

    if (!context) {
      context = new AudioContext()
    }
    this.clone = this.stream.clone()
    this.input = context.createMediaStreamSource(this.clone)

    if (!processor) {
      processor = context.createScriptProcessor(2048, 1, 1)
    }

    let recorder = this

    recorder.encoder.postMessage(['init', context.sampleRate])

    processor.onaudioprocess = function (e) {
      if (recorder.state === 'recording') {
        recorder.encoder.postMessage([
          'encode', e.inputBuffer.getChannelData(0)
        ])
      }
    }

    this.input.connect(processor)
    processor.connect(context.destination)

    this.em.dispatchEvent(new Event('start'))

    if (timeslice) {
      this.slicing = setInterval(() => {
        if (recorder.state === 'recording') recorder.requestData()
      }, timeslice)
    }

    return undefined
  }

  /**
   * Stop media capture and raise `dataavailable` event with recorded data.
   *
   * @return {undefined}
   *
   * @example
   * finishButton.addEventListener('click', () => {
   *   recorder.stop()
   * })
   */
  stop () {
    if (this.state === 'inactive') {
      return this.em.dispatchEvent(error('stop'))
    }

    this.requestData()
    this.state = 'inactive'
    this.clone.getTracks().forEach(track => {
      track.stop()
    })
    this.input.disconnect()
    return clearInterval(this.slicing)
  }

  /**
   * Pauses recording of media streams.
   *
   * @return {undefined}
   *
   * @example
   * pauseButton.addEventListener('click', () => {
   *   recorder.pause()
   * })
   */
  pause () {
    if (this.state !== 'recording') {
      return this.em.dispatchEvent(error('pause'))
    }

    this.state = 'paused'
    return this.em.dispatchEvent(new Event('pause'))
  }

  /**
   * Resumes media recording when it has been previously paused.
   *
   * @return {undefined}
   *
   * @example
   * resumeButton.addEventListener('click', () => {
   *   recorder.resume()
   * })
   */
  resume () {
    if (this.state !== 'paused') {
      return this.em.dispatchEvent(error('resume'))
    }

    this.state = 'recording'
    return this.em.dispatchEvent(new Event('resume'))
  }

  /**
   * Raise a `dataavailable` event containing the captured media.
   *
   * @return {undefined}
   *
   * @example
   * this.on('nextData', () => {
   *   recorder.requestData()
   * })
   */
  requestData () {
    if (this.state === 'inactive') {
      return this.em.dispatchEvent(error('requestData'))
    }

    return this.encoder.postMessage(['dump', context.sampleRate])
  }

  /**
   * Add listener for specified event type.
   *
   * @param {"start"|"stop"|"pause"|"resume"|"dataavailable"|"error"}
   * type Event type.
   * @param {function} listener The listener function.
   *
   * @return {undefined}
   *
   * @example
   * recorder.addEventListener('dataavailable', e => {
   *   audio.src = URL.createObjectURL(e.data)
   * })
   */
  addEventListener (...args) {
    this.em.addEventListener(...args)
  }

  /**
   * Remove event listener.
   *
   * @param {"start"|"stop"|"pause"|"resume"|"dataavailable"|"error"}
   * type Event type.
   * @param {function} listener The same function used in `addEventListener`.
   *
   * @return {undefined}
   */
  removeEventListener (...args) {
    this.em.removeEventListener(...args)
  }

  /**
   * Calls each of the listeners registered for a given event.
   *
   * @param {Event} event The event object.
   *
   * @return {boolean} Is event was no canceled by any listener.
   */
  dispatchEvent (...args) {
    this.em.dispatchEvent(...args)
  }
}

/**
 * The MIME type that is being used for recording.
 * @type {string}
 */
MediaRecorder.prototype.mimeType = 'audio/wav'

/**
 * Returns `true` if the MIME type specified is one the polyfill can record.
 *
 * This polyfill supports `audio/wav` and `audio/mpeg`.
 *
 * @param {string} mimeType The mimeType to check.
 *
 * @return {boolean} `true` on `audio/wav` and `audio/mpeg` MIME type.
 */
MediaRecorder.isTypeSupported = mimeType => {
  return MediaRecorder.prototype.mimeType === mimeType
}

/**
 * `true` if MediaRecorder can not be polyfilled in the current browser.
 * @type {boolean}
 *
 * @example
 * if (MediaRecorder.notSupported) {
 *   showWarning('Audio recording is not supported in this browser')
 * }
 */
MediaRecorder.notSupported = !navigator.mediaDevices || !AudioContext

/**
 * Converts RAW audio buffer to compressed audio files.
 * It will be loaded to Web Worker.
 * By default, WAVE encoder will be used.
 * @type {function}
 *
 * @example
 * MediaRecorder.prototype.mimeType = 'audio/ogg'
 * MediaRecorder.encoder = oggEncoder
 */
MediaRecorder.encoder = waveEncoder

module.exports = MediaRecorder

},{"./wave-encoder/index.cjs":3}],3:[function(require,module,exports){
// Copied from https://github.com/chris-rudmin/Recorderjs

module.exports = () => {
  let BYTES_PER_SAMPLE = 2

  let recorded = []

  function encode (buffer) {
    let length = buffer.length
    let data = new Uint8Array(length * BYTES_PER_SAMPLE)
    for (let i = 0; i < length; i++) {
      let index = i * BYTES_PER_SAMPLE
      let sample = buffer[i]
      if (sample > 1) {
        sample = 1
      } else if (sample < -1) {
        sample = -1
      }
      sample = sample * 32768
      data[index] = sample
      data[index + 1] = sample >> 8
    }
    recorded.push(data)
  }

  function dump (sampleRate) {
    let bufferLength = recorded.length ? recorded[0].length : 0
    let length = recorded.length * bufferLength
    let wav = new Uint8Array(44 + length)
    let view = new DataView(wav.buffer)

    // RIFF identifier 'RIFF'
    view.setUint32(0, 1380533830, false)
    // file length minus RIFF identifier length and file description length
    view.setUint32(4, 36 + length, true)
    // RIFF type 'WAVE'
    view.setUint32(8, 1463899717, false)
    // format chunk identifier 'fmt '
    view.setUint32(12, 1718449184, false)
    // format chunk length
    view.setUint32(16, 16, true)
    // sample format (raw)
    view.setUint16(20, 1, true)
    // channel count
    view.setUint16(22, 1, true)
    // sample rate
    view.setUint32(24, sampleRate, true)
    // byte rate (sample rate * block align)
    view.setUint32(28, sampleRate * BYTES_PER_SAMPLE, true)
    // block align (channel count * bytes per sample)
    view.setUint16(32, BYTES_PER_SAMPLE, true)
    // bits per sample
    view.setUint16(34, 8 * BYTES_PER_SAMPLE, true)
    // data chunk identifier 'data'
    view.setUint32(36, 1684108385, false)
    // data chunk length
    view.setUint32(40, length, true)

    // eslint-disable-next-line unicorn/no-for-loop
    for (let i = 0; i < recorded.length; i++) {
      wav.set(recorded[i], i * bufferLength + 44)
    }

    recorded = []
    postMessage(wav.buffer, [wav.buffer])
  }

  onmessage = e => {
    if (e.data[0] === 'encode') {
      encode(e.data[1])
    } else if (e.data[0] === 'dump') {
      dump(e.data[1])
    }
  }
}

},{}]},{},[1]);
