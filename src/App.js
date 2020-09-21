import React from 'react';
import './App.css';

import { v4 as uuidv4 } from 'uuid';

const { connect, LocalVideoTrack, createLocalVideoTrack } = require('twilio-video');
var AccessToken = require('twilio').jwt.AccessToken;
var VideoGrant = AccessToken.VideoGrant;

// const auth_token = 'd2d0f6c12d835198cc2bcfe86c762a26'

const ROOM = 'test-room';
var TOKEN = '';

class App extends React.Component {
  constructor() {
    super();
    this.state = {
      uid: uuidv4()
    }
  }

  componentDidMount() {
  }

  async connect() {
    TOKEN = this.getTokenUnsafe(this.state.uid)
    console.info('token', TOKEN)
    document.title = this.state.uid

    connect(TOKEN, { name: ROOM }).then(room => {
      console.log('Connected to Room "%s"', room.name);

      createLocalVideoTrack().then(track => {
        const localMediaContainer = document.getElementById('local-media');
        localMediaContainer.innerHTML = '';
        localMediaContainer.appendChild(track.attach())
      });

      room.participants.forEach(this.participantConnected.bind(this));
      room.on('participantConnected', this.participantConnected.bind(this));

      room.on('participantDisconnected', this.participantDisconnected.bind(this));
      room.once('disconnected', error => room.participants.forEach(this.participantDisconnected.bind(this)));
    });
  }

  async shareScreen() {
    const stream = await navigator.mediaDevices.getDisplayMedia();
    const screenTrack = new LocalVideoTrack(stream.getTracks()[0]);

    const room = await connect(TOKEN, {
      name: ROOM,
      tracks: [screenTrack]
    });
    screenTrack.once('stopped', this.connect.bind(this));
  }

  participantConnected(participant) {
    console.log('Participant "%s" connected', participant.identity);

    const div = document.createElement('div');
    div.style.border = '1px solid red'
    div.style.textAlign = 'center'
    div.id = participant.sid;
    div.innerHTML = '<div style="background-color: silver">' + participant.identity + '<div>';

    participant.on('trackSubscribed', track => this.trackSubscribed(div, track));
    participant.on('trackUnsubscribed', this.trackUnsubscribed);

    participant.tracks.forEach(publication => {
      if (publication.isSubscribed) {
        this.trackSubscribed(div, publication.track);
      }
    });

    document.body.appendChild(div);
  }

  participantDisconnected(participant) {
    console.log('Participant "%s" disconnected', participant.identity);
    document.getElementById(participant.sid).remove();
  }

  trackSubscribed(div, track) {
    div.appendChild(track.attach());
  }

  trackUnsubscribed(track) {
    track.detach().forEach(element => element.remove());
  }

  getTokenUnsafe(uid) {
    // API key used at backend
    // @see: https://www.twilio.com/console/video/project/testing-tools
    const ACCOUNT_SID = 'AC30cfab9b06bcf832475a26c5d087807b';
    const API_KEY_SID = 'SK28bc7c4b3554276e6c45f2944a2a86ea';
    const API_KEY_SECRET = 'jELKqvzNcHQMI1OsYfh3tyyna728131D';

    var accessToken = new AccessToken(
      ACCOUNT_SID,
      API_KEY_SID,
      API_KEY_SECRET
    );

    // Set the Identity of this token
    accessToken.identity = uid;

    // Grant access to Video
    var grant = new VideoGrant();
    grant.room = ROOM;
    accessToken.addGrant(grant);

    // Serialize the token as a JWT
    var jwt = accessToken.toJwt();
    return jwt;
  }

  render() {
    return (
      <div className="App">
        <button onClick={() => this.setState({uid: uuidv4()})}>New Uid</button>
        <input style={{width: "250px" }} value={this.state.uid} onChange={(e) => this.setState({uid: e.target.value})}></input>
        <button onClick={this.connect.bind(this)}>Connect</button>
        <button onClick={this.shareScreen.bind(this)}>Share Screen</button>
        <div id='local-media'></div>
      </div>
    );
  }
}

export default App;
