import './App.css';
import React, { Component } from 'react';
import 'dotenv'

const ComputerVisionClient = require('@azure/cognitiveservices-computervision').ComputerVisionClient;
const ApiKeyCredentials = require('@azure/ms-rest-js').ApiKeyCredentials;
/*
const visionEndpoint = process.env.REACT_APP_VISIONENDPOINT;
const visionKey = process.env.REACT_APP_VISIONKEY;
const computerVisionClient = new ComputerVisionClient(
  new ApiKeyCredentials({ inHeader: { 'Ocp-Apim-Subscription-Key': visionKey } }), visionEndpoint);
  */
var computerVisionClient;

var blob;
var peopleCount = 0;

class App extends Component {

  state = {
    imageURL: ''
  }

  videoEle = React.createRef();
  canvasEle = React.createRef();
  imageEle = React.createRef();

  componentDidMount = async () => {
    this.startCamera();
  }
  startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true
      });

      this.videoEle.current.srcObject = stream;

    } catch (err) {
      console.log(err);
    }
  }

  takeSelfie = async () => {

    if(document.forms.form1.key.value == '' || document.forms.form1.endpoint.value == ''){
      window.alert("EndpointとKeyを入力してください")
      return;
    }

    computerVisionClient = new ComputerVisionClient(
      new ApiKeyCredentials({ inHeader: { 'Ocp-Apim-Subscription-Key': document.forms.form1.key.value } }), document.forms.form1.endpoint.value);

    // Get the exact size of the video element.
    const width = this.videoEle.current.videoWidth;
    const height = this.videoEle.current.videoHeight;

    // get the context object of hidden canvas
    const ctx = this.canvasEle.current.getContext('2d');

    // Set the canvas to the same dimensions as the video.
    this.canvasEle.current.width = width;
    this.canvasEle.current.height = height;

    // Draw the current frame from the video on the canvas.
    ctx.drawImage(this.videoEle.current, 0, 0, width, height);

    // Get an image dataURL from the canvas.
    const imageDataURL = this.canvasEle.current.toDataURL('image/png');
    var bin = atob(imageDataURL.replace(/^.*,/, ''));
    var buffer = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) {
      buffer[i] = bin.charCodeAt(i);
    }
    blob = new Blob([buffer.buffer], {
      type: 'image/png'
    });
    this.setState({
      imageURL: imageDataURL
    })
    this.sendImageToComputerVisionAPI();
  }

  sendImageToComputerVisionAPI = async () => {

    // Analyze a URL image
    const objects = (await computerVisionClient.analyzeImageInStream(blob, { visualFeatures: ['Objects'] })).objects;
    console.log();

    peopleCount = 0;
    // Print objects bounding box and confidence
    if (objects.length) {
      console.log(`${objects.length} object${objects.length == 1 ? '' : 's'} found:`);
      for (const obj of objects) {
        console.log(`    ${obj.object} (${obj.confidence.toFixed(2)}) at ${formatRectObjects(obj.rectangle)}`);
        if (obj.object == 'person') peopleCount++;
      }
    } else {
      console.log('No objects found.');
    }
    document.getElementById('peoplecount').textContent = peopleCount + '人検出されました';
    document.getElementById('row').textContent = JSON.stringify(objects, null, '\t');
  }


  render() {
    return (
      <div className="selfie">
        <div className="cam">
          <video width="100%" height="100%" className="video-player" autoPlay={true} ref={this.videoEle}></video>
          <button className="btn capture-btn" onClick={this.takeSelfie}>
            <i class="fa fa-camera" aria-hidden="true"></i>
          </button>
        </div>
        <div className="result">
          <div>
            <form id="form1">
              <ul type="none">
                <li>endpoint:</li>
                <li><input id="endpoint" type="text" size="40"/></li>
                <li>key:</li>
                <li><input id="key" type="password" size="40"/></li>
              </ul>
            </form>
          </div>
          <div className="preview">
            <canvas ref={this.canvasEle} style={{ display: 'none' }}></canvas>
            <img className="preview-img" src={this.state.imageURL} ref={this.imageEle} />
          </div>
          <h4 id="peoplecount">画像を送信してください</h4>
          <div id="row"></div>
        </div>
      </div>

    )
  }


}

// Formats the bounding box
function formatRectObjects(rect) {
  return `top=${rect.y}`.padEnd(10) + `left=${rect.x}`.padEnd(10) + `bottom=${rect.y + rect.h}`.padEnd(12)
    + `right=${rect.x + rect.w}`.padEnd(10) + `(${rect.w}x${rect.h})`;
}

export default App;
