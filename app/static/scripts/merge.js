// fork getUserMedia for multiple browser versions, for the future
// when more browsers support MediaRecorder

navigator.getUserMedia = ( navigator.getUserMedia ||
                           navigator.webkitGetUserMedia ||
                           navigator.mozGetUserMedia ||
                           navigator.msGetUserMedia);

// set up basic variables for app

var record = document.querySelector('.record');
var stop = document.querySelector('.stop');
var upload = document.querySelector('.upload');
var soundClips = document.querySelector('.sound-clips');
var canvas = document.querySelector('.visualizer');
var mediaRecorder = null;
var mediaStreamSource = null;
var ignoreAutoPlay = false;

var script = document.createElement("script");
script.src = "https://webrtchacks.github.io/adapter/adapter-latest.js";
document.head.appendChild(script);
var AudioContext = window.AudioContext || window.webkitAudioContext;
if (!window.currentAudioContext) {
        window.currentAudioContext = new AudioContext();
    }
// disable stop button while not recording

stop.disabled = true;
upload.disabled = true;


this.context = window.currentAudioContext;
this.sampleRate = this.context.sampleRate;
this.bufferSize = 4096;
this.numberOfAudioChannels = 1;
this.volume = 1;
this.leftChannel = [];
this.rightChannel = [];
this.isRecording = false;
this.isPlaying = false;
this.recordingLength = 0;
this.isPaused = false;
this.isAudioProcessStarted = false;
this.microphoneStream = "";
this.initCallback = function() {};

// visualiser setup - create web audio api context and canvas

//var audioCtx = new (window.AudioContext || webkitAudioContext)();
//var canvasCtx = canvas.getContext("2d");

record.onclick = function(callback) {
  if (callback) {
    this.initCallback = callback;
  }
  this.isCaptureInProgress = true;
  if (this.microphoneStream) {
    _resetMicrophoneStream();
    _onMicrophoneCaptured();
    return this;
  }

  navigator.mediaDevices.getUserMedia({audio: true})
                  .then(function(microphone) {
                    this.microphoneStream = microphone;
                  }.bind(this))
                  .catch(console.log);
  _setMicrophoneStream()
                .then(this._onMicrophoneCaptured)
                .then(console.log("Mic stream"))
                .catch(console.log);
 // visualize(stream);

  // Display a countdown before recording starts.
  var progress = document.querySelector('.progress-display');
  progress.innerText = "3";
  document.querySelector('.info-display').innerText = "";
  setTimeout(function() {
    progress.innerText = "2";
    setTimeout(function() {
      progress.innerText = "1";
      setTimeout(function() {
        progress.innerText = "";
        startRecording();
      }, 1000);
    }, 1000);
  }, 1000);
  stop.disabled = false;
  record.disabled = true;
}
function _resetMicrophoneStream() {
  this.microphoneStream = this.microphoneStream.clone();
}
function _setMicrophoneStream() {
  return navigator.mediaDevices.getUserMedia({audio: true})
                  .then(function(microphone) {
                    this.microphoneStream = microphone;
                  }.bind(this))
                  .catch(console.log);
}
function _onMicrophoneCaptured() {
  console.log("Microphone captured")
            if (!this.isCaptureInProgress) {
                return;
            }

            this.recordingLength = 0;

            _setupProcessor();

            this.microphoneSource = this.context.createMediaStreamSource(this.microphoneStream);
            this.microphoneSource.connect(this.jsAudioNode);
            this.jsAudioNode.onaudioprocess = _onAudioProcess.bind(this);

            this.isRecording = true;
            this.isCaptureInProgress = false;
        }
function _setupProcessor() {
  var jsAudioNodeCreator = this.context.createJavaScriptNode ? "createJavaScriptNode" : "createScriptProcessor";
  this.jsAudioNode = this.context[jsAudioNodeCreator](this.bufferSize, this.numberOfAudioChannels, this.numberOfAudioChannels);
  this.jsAudioNode.connect(this.context.destination);
}
//main block for doing the audio recording

// if (navigator.getUserMedia) {
//   console.log('getUserMedia supported.');

//   var constraints = { audio: true };
//   var chunks = [];

//   var onSuccess = function(stream) {
//     mediaRecorder = new MediaRecorder(stream);
//     mediaStreamSource = audioCtx.createMediaStreamSource(stream);

//     stop.onclick = function() {
//       if (mediaRecorder.state == 'inactive') {
//         // The user has already pressed stop, so don't set up another word.
//         ignoreAutoPlay = true;
//       } else {
//         mediaRecorder.stop();
//       }
//       mediaStreamSource.disconnect();
//       console.log(mediaRecorder.state);
//       record.style.background = "";
//       record.style.color = "";
//       stop.disabled = true;
//       record.disabled = false;
//     }

//     upload.onclick = function() {
//       saveRecordings();
//     }

//     mediaRecorder.onstop = function(e) {
//       console.log("data available after MediaRecorder.stop() called.");

//       var clipName = document.querySelector('.info-display').innerText;
//       var clipContainer = document.createElement('article');
//       var clipLabel = document.createElement('p');
//       var audio = document.createElement('audio');
//       var deleteButton = document.createElement('button');

//       clipContainer.classList.add('clip');
//       clipLabel.classList.add('clip-label');
//       audio.setAttribute('controls', '');
//       deleteButton.textContent = 'Delete';
//       deleteButton.className = 'delete';
//       clipLabel.textContent = clipName;

//       clipContainer.appendChild(audio);
//       clipContainer.appendChild(clipLabel);
//       clipContainer.appendChild(deleteButton);
//       soundClips.appendChild(clipContainer);

//       audio.controls = true;
//       var blob = new Blob(chunks, { 'type' : 'audio/ogg; codecs=opus' });
//       chunks = [];
//       var audioURL = window.URL.createObjectURL(blob);
//       audio.src = audioURL;
//       console.log("recorder stopped");

//       deleteButton.onclick = function(e) {
//         evtTgt = e.target;
//         evtTgt.parentNode.parentNode.removeChild(evtTgt.parentNode);
//         updateProgress();
//       }
//     }

//     mediaRecorder.ondataavailable = function(e) {
//       chunks.push(e.data);
//     }
//   }

//   var onError = function(err) {
//     console.log('The following error occured: ' + err);
//   }

//   navigator.getUserMedia(constraints, onSuccess, onError);
// } else {
//   console.log('getUserMedia not supported on your browser!');
//   document.querySelector('.info-display').innerText =
//     'Your device does not support the HTML5 API needed to record audio (this is a known problem on iOS)';
// }

function visualize(stream) {
  var analyser = audioCtx.createAnalyser();
  analyser.fftSize = 2048;
  var bufferLength = analyser.frequencyBinCount;
  var dataArray = new Uint8Array(bufferLength);

  mediaStreamSource.connect(analyser);
  
  WIDTH = canvas.width
  HEIGHT = canvas.height;

  draw()

  function draw() {

    requestAnimationFrame(draw);

    analyser.getByteTimeDomainData(dataArray);

    canvasCtx.fillStyle = 'rgb(200, 200, 200)';
    canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);

    canvasCtx.lineWidth = 2;
    canvasCtx.strokeStyle = 'rgb(0, 0, 0)';

    canvasCtx.beginPath();

    var sliceWidth = WIDTH * 1.0 / bufferLength;
    var x = 0;

    for(var i = 0; i < bufferLength; i++) {

      var v = dataArray[i] / 128.0;
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
}

var wantedWords = [
  'Hey Swansea',
  'Abertawe',
  'Question',
  'Answer',
  'OK',
];

var fillerWords = [
  'Yes',
  'No',
];

function getRecordedWords() {
  var wordElements = document.querySelectorAll('.clip-label');
  var wordCounts = {};
  wordElements.forEach(function(wordElement) {
    var word = wordElement.innerText;
    if (!wordCounts.hasOwnProperty(word)) {
      wordCounts[word] = 0;
    }
    wordCounts[word] += 1;
  });
  return wordCounts;
}

function getAllWantedWords() {
  var wordCounts = {};
  wantedWords.forEach(function(word) {
    wordCounts[word] = 5;
  });
  fillerWords.forEach(function(word) {
    wordCounts[word] = 1;
  });
  return wordCounts;
}

function getRemainingWords() {
  var recordedCounts = getRecordedWords();
  var wantedCounts = getAllWantedWords();
  var remainingCounts = {};
  for (var word in wantedCounts) {
    wantedCount = wantedCounts[word];
    var recordedCount;
    if (recordedCounts.hasOwnProperty(word)) {
      recordedCount = recordedCounts[word];
    } else {
      recordedCount = 0;
    }
    var remainingCount = wantedCount - recordedCount;
    if (remainingCount > 0) {
      remainingCounts[word] = remainingCount;
    }
  }
  return remainingCounts;
}

function unrollWordCounts(wordCounts) {
  var result = [];
  for (var word in wordCounts) {
    count = wordCounts[word];
    for (var i = 0; i < count; ++i) {
      result.push(word);
    }
  }
  return result;
}

function shuffleArray(array) {
  for (var i = array.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }
}

function getNextWord() {
  var remainingWords = unrollWordCounts(getRemainingWords());
  if (remainingWords.length == 0) {
    return null;
  }
  shuffleArray(remainingWords);
  return remainingWords[0];
}

function getProgressDescription() {
  var allWords = unrollWordCounts(getAllWantedWords());
  var remainingWords = unrollWordCounts(getRemainingWords());
  return ((allWords.length + 1) - remainingWords.length) + "/" + allWords.length;
}

function updateProgress() {
  var progress = getProgressDescription();
  document.querySelector('.progress-display').innerText = progress;
}

function startRecording() {
  if (ignoreAutoPlay) {
    ignoreAutoPlay = false;
    return;
  }
  var prevWord = document.querySelector('.info-display').innerText;
  console.log(prevWord)
  var word = getNextWord();
  if(prevWord == word) {
    console.log("Collision ...")
    for (i = 0;i<10;i++) {
      word = getNextWord();
      if(prevWord != word) {
        console.log("... avoided")
        break;
      }
    }
  }
  if (word === null) {
    promptToSave();
    return;
  }
  updateProgress();
  document.querySelector('.info-display').innerText = word;
  mediaRecorder.start();
  console.log(mediaRecorder.state);
  console.log("recorder started");
  record.style.background = "red";
  if(word == wantedWords[0]) {
    setTimeout(endRecording, 2500);
  } else {
    setTimeout(endRecording, 1500);
  }
}

function endRecording() {
  if (mediaRecorder.state == 'inactive') {
    // The user has already pressed stop, so don't set up another word.
    return;
  }
  mediaRecorder.stop();
  console.log(mediaRecorder.state);
  console.log("recorders stopped");
  record.style.background = "";
  record.style.color = "";
  setTimeout(startRecording, 1000);
}

function promptToSave() {
  if (confirm('Are you ready to upload your words?\nIf not, press cancel now,' + 
              ' and then press Upload once you are ready.')) {
    saveRecordings();
  }
  upload.disabled = false;
}

var allClips;
var clipIndex;

function saveRecordings() {
  mediaStreamSource.disconnect();
  allClips = document.querySelectorAll('.clip');
  clipIndex = 0;
  uploadNextClip();
}

function uploadNextClip() {
  document.querySelector('.progress-display').innerText = 'Uploading clip ' + 
    clipIndex + '/' + unrollWordCounts(getAllWantedWords()).length;
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
      var uploadUrl = '/upload?word=' + word + '&_csrf_token=' + csrf_token;
      ajaxRequest.open('POST', uploadUrl, true);
      ajaxRequest.setRequestHeader('Content-Type', 'application/json');    
      ajaxRequest.onreadystatechange = function() {
        if (ajaxRequest.readyState == 4) {
          if (ajaxRequest.status === 200) {
            clipIndex += 1;
            if (clipIndex < allClips.length) {
              uploadNextClip();
            } else {
              allDone();
            }
          } else {
            alert('Uploading failed with error code ' + ajaxRequest.status);
          }
        }
      };
      ajaxRequest.send(blob);
    }
  };
  xhr.send();
}

function allDone() {
  document.cookie = 'all_done=true; path=/';
  location.reload(true);
}
