import  { Component } from 'react';
import logo from './logo.svg';
import './App.css';
import {WebRTCAdaptor} from "./js/webrtc_adaptor.js"
import {getUrlParameter} from "./js/fetch.stream.js" 
import $ from "jquery";

class  App extends Component{
  constructor(){
    super();
  }

  componentDidMount(){

    function init () {
      var id = getUrlParameter("id");
      if(typeof id != "undefined") {
      $("#streamName").val(id);
      }
      else {
      id = getUrlParameter("name");
      if (typeof id != "undefined") {
        $("#streamName").val(id);
      } 
      else {
        $("#streamName").val("stream1");
      }
      }
      
      $("#maxBandwidthTextBox").val(maxVideoBitrateKbps);
      $("#max_bandwidth_apply").click(function() {
      var bitrate = parseInt($("#maxBandwidthTextBox").val());
      if (bitrate == NaN || bitrate < 100 || bitrate > 2500) {
        maxVideoBitrateKbps = 900;
      }
      else {
        maxVideoBitrateKbps = bitrate;
      }
      console.log("input bitrate: " + maxVideoBitrateKbps);
      $("#maxBandwidthTextBox").val(maxVideoBitrateKbps)
      if (webRTCAdaptor != null) {
        webRTCAdaptor.changeBandwidth(maxVideoBitrateKbps,  $("#streamName").val());
      }
      })
      }
    $(function() {
      init();
  
    });
  
    var maxVideoBitrateKbps = 900;
  
    //TODO: Migrate these methods to Jquery
    var start_publish_button = document.getElementById("start_publish_button");
    start_publish_button.addEventListener("click", startPublishing, false);
    var stop_publish_button = document.getElementById("stop_publish_button");
    stop_publish_button.addEventListener("click", stopPublishing, false);
    var options = document.getElementById("options");
    options.addEventListener("click", toggleOptions, false);
    var send = document.getElementById("send");
    send.addEventListener("click", sendData, false);
    
    document.getElementById("streamName").defaultValue = "Goofy"
    var streamNameBox = document.getElementById("streamName");
    streamNameBox.value = "stream1";
    
    /**
     * If publishing stops for any reason, it tries to republish again.
     */
    var autoRepublishEnabled = true;
    /**
     * Timer job that checks the WebRTC connection 
     */
    var autoRepublishIntervalJob = null;
    
    var streamId;
    
    var token = getUrlParameter("token");
    
    // It should be true
    var rtmpForward = getUrlParameter("rtmpForward");
  
    function startPublishing() {
      streamId = streamNameBox.value;
      webRTCAdaptor.publish(streamId, token);
    }
  
    function stopPublishing() {
      if (autoRepublishIntervalJob != null) {
        clearInterval(autoRepublishIntervalJob);
        autoRepublishIntervalJob = null;
      }
      webRTCAdaptor.stop(streamId);
    }
    
      function switchVideoMode(chbx) {
        if(chbx.value == "screen") {
          //webRTCAdaptor.switchDesktopWithMicAudio(streamId);
          webRTCAdaptor.switchDesktopCapture(streamId);
        }
        else if(chbx.value == "screen+camera"){
        webRTCAdaptor.switchDesktopCaptureWithCamera(streamId);
      }
      else {
          webRTCAdaptor.switchVideoCameraCapture(streamId, chbx.value);
        }
    }
      
    function switchAudioMode(chbx) {
      webRTCAdaptor.switchAudioInputSource(streamId, chbx.value);
    }
  
    function getCameraRadioButton(deviceName, deviceId) {
      return "<div class=\"form-check form-check-inline\">" + 	
                "<input class=\"form-check-input video-source\" name=\"videoSource\" type=\"radio\" value=\"" + deviceId + "\" id=\"" + deviceId + "\">" +
                "<label class=\"form-check-label font-weight-light\" for=\"" + deviceId + "\" style=\"font-weight:normal\">" +
                  deviceName +
                "</label>" +		
                 "</div>";
    }
  
    function getAudioRadioButton(deviceName, deviceId) {
      return "<div class=\"form-check form-check-inline\">" + 	
                "<input class=\"form-check-input audio-source\" name=\"audioSource\" type=\"radio\" value=\"" + deviceId + "\" id=\"" + deviceId + "\">" +
                "<label class=\"form-check-label font-weight-light\" for=\"" + deviceId + "\" style=\"font-weight:normal\">" +
                  deviceName +
                "</label>" +		
                 "</div>";
    }
  
    function toggleOptions() {
      $(".options").toggle();
    }
    
    function sendData() {
      try {
        var iceState = webRTCAdaptor.iceConnectionState(streamId);
              if (iceState != null && iceState != "failed" && iceState != "disconnected") {
              
          webRTCAdaptor.sendData($("#streamName").val(), $("#dataTextbox").val());
          $("#dataMessagesTextarea").append("Sent: " + $("#dataTextbox").val() + "\r\n");
          $("#dataTextbox").val("");
        }
        else {
          alert("WebRTC publishing is not active. Please click Start Publishing first")
        }
      }
      catch (exception) {
        console.error(exception);
        alert("Message cannot be sent. Make sure you've enabled data channel on server web panel");
      }
    }
      
    
    function checkAndRepublishIfRequired() {
       var iceState = webRTCAdaptor.iceConnectionState(streamId);
      console.log("Ice state checked = " + iceState);
  
        if (iceState == null || iceState == "failed" || iceState == "disconnected"){
          webRTCAdaptor.stop(streamId);
          webRTCAdaptor.closePeerConnection(streamId);
          webRTCAdaptor.closeWebSocket();
          initWebRTCAdaptor(true, autoRepublishEnabled);
        }	
    }
  
      function startAnimation() {
  
          $("#broadcastingInfo").fadeIn(800, function () {
            $("#broadcastingInfo").fadeOut(800, function () {
              var state = webRTCAdaptor.signallingState(streamId);
              if (state != null && state != "closed") {
                var iceState = webRTCAdaptor.iceConnectionState(streamId);
                if (iceState != null && iceState != "failed" && iceState != "disconnected") {
                    startAnimation();
                }
              }
            });
          });
        }
  
    var pc_config = {
        'iceServers' : [ {
          'urls' : 'stun:stun1.l.google.com:19302'
        } ]
      };
    /* 
    //sample turn configuration
    {
         iceServers: [
                      { urls: "",
                        username: "",
                        credential: "",
                      }
                     ]
      };
      */
  
    var sdpConstraints = {
      OfferToReceiveAudio : false,
      OfferToReceiveVideo : false
    };
    
    var mediaConstraints = {
      video : true,
      audio : true
    };
  
    // var appName = window.location.pathname.substring(0, window.location.pathname.lastIndexOf("/")+1);
    var appName = '/LiveApp/'
    var fpath = 'mediatest.1break.live'
    var fport = 5443
    var path =  fpath + ":" + fport + appName + "websocket?rtmpForward=" + rtmpForward;
    var websocketURL =  "wss://" + path;
    debugger
    if (window.location.protocol.startsWith("https")) {
      websocketURL = "wss://" + path;
    }
  
    var	webRTCAdaptor = null;
    
    function initWebRTCAdaptor(publishImmediately, autoRepublishEnabled) 
    {
      webRTCAdaptor = new WebRTCAdaptor({
          websocket_url : websocketURL,
          mediaConstraints : mediaConstraints,
          peerconnection_config : pc_config,
          sdp_constraints : sdpConstraints,
          localVideoId : "localVideo",
          debug:true,
          bandwidth:maxVideoBitrateKbps,
          callback : (info, obj) => {
            if (info == "initialized") {
              console.log("initialized");
              start_publish_button.disabled = false;
              stop_publish_button.disabled = true;
              if (publishImmediately) {
                webRTCAdaptor.publish(streamId, token)
              }
              
            } else if (info == "publish_started") {
              //stream is being published
              console.log("publish started");
              start_publish_button.disabled = true;
              stop_publish_button.disabled = false;
              startAnimation();
              if (autoRepublishEnabled && autoRepublishIntervalJob == null) 
              {
                autoRepublishIntervalJob = setInterval(() => {
                  checkAndRepublishIfRequired();
                }, 3000);
              }
              webRTCAdaptor.enableStats(obj.streamId);
            } else if (info == "publish_finished") {
              //stream is being finished
              console.log("publish finished");
              start_publish_button.disabled = false;
              stop_publish_button.disabled = true;
              $("#stats_panel").hide();
            }
            else if (info == "browser_screen_share_supported") {
              $(".video-source").prop("disabled", false);
              
              console.log("browser screen share supported");
              // browser_screen_share_doesnt_support.style.display = "none";
            }
            else if (info == "screen_share_stopped") {
              //choose the first video source. It may not be correct for all cases. 
              $(".video-source").first().prop("checked", true);	
              console.log("screen share stopped");
            }
            else if (info == "closed") {
              //console.log("Connection closed");
              if (typeof obj != "undefined") {
                console.log("Connecton closed: " + JSON.stringify(obj));
              }
            }
            else if (info == "pong") {
              //ping/pong message are sent to and received from server to make the connection alive all the time
              //It's especially useful when load balancer or firewalls close the websocket connection due to inactivity
            }
            else if (info == "refreshConnection") {
              checkAndRepublishIfRequired();
            }
            else if (info == "ice_connection_state_changed") {
              console.log("iceConnectionState Changed: ",JSON.stringify(obj));
            }
            else if (info == "updated_stats") {
              //obj is the PeerStats which has fields
               //averageOutgoingBitrate - kbits/sec
              //currentOutgoingBitrate - kbits/sec
              console.log("Average outgoing bitrate " + obj.averageOutgoingBitrate + " kbits/sec"
                  + " Current outgoing bitrate: " + obj.currentOutgoingBitrate + " kbits/sec"
                  + " video source width: " + obj.resWidth + " video source height: " + obj.resHeight
                  + "frame width: " + obj.frameWidth + " frame height: " + obj.frameHeight
                  + " video packetLost: "  + obj.videoPacketsLost + " audio packetsLost: " + obj.audioPacketsLost
                  + " video RTT: " + obj.videoRoundTripTime + " audio RTT: " + obj.audioRoundTripTime 
                  + " video jitter: " + obj.videoJitter + " audio jitter: " + obj.audioJitter);
  
                  
              $("#average_bit_rate").text(obj.averageOutgoingBitrate);
              if (obj.averageOutgoingBitrate > 0)  {
                $("#average_bit_rate_container").show();
              }
              else {
                $("#average_bit_rate_container").hide();
              }
  
              $("#latest_bit_rate").text(obj.currentOutgoingBitrate);
              if (obj.currentOutgoingBitrate > 0) {
                $("#latest_bit_rate_container").show();
              }
              else {
                $("#latest_bit_rate_container").hide();
              }
              var packetLost = parseInt(obj.videoPacketsLost) + parseInt(obj.audioPacketsLost);	
              
              $("#packet_lost_text").text(packetLost);
              if (packetLost > -1) {
                $("#packet_lost_container").show();
              }
              else {
                $("#packet_lost_container").hide();
              }
              var jitter = ((parseFloat(obj.videoJitter) + parseInt(obj.audioJitter)) / 2).toPrecision(3);
              $("#jitter_text").text(jitter);
              if (jitter > 0) {
                $("#jitter_container").show();
              }
              else {
                $("#jitter_container").hide();
              }
            
              var rtt = ((parseFloat(obj.videoRoundTripTime) + parseFloat(obj.audioRoundTripTime)) / 2).toPrecision(3);
              $("#round_trip_time").text(rtt);
              if (rtt > 0) {
                $("#round_trip_time_container").show();
              }
              else {
                $("#round_trip_time_container").hide();
              }
              
              $("#source_width").text(obj.resWidth);
              $("#source_height").text(obj.resHeight);
              if (obj.resWidth > 0 && obj.resHeight > 0) {
                $("#source_resolution_container").show();
              }
              else {
                $("#source_resolution_container").hide();
              }
  
              $("#ongoing_width").text(obj.frameWidth);
              $("#ongoing_height").text(obj.frameHeight);	
              if (obj.frameWidth > 0 && obj.frameHeight > 0) {
                $("#ongoing_resolution_container").show();
              }
              else {
                $("#ongoing_resolution_container").hide();
              }
              
              $("#on_going_fps").text(obj.currentFPS);
              if (obj.currentFPS > 0) {
                $("#on_going_fps_container").show();
              }
              else {
                $("#on_going_fps_container").hide();
              }
  
              $("#stats_panel").show();
    
            }
            else if (info == "data_received") {
              console.log("Data received: " + obj.event.data + " type: " + obj.event.type + " for stream: " + obj.streamId);
              $("#dataMessagesTextarea").append("Received: " + obj.event.data + "\r\n");
            }
            else if (info == "available_devices") {
              var videoHtmlContent = "";
              var audioHtmlContent = "";
              obj.forEach(function(device) {
                if (device.kind == "videoinput") {
                  videoHtmlContent += getCameraRadioButton(device.label, device.deviceId);
                }
                else if (device.kind == "audioinput"){
                  audioHtmlContent += getAudioRadioButton(device.label, device.deviceId);
                }
              }); 
              $(videoHtmlContent).insertAfter(".video-source-legend");
              $(".video-source").first().prop("checked", true);	
              
              $(audioHtmlContent).insertAfter(".audio-source-legend");
              $(".audio-source").first().prop("checked", true);	
  
              if (document.querySelector('input[name="videoSource"]')) {
                document.querySelectorAll('input[name="videoSource"]').forEach((elem) => {
                  elem.addEventListener("change", function(event) {
                  var item = event.target;
                  switchVideoMode(item)
                  });
                  });
              }
              if (document.querySelector('input[name="audioSource"]')) {
                document.querySelectorAll('input[name="audioSource"]').forEach((elem) => {
                  elem.addEventListener("change", function(event) {
                  var item = event.target;
                  switchAudioMode(item)
                  });
                  });
              }
            }
            else {
              console.log( info + " notification received");
            }
          },
          callbackError : function(error, message) {
            //some of the possible errors, NotFoundError, SecurityError,PermissionDeniedError
            debugger
            console.log("error callback: " +  JSON.stringify(error));
            var errorMessage = JSON.stringify(error);
            if (typeof message != "undefined") {
              errorMessage = message;
            }
            var errorMessage = JSON.stringify(error);
            if (error.indexOf("NotFoundError") != -1) {
              errorMessage = "Camera or Mic are not found or not allowed in your device";
            }
            else if (error.indexOf("NotReadableError") != -1 || error.indexOf("TrackStartError") != -1) {
              errorMessage = "Camera or Mic is being used by some other process that does not let read the devices";
            }
            else if(error.indexOf("OverconstrainedError") != -1 || error.indexOf("ConstraintNotSatisfiedError") != -1) {
              errorMessage = "There is no device found that fits your video and audio constraints. You may change video and audio constraints"
            }
            else if (error.indexOf("NotAllowedError") != -1 || error.indexOf("PermissionDeniedError") != -1) {
              errorMessage = "You are not allowed to access camera and mic.";
            }
            else if (error.indexOf("TypeError") != -1) {
              errorMessage = "Video/Audio is required";
            }
            else if (error.indexOf("ScreenSharePermissionDenied") != -1) {
              errorMessage = "You are not allowed to access screen share";
              $(".video-source").first().prop("checked", true);						
            }
            else if (error.indexOf("WebSocketNotConnected") != -1) {
              errorMessage = "WebSocket Connection is disconnected.";
            }
            alert(errorMessage);
          }
        });
    }
    
    //initialize the WebRTCAdaptor
    initWebRTCAdaptor(false, autoRepublishEnabled);
  }

  render(){
    return(
      <div class="jumbotron">
			<div class="col-sm-12 form-group">
				<video id="localVideo"  autoplay muted controls playsinline></video>
			</div>
			<div class="form-group col-sm-12 text-left">
				<input type="text" class="form-control"
						id="streamName" name="streamIdTextBox" placeholder="Type stream name"/>
			</div>
			<div class="col-sm-12 text-right">
				<button type="button" id="options" class="btn btn-outline-primary btn-sm" >Options</button>
			</div>
			<div class="form-group col-sm-12 text-left options">
				
				<label class=" mr-2" for="inlineFormCustomSelectPref">Max Video Bitrate(Kbps):</label>
				<div class="form-inline">
					<input type="text" class="form-control  mr-sm-2"
							id="maxBandwidthTextBox" name="maxBandwidthTextBox" />
				  
					<button type="button" class="btn btn-outline-primary btn-sm" id="max_bandwidth_apply" >Apply</button>
				</div>
				<div class="dropdown-divider"></div>
				<legend class="col-form-label video-source-legend">Video Source</legend>
	
				<div class="form-check form-check-inline">	
					<input class="form-check-input video-source" disabled name="videoSource" type="radio" value="screen" 
					id="screen_share_checkbox"/>
					<label class="form-check-label font-weight-light" for="screen_share_checkbox" >
							Screen
					</label>
				</div>
				
				<div class="form-check form-check-inline">
					<input class="form-check-input video-source" disabled name="videoSource" type="radio" value="screen+camera" 
						id="screen_share_with_camera_checkbox"/>
					<label class="form-check-label font-weight-light" for="screen_share_with_camera_checkbox" >
							Screen with Camera
					</label>
						{/* <a id="browser_screen_share_doesnt_support" href="https://caniuse.com/#search=getDisplayMedia">Your browser doesn't support screen share. You can see supported browsers in this link </a> */}
				</div>
				<div class="dropdown-divider"></div>
				<legend class="col-form-label audio-source-legend">Audio Source</legend>
				
			</div>	
			<div class="dropdown-divider"></div>
			<div class="form-group col-sm-12 text-left options">
				<label>Data Channel Messages</label>
				<textarea class="form-control" id="dataMessagesTextarea" rows="8"></textarea>
				<div class="form-row">
					<div class="form-group col-sm-10">
						<input type="text" class="form-control" id="dataTextbox" placeholder="Write your message to send players"/>
					</div>
					<div class="form-group col-sm-2">
					<button type="button" id="send" class="btn btn-outline-primary btn-block">Send</button>
					</div>
				</div>
			</div>
					

				<div class="form-group">	
					<button class="btn btn-primary" disabled
					id="start_publish_button">Start Publishing</button>
					<button class="btn btn-primary" disabled
					id="stop_publish_button">Stop Publishing</button>
				</div>			

				<span class="badge badge-success" id="broadcastingInfo" >Publishing</span>
				<div class="dropdown-divider"></div>			
				<div class="col-sm-10 offset-sm-1" id="stats_panel" >
					<div class="row text-muted text-left">
					  <div class="col-sm-6">
						<small>
						 <div id="average_bit_rate_container">Average Bitrate(Kbps): <span id="average_bit_rate"></span></div>
						 <div id="latest_bit_rate_container">Latest Bitrate(Kbps): <span id="latest_bit_rate"></span></div>
						 <div id="packet_lost_container">PacketsLost: <span id="packet_lost_text"></span></div>
						 <div id="jitter_text_container">Jitter(Secs): <span id="jitter_text"></span></div>
						</small>
					  </div>
					  <div class="col-sm-6">
						<small>
						<div id="round_trip_time_container">Round Trip Time(Secs): <span id="round_trip_time"></span></div>
						<div id="source_resolution_container">Source WidthxHeight: <span id="source_width"></span> x <span id="source_height"></span></div>
						<div id="ongoing_resolution_container">On-going WidthxHeight: <span id="ongoing_width"></span> x <span id="ongoing_height"></span></div>
						<div id="on_going_fps_container">On-going FPS: <span id="on_going_fps"></span></div>
						
						</small>
					  </div>
					</div>
				  </div>
				

		</div>
    )
  }
}
export default App;
