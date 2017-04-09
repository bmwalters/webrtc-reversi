let App = {
  get activePage() {
    return this._activePage
  },

  set activePage(newValue) {
    if (this._activePage) {
      this._activePage.classList.add("hidden")
    }

    newValue.classList.remove("hidden")
    this._activePage = newValue
  }
}

App.router = (new Router({
  "/home": function() {
    App.activePage = document.querySelector("#createOrJoinPage")
  },

  "/create-room": function() {
    App.activePage = document.querySelector("#showLocalOfferPage")
  },

  "/create-room/await-answer": function() {
    App.activePage = document.querySelector("#getRemoteAnswerPage")
  },

  "/join-room": function() {
    App.activePage = document.querySelector("#getRemoteOfferPage")
  },

  "/join-room/send-answer": function() {
    App.activePage = document.querySelector("#showLocalAnswerPage")
  },

  "/await-connection": function() {
    App.activePage = document.querySelector("#waitForConnectionPage")
  },

  "/game": function() {
    App.activePage = document.querySelector("#gamePage")
  }
})).init("/#/home")

// Since the same JS file contains code for both sides of the connection,
// activedc tracks which of the two possible datachannel variables we"re using.
let activedc

let cfg = { "iceServers": [{ "urls": ["stun:23.21.150.121"] }] }
let con = { "optional": [{ "DtlsSrtpKeyAgreement": true }] }

// THIS IS ALICE, THE CALLER/SENDER

let alice = {
  pc: new RTCPeerConnection(cfg, con),
  dc: null,

  setupDC() {
    try {
      alice.dc = alice.pc.createDataChannel("test", {reliable: true})
      activedc = alice.dc
      console.log("Created datachannel (pc1)")
      alice.dc.onopen = function() {
        console.log("data channel connect")
        App.router.setRoute("/game")
      }
      alice.dc.onmessage = function(e) {
        console.log("Got message (pc1)", e.data)

        if (e.data.charCodeAt(0) == 2) {
          // The first message we get from Firefox (but not Chrome)
          // is literal ASCII 2 and I do not understand why -- if we
          // leave it in, JSON.parse() will barf.
          return
        }
        console.log(e)

        let data = JSON.parse(e.data)

        writeToChatLog(data.message, "text-info")
      }
    } catch (e) {
      console.warn("No data channel (pc1)", e);
    }
  }
}

let sdpConstraints = {
  optional: [],
}

document.querySelector("#createRoomButton").addEventListener("click", function() {
  App.router.setRoute("/create-room")

  console.log("createLocalOffer")

  alice.setupDC()

  alice.pc.createOffer(function(desc) {
    alice.pc.setLocalDescription(desc, function() {}, function() {})
    console.log("created local offer", desc)
  }, function() {
    console.warn("Couldn't create offer")
  }, sdpConstraints)
})

document.querySelector("#remoteOfferReceivedButton").addEventListener("click", function() {
  let remoteOfferInput = document.querySelector("#remoteOfferInput")
  let offer = remoteOfferInput.value
  remoteOfferInput.value = ""

  let offerDesc = new RTCSessionDescription(JSON.parse(offer))

  console.log("Received remote offer", offerDesc)
  writeToChatLog("Received remote offer", "text-success")

  // handle the offer from alice.pc
  bob.pc.setRemoteDescription(offerDesc)
  bob.pc.createAnswer(function(answerDesc) {
    writeToChatLog("Created local answer", "text-success")
    console.log("Created local answer: ", answerDesc)
    bob.pc.setLocalDescription(answerDesc)
  },
  function() { console.warn("Could not create offer") },
  sdpConstraints)

  App.router.setRoute("/join-room/send-answer")
})

let writeToChatLog = function(message, message_type) {
  let p = document.createElement("p")
  p.classList.add(message_type)
  p.innerText = `[${(new Date()).toLocaleTimeString()}] ${message}`
  document.querySelector("#chatlog").appendChild(p)
  document.querySelector("#chatlog").scrollTop = document.querySelector("#chatlog").scrollHeight
}

document.querySelector("#answerReceivedButton").addEventListener("click", function() {
  let remoteAnswerInput = document.querySelector("#remoteAnswerInput")
  let answer = remoteAnswerInput.value
  remoteAnswerInput.value = ""

  let answerDesc = new RTCSessionDescription(JSON.parse(answer))

  // handle answer from bob.pc
  console.log("Received remote answer: ", answerDesc)
  writeToChatLog("Received remote answer", "text-success")
  alice.pc.setRemoteDescription(answerDesc)

  App.router.setRoute("/await-connection")
})

document.querySelector("#sendMessageButton").addEventListener("click", function() {
  if (document.querySelector("#messageTextBox").value) {
    writeToChatLog(document.querySelector("#messageTextBox").value, "text-success")

    activedc.send(JSON.stringify({ "message": document.querySelector("#messageTextBox").value }))

    document.querySelector("#messageTextBox").value = ""
  }

  return false
})

alice.pc.onicecandidate = function(e) {
  console.log("ICE candidate (alice.pc)", e)
  if (e.candidate == null) {
    document.querySelector("#localOfferText").innerText = JSON.stringify(alice.pc.localDescription)
  }
}

alice.pc.onaddstream = function(e) {
  console.log("Got remote stream", e.stream)
}

function handleOnconnection() {
  console.log("Datachannel connected")
  writeToChatLog("Datachannel connected", "text-success")
  App.router.setRoute("/game")
}

alice.pc.onconnection = handleOnconnection

alice.pc.onsignalingstatechange = (state) => console.info("signaling state change:", state)
alice.pc.oniceconnectionstatechange = (state) => console.info("ice connection state change:", state)
alice.pc.onicegatheringstatechange = (state) => console.info("ice gathering state change:", state)

// THIS IS BOB, THE ANSWERER/RECEIVER

let bob = {
  pc: new RTCPeerConnection(cfg, con),
  dc: null
}

bob.pc.ondatachannel = function(e) {
  let datachannel = e.channel || e; // Chrome sends event, FF sends raw channel
  console.log("Received datachannel (bob.pc)", arguments)
  bob.dc = datachannel
  activedc = bob.dc
  bob.dc.onopen = function() {
    console.log("data channel connect")
    App.router.setRoute("/game")
  }
  bob.dc.onmessage = function(e) {
    console.log("Got message (bob.pc)", e.data)

    let data = JSON.parse(e.data)
    writeToChatLog(data.message, "text-info")
  }
}

bob.pc.onicecandidate = function(e) {
  console.log("ICE candidate (bob.pc)", e)
  if (e.candidate == null) {
    document.querySelector("#localAnswerText").innerText = JSON.stringify(bob.pc.localDescription)
  }
}

bob.pc.onsignalingstatechange = (state) => console.info("signaling state change:", state)
bob.pc.oniceconnectionstatechange = (state) => console.info("ice connection state change:", state)
bob.pc.onicegatheringstatechange = (state) => console.info("ice gathering state change:", state)

bob.pc.onaddstream = (e) => console.log("Got remote stream", e.stream)

bob.pc.onconnection = handleOnconnection
