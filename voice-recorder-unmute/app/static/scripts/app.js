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

// Word variables
const wantedWords = [
  'Testing 1, 2, 3.',
  'Yes',
  'No',
  'Hey Swansea',
  'Abertawe',
  'Question',
  'Answer',
  'OK',
];

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
  recordprogress.innerHTML = `Clip: ` + `${wantedWords.length - remainingWords.length + 1} / ${wantedWords.length}`.bold();
  currentword.classList.toggle("is-hidden", isAllRecorded());
  currentword.innerText = remainingWords[0];
}
// Call on page load.
updateUI();

recstart.addEventListener('click', () => {
  console.log("Rec Start Clicked");
  startRecording();
});
recstop.addEventListener('click', () => {
  console.log("Rec Stop Clicked");
  if(isRecording()) {
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
  // We want to be able to record up to 60s of audio in a single blob.
  // Without this argument to start(), Chrome will call dataavailable
  // very frequently.
  debugLog("Starting recorder");

  jsNode.onaudioprocess = analyze;
  recorder.start(4000);
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
  var xhr = new XMLHttpRequest();
  xhr.open('GET', audioBlobUrl, true);
  xhr.responseType = 'blob';
  xhr.onload = function(e) {
    if (this.status == 200) {
      var blob = this.response;
      var ajaxRequest = new XMLHttpRequest();
      var uploadUrl = '/upload?word=' + word 
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
