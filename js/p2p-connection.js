class Emitter {
	constructor() {
		let delegate = document.createDocumentFragment()

		this.addEventListener = (...args) => delegate.addEventListener(...args)
		this.dispatchEvent = (...args) => delegate.dispatchEvent(...args)
		this.removeEventListener = (...args) => delegate.removeEventListener(...args)
	}
}

let peerConnectionConfig = {
	"iceServers": [
		{
			"urls": [
				"stun:stun1.l.google.com:19302",
				"stun:stun4.l.google.com:19302"
			]
		}
	]
}

// eslint-disable-next-line no-redeclare, no-unused-vars
class P2PHostConnection extends Emitter {
	constructor() {
		super()

		this.pc = new RTCPeerConnection(peerConnectionConfig)

		this.pc.onicecandidate = (e) => {
			if (e.candidate == null) {
				this.dispatchEvent(new CustomEvent("iceGatheringFinished", { detail: this.pc.localDescription }))
			}
		}

		this.pc.onconnection = () => {
			this.dispatchEvent(new CustomEvent("peerConnection"))
		}
	}

	createOffer() {
		this.dc = this.pc.createDataChannel("test", { reliable: true })

		this.dc.onopen = () => {
			this.dispatchEvent(new CustomEvent("dcOpen"))
		}

		this.dc.onmessage = (e) => {
			if (e.data.charCodeAt(0) == 2) {
				// The first message we get from Firefox (but not Chrome)
				// is literal ASCII 2 and I do not understand why -- if we
				// leave it in, JSON.parse() will barf.
				return
			}

			this.dispatchEvent(new CustomEvent("dcMessage", { detail: JSON.parse(e.data) }))
		}

		return this.pc.createOffer().then(this.pc.setLocalDescription.bind(this.pc))
	}

	setAnswer(answer) {
		this.pc.setRemoteDescription(new RTCSessionDescription(answer))
	}

	sendMessage(message) {
		this.dc.send(JSON.stringify({ "message": message }))
	}
}

// eslint-disable-next-line no-redeclare, no-unused-vars
class P2PJoinerConnection extends Emitter {
	constructor() {
		super()

		this.pc = new RTCPeerConnection(peerConnectionConfig)

		this.pc.onicecandidate = (e) => {
			if (e.candidate == null) {
				this.dispatchEvent(new CustomEvent("iceGatheringFinished", { detail: this.pc.localDescription }))
			}
		}

		this.pc.onconnection = () => {
			this.dispatchEvent(new CustomEvent("peerConnection"))
		}

		this.pc.ondatachannel = (e) => {
			let datachannel = e.channel || e // Chrome sends event, FF sends raw channel

			this.dc = datachannel

			this.dc.onopen = () => {
				this.dispatchEvent(new CustomEvent("dcOpen"))
			}

			this.dc.onmessage = (messageEvent) => {
				this.dispatchEvent(new CustomEvent("dcMessage", { detail: JSON.parse(messageEvent.data) }))
			}
		}
	}

	setOffer(offerDesc) {
		this.pc.setRemoteDescription(offerDesc)
	}

	createAnswer() {
		return this.pc.createAnswer().then(this.pc.setLocalDescription.bind(this.pc))
	}

	sendMessage(message) {
		this.dc.send(JSON.stringify({ "message": message }))
	}
}
